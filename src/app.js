const express = require('express');
const registerUser = require('./fabric/registerUser');
const connectToNetwork = require('./fabric/network');
const cors = require('cors');
const path = require('path');

const app = express();

// Enable CORS
app.use(cors());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

app.use(express.json());

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Register a new user
app.post('/api/users/register', async (req, res) => {
    try {
        const { userId, role } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const identity = await registerUser(userId, role || 'client');
        res.status(201).json({ 
            message: `User ${userId} registered successfully`,
            identity: identity
        });
    } catch (error) {
        console.error(`Failed to register user: ${error}`);
        res.status(500).json({ error: error.message });
    }
});

// Login a user (verify identity exists)
app.post('/api/users/login', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const connection = await connectToNetwork(userId);
        if (!connection) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Disconnect from the gateway
        await connection.gateway.disconnect();

        res.json({ 
            message: 'Login successful',
            userId: userId
        });
    } catch (error) {
        console.error(`Failed to login user: ${error}`);
        res.status(500).json({ error: error.message });
    }
});

// Get user info
app.get('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const connection = await connectToNetwork(userId);
        
        if (!connection) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get the wallet
        const identity = await connection.wallet.get(userId);
        
        // Disconnect from the gateway
        await connection.gateway.disconnect();

        res.json({
            userId: userId,
            mspId: identity.mspId,
            type: identity.type
        });
    } catch (error) {
        console.error(`Failed to get user info: ${error}`);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 