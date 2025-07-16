const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const walletPath = path.join(__dirname, '..', 'wallet');
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

// Helper function to connect to the network
async function connectToNetwork(userId) {
  try {
    // Create a new file system based wallet for managing identities.
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Load connection profile
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Check if user exists in wallet
    const identity = await wallet.get(userId);
    if (!identity) {
      throw new Error(`User ${userId} not found in wallet`);
    }

    // Create a new gateway for connecting to the peer node.
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: userId,
      discovery: { enabled: true, asLocalhost: true }
    });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    return { gateway, network };
  } catch (error) {
    throw error;
  }
}

// Store data
router.post('/', verifyToken, async (req, res) => {
  const { key, value } = req.body;

  if (!key || !value) {
    return res.status(400).json({ success: false, message: 'Key and value are required' });
  }

  let gateway;
  try {
    const connection = await connectToNetwork(req.user.userId);
    gateway = connection.gateway;
    const network = connection.network;

    // Get the contract from the network.
    const contract = network.getContract('secure-storage');

    // Submit the transaction
    await contract.submitTransaction('storeData', key, JSON.stringify(value));

    res.json({
      success: true,
      message: 'Data stored successfully'
    });
  } catch (error) {
    console.error('Failed to store data:', error);
    res.status(500).json({ success: false, message: 'Failed to store data' });
  } finally {
    if (gateway) {
      gateway.disconnect();
    }
  }
});

// Retrieve data
router.get('/:key', verifyToken, async (req, res) => {
  const { key } = req.params;
  let gateway;

  try {
    const connection = await connectToNetwork(req.user.userId);
    gateway = connection.gateway;
    const network = connection.network;

    // Get the contract from the network.
    const contract = network.getContract('secure-storage');

    // Evaluate the transaction
    const result = await contract.evaluateTransaction('getData', key);

    res.json({
      success: true,
      data: JSON.parse(result.toString())
    });
  } catch (error) {
    console.error('Failed to get data:', error);
    res.status(500).json({ success: false, message: 'Failed to get data' });
  } finally {
    if (gateway) {
      gateway.disconnect();
    }
  }
});

// List all keys for user
router.get('/', verifyToken, async (req, res) => {
  let gateway;

  try {
    const connection = await connectToNetwork(req.user.userId);
    gateway = connection.gateway;
    const network = connection.network;

    // Get the contract from the network.
    const contract = network.getContract('secure-storage');

    // Evaluate the transaction
    const result = await contract.evaluateTransaction('getAllKeys');

    res.json({
      success: true,
      keys: JSON.parse(result.toString())
    });
  } catch (error) {
    console.error('Failed to get keys:', error);
    res.status(500).json({ success: false, message: 'Failed to get keys' });
  } finally {
    if (gateway) {
      gateway.disconnect();
    }
  }
});

// Delete data
router.delete('/:key', verifyToken, async (req, res) => {
  const { key } = req.params;
  let gateway;

  try {
    const connection = await connectToNetwork(req.user.userId);
    gateway = connection.gateway;
    const network = connection.network;

    // Get the contract from the network.
    const contract = network.getContract('secure-storage');

    // Submit the transaction
    await contract.submitTransaction('deleteData', key);

    res.json({
      success: true,
      message: 'Data deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete data:', error);
    res.status(500).json({ success: false, message: 'Failed to delete data' });
  } finally {
    if (gateway) {
      gateway.disconnect();
    }
  }
});

module.exports = router; 