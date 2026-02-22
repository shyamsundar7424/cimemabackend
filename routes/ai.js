const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// OpenRouter config
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Models to try in order (free on OpenRouter)
const MODELS = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-r1:free',
    'mistralai/mistral-7b-instruct:free',
    'qwen/qwen-2.5-72b-instruct:free',
    'nvidia/nemotron-nano-9b-v2:free',
];

// Admin auth middleware
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Simple in-memory rate limiter: 5 requests per minute per IP
const rateLimitMap = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 1000;

const rateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowData = rateLimitMap.get(ip);

    if (!windowData || now - windowData.startTime > RATE_WINDOW_MS) {
        rateLimitMap.set(ip, { count: 1, startTime: now });
        return next();
    }

    if (windowData.count >= RATE_LIMIT) {
        return res.status(429).json({
            message: `Rate limit exceeded. Maximum ${RATE_LIMIT} AI requests per minute. Please wait.`
        });
    }

    windowData.count++;
    next();
};

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
        if (now - data.startTime > RATE_WINDOW_MS) rateLimitMap.delete(ip);
    }
}, 5 * 60 * 1000);

// Helper: call OpenRouter with retry across multiple models
async function generateWithOpenRouter(prompt, retries = 2, delayMs = 3000) {
    for (const model of MODELS) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(OPENROUTER_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:5000',
                        'X-Title': 'Movie Platform',
                    },
                    body: JSON.stringify({
                        model,
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: 1500,
                        temperature: 0.7,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    const status = response.status;
                    const errMsg = data?.error?.message || JSON.stringify(data);

                    if (status === 429) {
                        if (attempt < retries) {
                            console.log(`Rate limit on ${model}, retrying in ${delayMs}ms...`);
                            await new Promise(r => setTimeout(r, delayMs));
                            delayMs *= 2;
                            continue;
                        }
                        console.log(`Rate limit exhausted for ${model}, trying next model...`);
                        break;
                    }

                    if (status === 404 || status === 400) {
                        console.log(`Model ${model} not available (${status}), trying next...`);
                        break;
                    }

                    throw new Error(`OpenRouter error ${status}: ${errMsg}`);
                }

                const text = data?.choices?.[0]?.message?.content;
                if (!text) throw new Error('Empty response from OpenRouter');
                return text;

            } catch (err) {
                if (attempt === retries) {
                    console.error(`All retries failed for ${model}:`, err.message);
                    break;
                }
                console.log(`Error on ${model} (attempt ${attempt + 1}):`, err.message);
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
    }

    throw new Error('All AI models exhausted. Please try again in a moment.');
}

// POST /api/ai/generate-description
router.post('/generate-description', [auth, rateLimiter], async (req, res) => {
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
        return res.status(400).json({ message: 'Movie title is required' });
    }
    if (title.trim().length > 200) {
        return res.status(400).json({ message: 'Title is too long (max 200 characters)' });
    }

    const prompt = `You are a professional movie critic and database editor. Generate accurate, cinematic details for the movie titled "${title.trim()}".

Respond with ONLY a valid JSON object (no markdown, no code blocks, no extra text) in exactly this format:
{
  "description": "A full 500-800 word professional movie description covering plot, themes, cinematography, and why it's worth watching. Write in present tense, cinematic style.",
  "summary": "A concise 1-2 sentence preview description suitable for a movie card (max 120 characters).",
  "category": "One of: Action, Comedy, Drama, Horror, Sci-Fi, Documentary, Anime",
  "year": 2024,
  "director": "Director full name",
  "cast": "Top 3-5 main actors, comma separated",
  "rating": "IMDb-style rating like 8.2/10",
  "tags": "5-8 relevant keywords/tags, comma separated"
}

Important rules:
- Only use factual, publicly known information about the movie
- If the movie is fictional or unknown, create plausible but clearly fictional details
- Do not include sensitive, harmful, or inappropriate content
- The category must be exactly one of the options listed above
- The year must be a valid integer (not a string)`;

    try {
        const text = await generateWithOpenRouter(prompt);

        // Parse and validate the JSON response
        let parsed;
        try {
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error('AI JSON parse error. Raw response:', text.slice(0, 500));
            return res.status(500).json({ message: 'AI returned an unexpected format. Please try again.' });
        }

        // Validate and sanitize
        const validCategories = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Documentary', 'Anime'];
        const category = validCategories.includes(parsed.category) ? parsed.category : 'Drama';

        const response = {
            description: String(parsed.description || '').slice(0, 3000),
            summary: String(parsed.summary || '').slice(0, 200),
            category,
            year: parseInt(parsed.year) || new Date().getFullYear(),
            director: String(parsed.director || '').slice(0, 100),
            cast: String(parsed.cast || '').slice(0, 300),
            rating: String(parsed.rating || '').slice(0, 20),
            tags: String(parsed.tags || '').slice(0, 200),
        };

        res.json(response);

    } catch (err) {
        console.error('AI Route Error:', err.message);

        if (err.message?.includes('429') || err.message?.includes('rate limit')) {
            return res.status(429).json({ message: 'AI quota exceeded. Please wait a moment and try again.' });
        }
        if (err.message?.includes('All AI models exhausted')) {
            return res.status(503).json({ message: 'AI service is temporarily busy. Please try again in 30 seconds.' });
        }

        res.status(500).json({ message: 'AI generation failed. Please try again.' });
    }
});

module.exports = router;
