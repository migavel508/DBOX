import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function generateEncryptionKey() {
    return crypto.randomBytes(KEY_LENGTH);
}

function encryptFile(buffer, key) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const encryptedContent = Buffer.concat([
        cipher.update(buffer),
        cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag, and encrypted content
    return {
        encryptedData: Buffer.concat([iv, authTag, encryptedContent]),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
}

function decryptFile(encryptedData, key) {
    // Extract IV and auth tag from the beginning of the data
    const iv = encryptedData.slice(0, IV_LENGTH);
    const authTag = encryptedData.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encryptedContent = encryptedData.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
        decipher.update(encryptedContent),
        decipher.final()
    ]);
}

export {
    generateEncryptionKey,
    encryptFile,
    decryptFile
}; 