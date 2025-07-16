import { Wallets } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import { buildCAClient, registerAndEnrollUser } from './utils.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mspOrg1 = 'Org1MSP';
const walletPath = resolve(__dirname, '../../wallet');

async function registerUser(userId, role) {
    try {
        // Create a new CA client for interacting with the CA
        const caClient = buildCAClient();
        
        // Setup the wallet to hold the credentials
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Using wallet path: ${walletPath}`);

        // Register and enroll the user
        await registerAndEnrollUser(caClient, wallet, mspOrg1, userId, role);
        
        return {
            userId: userId,
            role: role,
            mspId: mspOrg1
        };
    } catch (error) {
        console.error(`Failed to register user ${userId}:`, error);
        throw new Error(`Failed to register user: ${error.message}`);
    }
}

export { registerUser }; 