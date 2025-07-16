import { Gateway, Wallets } from 'fabric-network';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FabricService {
    constructor() {
        this.channelName = 'mychannel';
        this.chaincodeName = 'filestore';
        this.mspOrg1 = 'Org1MSP';
        this.walletPath = path.join(__dirname, '../../wallet');
        this.connectionProfilePath = path.join(__dirname, '../../connection-org1.json');
    }

    async initialize() {
        try {
            // Initialize the wallet
            await fs.mkdir(this.walletPath, { recursive: true });

            // Load the connection profile
            const connectionProfile = JSON.parse(
                await fs.readFile(this.connectionProfilePath, 'utf8')
            );
            this.connectionProfile = connectionProfile;
        } catch (error) {
            throw new Error(`Failed to initialize Fabric service: ${error.message}`);
        }
    }

    async getContract(userId) {
        try {
            // Create a new gateway for connecting to the peer node
            const gateway = new Gateway();
            const wallet = await Wallets.newFileSystemWallet(this.walletPath);

            // Connect to gateway using application specified parameters
            await gateway.connect(this.connectionProfile, {
                wallet,
                identity: userId,
                discovery: { enabled: true, asLocalhost: true }
            });

            // Get the network channel our contract is deployed to
            const network = await gateway.getNetwork(this.channelName);

            // Get the contract from the network
            const contract = network.getContract(this.chaincodeName);

            return { contract, gateway };
        } catch (error) {
            throw new Error(`Failed to get contract: ${error.message}`);
        }
    }

    async storeFile(userId, fileMetadata) {
        try {
            const { contract, gateway } = await this.getContract(userId);
            try {
                // Add unique ID if not provided
                if (!fileMetadata.id) {
                    fileMetadata.id = uuidv4();
                }

                // Set timestamps
                const now = new Date().toISOString();
                fileMetadata.createdAt = now;
                fileMetadata.lastModified = now;

                await contract.submitTransaction(
                    'StoreFile',
                    JSON.stringify(fileMetadata)
                );

                return fileMetadata.id;
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            throw new Error(`Failed to store file metadata: ${error.message}`);
        }
    }

    async getFile(userId, fileId) {
        try {
            const { contract, gateway } = await this.getContract(userId);
            try {
                const result = await contract.evaluateTransaction('ReadFile', fileId);
                return JSON.parse(result.toString());
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            throw new Error(`Failed to get file metadata: ${error.message}`);
        }
    }

    async getAllFiles(userId) {
        try {
            const { contract, gateway } = await this.getContract(userId);
            try {
                const result = await contract.evaluateTransaction('GetAllFiles');
                return JSON.parse(result.toString());
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            throw new Error(`Failed to get all files: ${error.message}`);
        }
    }
}

export default new FabricService(); 