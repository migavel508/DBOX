const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function connectToNetwork(userId) {
    try {
        // Load the connection profile
        const ccpPath = path.resolve(__dirname, '../../config/connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new file system based wallet for managing identities
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check to see if we've already enrolled the user
        const identity = await wallet.get(userId);
        if (!identity) {
            console.log(`An identity for the user ${userId} does not exist in the wallet`);
            return null;
        }

        // Create a new gateway for connecting to our peer node
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: userId,
            discovery: { enabled: true, asLocalhost: true }
        });

        // Get the network (channel) our contract is deployed to
        const network = await gateway.getNetwork('mychannel');

        return {
            gateway,
            network,
            wallet
        };

    } catch (error) {
        console.error(`Failed to connect to the network: ${error}`);
        throw error;
    }
}

module.exports = connectToNetwork; 