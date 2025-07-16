# Secure Storage Application

This application demonstrates a secure file storage system using Hyperledger Fabric and IPFS. Files are encrypted before being stored on IPFS, with metadata and encryption keys securely stored on the Fabric blockchain.

## Prerequisites

- Linux/macOS environment
- Docker and Docker Compose
- Node.js v18+ and npm
- Go 1.20+
- IPFS Kubo v0.24.0+
- Hyperledger Fabric prerequisites (see [Fabric documentation](https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html))

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/hyperledger/fabric-samples.git
cd fabric-samples
```

### 2. Start IPFS Daemon

Install IPFS Kubo v0.24.0 and start the daemon:

```bash
# Start IPFS daemon in the background
ipfs daemon &
```

Verify IPFS is running:
```bash
curl localhost:5001/api/v0/version
```

### 3. Start Fabric Test Network

```bash
cd test-network

# Stop any previous networks and remove old containers
./network.sh down

# Start new network with channel 'mychannel'
./network.sh up createChannel
```

### 4. Deploy the Chaincode

```bash
# From the test-network directory
./scripts/deployCC.sh mychannel filestore ../secure-storage/chaincode/chaincode go 1.0 1
```

### 5. Setup Node.js Application

```bash
cd ../secure-storage

# Install dependencies
npm install

# Create wallet directory
mkdir -p wallet
```

### 6. Start the Application

```bash
# From the secure-storage directory
node src/app.js
```

The server will start on port 3000.

## API Usage

### 1. User Registration and Management

#### Register Admin (if not already enrolled)
```bash
# First, make sure you're in the secure-storage directory
cd secure-storage

# Create a new wallet directory if it doesn't exist
mkdir -p wallet

# Enroll admin
node src/fabric/enrollAdmin.js
```

Expected output:
```
Loaded the network configuration located at /home/pavi/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json
Wallet path: /home/pavi/fabric-samples/secure-storage/wallet
Successfully enrolled admin user and imported it into the wallet
```temiter and Enroll a New User
```bash
# Register a new user via API
curl -X POST -H "Content-Type: application/json" \
     -d '{"userId":"user1","role":"client"}' \
     http://localhost:3000/api/users/register
```

Expected output:
```json
{
    "message": "User user1 registered successfully",
    "identity": {
        "userId": "user1",
        "role": "client",
        "mspId": "Org1MSP"
    }
}
```

If the user already exists, you can directly enroll them:
```bash
node src/fabric/enrollUser.js
```

Expected output:
```
Loaded the network configuration located at /home/pavi/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json
Wallet path: /home/pavi/fabric-samples/secure-storage/wallet
Successfully enrolled user user1 and imported it into the wallet
```

### 2. Create a Test File

```bash
echo "This is a test file for secure storage" > test.txt
```

### 3. Upload a File

```bash
curl -X POST -H "user-id: user1" -F "file=@test.txt" http://localhost:3000/api/files/upload
```

Example response:
```json
{
  "message": "File uploaded successfully",
  "fileId": "QmWUCMhuuPKkwg2z1NqZ4qzwsFMFjauthF8g7mpi9CYsjX",
  "metadata": {
    "name": "test.txt",
    "type": "text/plain",
    "size": 39,
    "ipfsCid": "QmWUCMhuuPKkwg2z1NqZ4qzwsFMFjauthF8g7mpi9CYsjX",
    "encryptionKeyId": "fd479f9f49c24be14710446f01338b6d90ca3b049515389aed11a9795080c659"
  }
}
```

### 4. Download a File

Use the `fileId` from the upload response:

```bash
curl -H "user-id: user1" http://localhost:3000/api/files/QmWUCMhuuPKkwg2z1NqZ4qzwsFMFjauthF8g7mpi9CYsjX
```

This will return the decrypted file content.

### 5. Verify File Content

```bash
# Save the downloaded content to a new file
curl -H "user-id: user1" http://localhost:3000/api/files/QmWUCMhuuPKkwg2z1NqZ4qzwsFMFjauthF8g7mpi9CYsjX > downloaded.txt

# Compare with original
diff test.txt downloaded.txt
```

## Web Interface

The application includes a web interface for easy file management. After starting the application, you can access it through your browser:

1. Open your browser and navigate to:
```
http://localhost:3000
```

2. The interface provides:
   - User ID input (defaults to "user1")
   - Drag & drop file upload area
   - File listing with download buttons
   - Visual feedback for upload/download operations

### Using the Web Interface

1. **User Setup**
   - The interface defaults to "user1" - ensure this user is registered and enrolled
   - You can change the User ID if you want to use a different user

2. **Uploading Files**
   - Either drag & drop files onto the upload area
   - Or click the upload area to select files
   - Files are automatically encrypted and stored

3. **Downloading Files**
   - Click the "Download" button next to any file
   - Files are automatically decrypted when downloaded

4. **Troubleshooting**
   - Check the browser console (F12) for detailed error messages
   - Ensure the backend server is running
   - Verify the user ID exists and is enrolled

## Troubleshooting

### 1. Wallet Issues

If you encounter authentication errors, try recreating the wallet:

```bash
rm -rf wallet/
node src/fabric/enrollAdmin.js
node src/fabric/enrollUser.js
```

### 2. Chaincode Issues

If the chaincode fails to deploy or invoke, try redeploying with a new version:

```bash
cd test-network
./scripts/deployCC.sh mychannel filestore ../secure-storage/chaincode/chaincode go 1.1 2
```

### 3. IPFS Connection Issues

Verify IPFS is running and accessible:

```bash
curl localhost:5001/api/v0/version
```

## Architecture

- **Frontend**: REST API endpoints for file operations
- **Storage**: IPFS for encrypted file storage
- **Blockchain**: Hyperledger Fabric for metadata and access control
- **Security**: AES-256-GCM encryption for files
- **Authentication**: Fabric CA for identity management

## Security Features

- Files are encrypted using AES-256-GCM before IPFS storage
- Encryption keys are stored securely on the blockchain
- Access control through Fabric chaincode
- User authentication via Fabric CA
- TLS encryption for API endpoints

## License

Apache-2.0 