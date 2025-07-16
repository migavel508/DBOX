import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:3000/api';
const TEST_USER_ID = 'user1';
const TEST_FILE_CONTENT = 'Hello, this is a test file!';
const TEST_FILE_NAME = 'test.txt';

async function runTest() {
    try {
        console.log('Starting test...');

        // Create a test file
        const testFilePath = path.join(__dirname, '../test-files', TEST_FILE_NAME);
        await fs.mkdir(path.dirname(testFilePath), { recursive: true });
        await fs.writeFile(testFilePath, TEST_FILE_CONTENT);

        // Upload file
        console.log('Uploading file...');
        const formData = new FormData();
        formData.append('file', await fs.readFile(testFilePath), TEST_FILE_NAME);
        formData.append('userId', TEST_USER_ID);
        formData.append('description', 'Test file upload');

        const uploadResponse = await axios.post(`${API_URL}/files/upload`, formData, {
            headers: formData.getHeaders()
        });

        const fileId = uploadResponse.data.fileId;
        console.log('File uploaded successfully:', uploadResponse.data);

        // List files
        console.log('\nListing files...');
        const listResponse = await axios.get(`${API_URL}/files`, {
            params: { userId: TEST_USER_ID }
        });
        console.log('Files:', listResponse.data);

        // Download file
        console.log('\nDownloading file...');
        const downloadResponse = await axios.get(
            `${API_URL}/files/${fileId}`,
            {
                params: { userId: TEST_USER_ID },
                responseType: 'arraybuffer'
            }
        );

        // Verify downloaded content
        const downloadedContent = downloadResponse.data.toString();
        console.log('Downloaded content:', downloadedContent);
        
        if (downloadedContent === TEST_FILE_CONTENT) {
            console.log('✅ Test passed! Downloaded content matches original');
        } else {
            console.log('❌ Test failed! Content mismatch');
        }

        // Clean up
        await fs.unlink(testFilePath);
        console.log('\nTest completed successfully');
    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

runTest(); 