const mongoose = require('mongoose');
const User = require('../models/User');
const Movie = require('../models/Movie');
const fs = require('fs');

const MONGO_URI = 'mongodb+srv://amrita210300_db_user:7zjm3Gu9m2683MFR@cluster0.jt9mjf0.mongodb.net/?appName=Cluster0';

const seedData = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected');

        // Clear existing data
        console.log('Clearing old data...');
        await User.deleteMany({});
        await Movie.deleteMany({});

        // Create Admin
        console.log('Creating admin...');
        const adminUser = new User({
            username: 'admin',
            password: 'password123',
            role: 'admin'
        });
        try {
            await adminUser.save();
            console.log('Admin user created');
        } catch (saveErr) {
            console.error('Save failed Message:', saveErr.message);
            fs.writeFileSync('error.txt', 'MESSAGE: ' + saveErr.message + '\nSTACK: ' + saveErr.stack);
            throw saveErr;
        }

        // Create Sample Movies
        console.log('Creating movies...');
        const movies = [
            {
                title: 'Inception',
                category: 'Sci-Fi',
                image: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
                description: 'A thief who steals corporate secrets...',
                movieLink: 'https://example.com/inception.mp4'
            },
            {
                title: 'The Dark Knight',
                category: 'Action',
                image: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
                description: 'When the menace known as the Joker...',
                movieLink: 'https://example.com/darkknight.mp4'
            }
        ];

        await Movie.insertMany(movies);
        console.log('Sample movies added');

        console.log('DONE');
        process.exit();
    } catch (err) {
        console.error('SEED ERROR:', err);
        process.exit(1);
    }
};

seedData();
