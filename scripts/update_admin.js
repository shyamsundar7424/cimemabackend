const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const updateAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Find existing admin user (any role=admin)
        let user = await User.findOne({ role: 'admin' });

        if (user) {
            // Update username and mark password as modified so bcrypt re-hashes
            user.username = 'shyamas2103';
            user.password = '@SHYamas2103#';
            user.markModified('password');
            await user.save();
            console.log('✅ Admin credentials updated successfully!');
            console.log('   Username:', user.username);
            console.log('   Password: [hashed and saved]');
        } else {
            // No admin exists — create one
            const newAdmin = new User({
                username: 'shyamas2103',
                password: '@SHYamas2103#',
                role: 'admin'
            });
            await newAdmin.save();
            console.log('✅ New admin user created successfully!');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

updateAdmin();
