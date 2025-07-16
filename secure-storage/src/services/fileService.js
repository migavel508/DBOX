const crypto = require('crypto');
const { create } = require('ipfs-http-client');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Initialize IPFS client
const ipfs = create({ host: 'localhost', port: '5001', protocol: 'http' });

class FileService {
    constructor() {
        this.algorithm = 'aes-256-cbc';
        this.keyDirectory = path.join(__dirname, '../../keys');
        
        // Create keys directory if it doesn't exist
        if (!fs.existsSync(this.keyDirectory)) {
            fs.mkdirSync(this.keyDirectory, { recursive: true });
        }
    }

    // Generate a new encryption key
    generateEncryptionKey() {
        const keyId = uuidv4();
        const key = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);
        
        // Store the key and IV
        const keyData = {
            key: key.toString('hex'),
            iv: iv.toString('hex'),
            createdAt: new Date().toISOString()
        };
        
        fs.writeFileSync(
            path.join(this.keyDirectory, `${keyId}.json`),
            JSON.stringify(keyData),
            'utf8'
        );
        
        return keyId;
    }

    // Get encryption key by ID
    getEncryptionKey(keyId) {
        const keyPath = path.join(this.keyDirectory, `${keyId}.json`);
        if (!fs.existsSync(keyPath)) {
            throw new Error('Encryption key not found');
        }
        
        const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        return {
            key: Buffer.from(keyData.key, 'hex'),
            iv: Buffer.from(keyData.iv, 'hex')
        };
    }

    // Encrypt a file
    async encryptFile(fileBuffer) {
        const keyId = this.generateEncryptionKey();
        const { key, iv } = this.getEncryptionKey(keyId);
        
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);
        const encryptedBuffer = Buffer.concat([
            cipher.update(fileBuffer),
            cipher.final()
        ]);
        
        return { encryptedBuffer, keyId };
    }

    // Decrypt a file
    async decryptFile(encryptedBuffer, keyId) {
        const { key, iv } = this.getEncryptionKey(keyId);
        
        const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
        const decryptedBuffer = Buffer.concat([
            decipher.update(encryptedBuffer),
            decipher.final()
        ]);
        
        return decryptedBuffer;
    }

    // Upload file to IPFS
    async uploadToIPFS(fileBuffer) {
        try {
            const result = await ipfs.add(fileBuffer);
            return result.path; // This is the IPFS CID
        } catch (error) {
            throw new Error(`Failed to upload to IPFS: ${error.message}`);
        }
    }

    // Download file from IPFS
    async downloadFromIPFS(cid) {
        try {
            const chunks = [];
            for await (const chunk of ipfs.cat(cid)) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        } catch (error) {
            throw new Error(`Failed to download from IPFS: ${error.message}`);
        }
    }

    // Upload an encrypted file
    async uploadEncryptedFile(fileBuffer, fileName, mimeType) {
        // Encrypt the file
        const { encryptedBuffer, keyId } = await this.encryptFile(fileBuffer);
        
        // Upload to IPFS
        const ipfsCID = await this.uploadToIPFS(encryptedBuffer);
        
        // Prepare metadata
        const metadata = {
            id: uuidv4(),
            name: fileName,
            ipfsCID: ipfsCID,
            encryptionKeyID: keyId,
            size: fileBuffer.length,
            mimeType: mimeType,
            accessibleTo: []
        };
        
        return metadata;
    }

    // Download and decrypt a file
    async downloadEncryptedFile(ipfsCID, keyId) {
        // Download from IPFS
        const encryptedBuffer = await this.downloadFromIPFS(ipfsCID);
        
        // Decrypt the file
        const decryptedBuffer = await this.decryptFile(encryptedBuffer, keyId);
        
        return decryptedBuffer;
    }
}

module.exports = new FileService(); 