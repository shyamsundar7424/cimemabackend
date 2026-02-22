const bcrypt = require('bcryptjs');

async function test() {
    try {
        console.log('Generating salt...');
        const salt = await bcrypt.genSalt(10);
        console.log('Salt:', salt);
        console.log('Hashing password...');
        const hash = await bcrypt.hash('password123', salt);
        console.log('Hash:', hash);
        console.log('Comparing...');
        const match = await bcrypt.compare('password123', hash);
        console.log('Match:', match);
    } catch (err) {
        console.error('Bcrypt Error:', err);
    }
}

test();
