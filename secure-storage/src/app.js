import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { registerUser } from './fabric/registerUser.js';
import { connectToNetwork } from './fabric/network.js';
import { encryptFile, generateEncryptionKey, decryptFile } from './services/keyService.js';
import { uploadToIPFS, retrieveFromIPFS } from './services/ipfsService.js';
import fs from 'fs';
import path from 'path';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// CORS configuration
const corsOptions = {
    origin: ['http://localhost:8081', 'http://localhost:8082', 'http://localhost:8083', 'http://localhost:5173'], // Allow multiple frontend URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'user-id', 'admin-id'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Apply CORS middleware with options
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());

// Helper function to check if user exists in wallet
const checkUserInWallet = async (userId) => {
    const walletPath = path.join(process.cwd(), 'wallet', `${userId}.id`);
    return fs.existsSync(walletPath);
};

// Login endpoint
app.post('/api/users/login', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const userExists = await checkUserInWallet(userId);
        if (!userExists) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Try to connect to network to verify credentials
        const connection = await connectToNetwork(userId);
        if (!connection) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        await connection.gateway.disconnect();

        res.json({ 
            message: 'Login successful',
            userId: userId,
            isAdmin: userId === 'admin'
        });
    } catch (error) {
        console.error(`Login error: ${error}`);
        res.status(500).json({ error: error.message });
    }
});

// Register a new user (admin only)
app.post('/api/users/register', async (req, res) => {
    try {
        const { userId, role } = req.body;
        const adminId = req.headers['admin-id'];

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        if (!adminId || adminId !== 'admin') {
            return res.status(401).json({ error: 'Admin access required' });
        }

        const userExists = await checkUserInWallet(userId);
        if (userExists) {
            return res.status(400).json({ error: 'User already exists' });
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

// Get all users (admin only)
app.get('/api/users', async (req, res) => {
    try {
        const adminId = req.headers['admin-id'];
        if (!adminId || adminId !== 'admin') {
            return res.status(401).json({ error: 'Admin access required' });
        }

        const walletPath = path.join(process.cwd(), 'wallet');
        const files = fs.readdirSync(walletPath);
        const users = files
            .filter(file => file.endsWith('.id'))
            .map(file => ({
                userId: file.replace('.id', ''),
                isAdmin: file === 'admin.id'
            }));

        res.json(users);
    } catch (error) {
        console.error(`Failed to get users: ${error}`);
        res.status(500).json({ error: error.message });
    }
});

// Get all files for a user
app.get('/api/files', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({ error: 'User ID is required' });
        }

        const connection = await connectToNetwork(userId);
        if (!connection) {
            return res.status(401).json({ error: 'Failed to connect to network' });
        }

        const { contract, gateway } = connection;

        try {
            const result = await contract.evaluateTransaction('GetAllFiles');
            const files = JSON.parse(result.toString());
            await gateway.disconnect();
            res.json(files);
        } catch (error) {
            await gateway.disconnect();
            throw error;
        }
    } catch (error) {
        console.error('Failed to get files:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload file endpoint
app.post('/api/files/upload', upload.single('file'), async (req, res) => {
    try {
        console.log('Starting file upload process...');
        
        // Check if file exists
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log('File received:', {
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Get user ID from request
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({ error: 'User ID is required' });
        }
        console.log('Processing upload for user:', userId);

        try {
            // Generate encryption key
            const encryptionKey = generateEncryptionKey();
            console.log('Generated encryption key');
            
            // Encrypt file
            console.log('Encrypting file...');
            const { encryptedData, iv, authTag } = encryptFile(req.file.buffer, encryptionKey);
            console.log('File encrypted successfully');
            
            // Upload to IPFS
            console.log('Uploading to IPFS...', {
                encryptedSize: encryptedData.length,
                originalSize: req.file.size
            });
            const ipfsCid = await uploadToIPFS(encryptedData);
            console.log('File uploaded to IPFS:', ipfsCid);

            // Connect to Fabric network
            const connection = await connectToNetwork(userId);
            if (!connection) {
                throw new Error('Failed to connect to Fabric network');
            }
            console.log('Connected to Fabric network');

            const { contract, gateway } = connection;

            // Store metadata in Fabric
            const fileMetadata = {
                id: ipfsCid,
                name: req.file.originalname,
                description: 'Encrypted file stored in IPFS',
                ipfsCID: ipfsCid,
                encryptionKeyId: encryptionKey.toString('hex'),
                size: req.file.size,
                mimeType: req.file.mimetype,
                owner: userId,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };

            console.log('Storing metadata in Fabric...', fileMetadata);
            // Submit transaction to store file metadata
            await contract.submitTransaction(
                'StoreFile',
                JSON.stringify(fileMetadata)
            );
            console.log('Metadata stored in Fabric');

            // Disconnect from the gateway
            await gateway.disconnect();
            console.log('Disconnected from Fabric network');

            res.status(201).json({
                message: 'File uploaded successfully',
                fileId: ipfsCid,
                metadata: {
                    name: req.file.originalname,
                    type: req.file.mimetype,
                    size: req.file.size,
                    ipfsCid: ipfsCid,
                    encryptionKeyId: encryptionKey.toString('hex')
                }
            });
        } catch (error) {
            console.error('Error during file processing:', {
                error: error.message,
                stack: error.stack,
                cause: error.cause
            });
            throw error;
        }
    } catch (error) {
        console.error('File upload error:', {
            error: error.message,
            stack: error.stack,
            cause: error.cause
        });
        res.status(500).json({ 
            error: error.message,
            details: error.stack
        });
    }
});

// Get file endpoint
app.get('/api/files/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const userId = req.headers['user-id'];

        if (!userId) {
            return res.status(401).json({ error: 'User ID is required' });
        }

        // Connect to Fabric network
        const connection = await connectToNetwork(userId);
        if (!connection) {
            return res.status(401).json({ error: 'Failed to connect to network' });
        }

        const { contract, gateway } = connection;

        try {
            // Get file metadata from Fabric
            const fileMetadata = await contract.evaluateTransaction('ReadFile', fileId);
            const metadata = JSON.parse(fileMetadata.toString());

            // Get encrypted file from IPFS
            const encryptedData = await retrieveFromIPFS(metadata.ipfsCID);

            // Decrypt file
            const key = Buffer.from(metadata.encryptionKeyID, 'hex');
            const decryptedData = decryptFile(encryptedData, key);

            // Send file
            res.setHeader('Content-Type', metadata.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${metadata.name}"`);
            res.setHeader('Content-Length', decryptedData.length);
            res.send(decryptedData);

            // Disconnect from the gateway
            await gateway.disconnect();
        } catch (error) {
            // Ensure gateway disconnection even if there's an error
            await gateway.disconnect();
            throw error;
        }
    } catch (error) {
        console.error('File download error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 