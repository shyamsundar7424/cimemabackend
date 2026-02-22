const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Movie = require('../models/Movie');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Clear existing data
        await User.deleteMany({});
        await Movie.deleteMany({});

        // Create Admin
        const adminUser = new User({
            username: 'admin',
            password: 'password123',
            role: 'admin'
        });
        await adminUser.save();
        console.log('Admin user created');

        // Create Sample Movies
        const movies = [
            {
                title: 'Inception',
                category: 'Sci-Fi',
                image: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
                description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
                movieLink: 'https://example.com/inception.mp4'
            },
            {
                title: 'The Dark Knight',
                category: 'Action',
                image: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
                description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
                movieLink: 'https://example.com/darkknight.mp4'
            }
        ];

        await Movie.insertMany(movies);
        console.log('Sample movies added');

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedData();
