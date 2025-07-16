import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

const IPFS_API = 'http://127.0.0.1:5001/api/v0';

async function uploadToIPFS(encryptedData) {
    try {
        // Create a form data instance
        const formData = new FormData();
        
        // Create a readable stream from the buffer
        const stream = Readable.from(encryptedData);
        
        // Append the stream as a file
        formData.append('file', stream, {
            filename: 'encrypted-file',
            contentType: 'application/octet-stream'
        });

        // Upload to IPFS
        const response = await axios.post(`${IPFS_API}/add`, formData, {
            headers: formData.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        console.log('IPFS upload successful:', response.data);
        return response.data.Hash;
    } catch (error) {
        console.error('IPFS upload error:', error.response?.data || error.message);
        throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
}

async function retrieveFromIPFS(cid) {
    try {
        const response = await axios.post(`${IPFS_API}/cat?arg=${cid}`, null, {
            responseType: 'arraybuffer'
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('IPFS retrieval error:', error.response?.data || error.message);
        throw new Error(`Failed to retrieve from IPFS: ${error.message}`);
    }
}

async function testConnection() {
    try {
        const response = await axios.post(`${IPFS_API}/id`);
        console.log('Connected to IPFS node:', response.data.ID);
        return true;
    } catch (error) {
        console.error('IPFS connection test failed:', error.message);
        return false;
    }
}

// Test connection on service initialization
testConnection().then(connected => {
    if (!connected) {
        console.error('Warning: IPFS node is not accessible');
    }
});

export {
    uploadToIPFS,
    retrieveFromIPFS,
    testConnection
}; 