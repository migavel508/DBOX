const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

const walletPath = path.join(__dirname, '..', 'wallet');
const credentialsPath = path.join(__dirname, '..', 'credentials.json');
const ccpPath = path.join(__dirname, '..', 'connection-org1.json');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Login route
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    // Check if user exists in wallet
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get(userId);
    if (!identity) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Verify password
    const credentials = JSON.parse(fs.readFileSync(credentialsPath));
    const storedHash = credentials.users[userId] || credentials.admins[userId];
    if (!storedHash) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, storedHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId, role: credentials.admins[userId] ? 'admin' : 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      user: {
        userId,
        role: credentials.admins[userId] ? 'admin' : 'user'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Register route (admin only)
router.post('/register', verifyToken, async (req, res) => {
  try {
    const { userId, password } = req.body;

    // Check if requester is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can register new users' });
    }

    // Load the network configuration
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check if user already exists
    const userIdentity = await wallet.get(userId);
    if (userIdentity) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Get admin identity
    const adminIdentity = await wallet.get(req.user.userId);
    if (!adminIdentity) {
      return res.status(500).json({ success: false, message: 'Admin identity not found' });
    }

    // Create a new CA client for interacting with the CA
    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(caInfo.url, {
      trustedRoots: caTLSCACerts,
      verify: false
    }, caInfo.caName);

    // Register the user
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, req.user.userId);

    // Register and enroll the user
    const secret = await ca.register({
      affiliation: 'org1.department1',
      enrollmentID: userId,
      role: 'client'
    }, adminUser);

    const enrollment = await ca.enroll({
      enrollmentID: userId,
      enrollmentSecret: secret
    });

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    await wallet.put(userId, x509Identity);

    // Save user credentials
    const credentials = JSON.parse(fs.readFileSync(credentialsPath));
    const hash = await bcrypt.hash(password, 10);
    credentials.users[userId] = hash;
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));

    res.json({
      success: true,
      message: `Successfully registered user "${userId}"`
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get user info
router.get('/user', verifyToken, async (req, res) => {
  try {
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get(req.user.userId);
    if (!identity) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        userId: req.user.userId,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router; 