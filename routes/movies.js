const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
    }
});

// File Filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

// Middleware to verify Admin Token
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Get All Movies (Public)
router.get('/', async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = {};

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        if (category && category !== 'All') {
            query.category = category;
        }

        const movies = await Movie.find(query).sort({ createdAt: -1 });
        res.json(movies);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get Single Movie (Public)
router.get('/:id', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }
        res.json(movie);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Movie not found' });
        }
        res.status(500).send('Server Error');
    }
});

// Add Movie (Admin)
router.post('/', [auth, upload.single('image')], async (req, res) => {
    try {
        const { title, category, description, movieLink, trailerLink, downloadLink, fastDownloadLink, year, rating, director, cast } = req.body;

        if (!req.file && !req.body.image) {
            return res.status(400).json({ message: 'Please upload an image' });
        }

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image;

        const newMovie = new Movie({
            title, category, image: imageUrl, description,
            movieLink: movieLink || '',
            trailerLink: trailerLink || '',
            downloadLink: downloadLink || '',
            fastDownloadLink: fastDownloadLink || '',
            year: year || '', rating: rating || '', director: director || '', cast: cast || '',
        });

        const movie = await newMovie.save();
        res.json(movie);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: err.message || 'Server Error' });
    }
});

// Update Movie (Admin)
router.put('/:id', [auth, upload.single('image')], async (req, res) => {
    try {
        const { title, category, description, movieLink, trailerLink, downloadLink, fastDownloadLink, year, rating, director, cast } = req.body;
        let movie = await Movie.findById(req.params.id);
        if (!movie) return res.status(404).json({ message: 'Movie not found' });

        let imageUrl = movie.image;
        if (req.file) {
            if (movie.image.startsWith('/uploads/')) {
                const oldPath = path.join(__dirname, '..', movie.image);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            imageUrl = `/uploads/${req.file.filename}`;
        } else if (req.body.image) {
            imageUrl = req.body.image;
        }

        const movieFields = {
            title, category, image: imageUrl, description,
            movieLink: movieLink || movie.movieLink || '',
            trailerLink: trailerLink !== undefined ? trailerLink : (movie.trailerLink || ''),
            downloadLink: downloadLink !== undefined ? downloadLink : (movie.downloadLink || ''),
            fastDownloadLink: fastDownloadLink !== undefined ? fastDownloadLink : (movie.fastDownloadLink || ''),
            year: year || movie.year || '',
            rating: rating || movie.rating || '',
            director: director || movie.director || '',
            cast: cast || movie.cast || '',
        };
        movie = await Movie.findByIdAndUpdate(req.params.id, { $set: movieFields }, { new: true });
        res.json(movie);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: err.message || 'Server Error' });
    }
});

// Delete Movie (Admin)
router.delete('/:id', auth, async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) return res.status(404).json({ message: 'Movie not found' });

        // Delete associated image file if local
        if (movie.image.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, '..', movie.image);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await Movie.findByIdAndDelete(req.params.id);
        res.json({ message: 'Movie removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
