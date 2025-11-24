require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Room = require('../src/models/Room');
const { v4: uuidv4 } = require('uuid');

async function testDB() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Test User Creation
        const testEmail = `test-${Date.now()}@example.com`;
        const user = await User.create({
            id: uuidv4(),
            email: testEmail,
            passwordHash: 'hashedpassword',
            role: 'organizer'
        });
        console.log(`✅ User created: ${user.email}`);

        // Test Room Creation
        const room = await Room.create({
            id: uuidv4(),
            name: 'Test Room',
            ownerId: user.id,
            code: 'TESTCODE'
        });
        console.log(`✅ Room created: ${room.name}`);

        // Cleanup
        await Room.deleteOne({ _id: room._id });
        await User.deleteOne({ _id: user._id });
        console.log('✅ Cleanup successful');

        process.exit(0);
    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
}

testDB();
