import { Gateway, Wallets } from 'fabric-network';
import { buildCCPOrg1 } from './utils.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const channelName = 'mychannel';
const chaincodeName = 'filestore';
const walletPath = resolve(__dirname, '../../wallet');

async function connectToNetwork(userId) {
    try {
        // Build the connection profile
        const ccp = buildCCPOrg1();

        // Create a new file system based wallet for managing identities
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Using wallet path: ${walletPath}`);

        // Check if user is enrolled
        const identity = await wallet.get(userId);
        if (!identity) {
            throw new Error(`User ${userId} not found in wallet`);
        }

        // Create a new gateway for connecting to the peer node
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: userId,
            discovery: { enabled: true, asLocalhost: true }
        });

        // Get the network channel
        const network = await gateway.getNetwork(channelName);

        // Get the contract
        const contract = network.getContract(chaincodeName);

        return {
            gateway,
            network,
            contract
        };
    } catch (error) {
        console.error(`Failed to connect to network:`, error);
        return null;
    }
}

export { connectToNetwork }; 