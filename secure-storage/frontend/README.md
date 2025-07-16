
# SecureBlockchain Vault

A production-grade secure file sharing system using Hyperledger Fabric, IPFS, Docker, and Express.js with end-to-end encryption and blockchain-based access control.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │   API Server    │
│   (React)       │◄──►│   (Express.js)  │
└─────────────────┘    └─────────────────┘
                                │
                       ┌────────┼────────┐
                       │                 │
                       ▼                 ▼
           ┌─────────────────┐  ┌─────────────────┐
           │ Hyperledger     │  │ Private IPFS    │
           │ Fabric Network  │  │ Storage Node    │
           │ (Blockchain)    │  │ (File Storage)  │
           └─────────────────┘  └─────────────────┘
```

## 🔐 Security Features

- **End-to-End Encryption**: Files encrypted with AES-256 before upload
- **ECDH Key Exchange**: Secure key sharing using Elliptic Curve Diffie-Hellman
- **Blockchain Access Control**: Immutable permission management on Hyperledger Fabric
- **Distributed Storage**: Files stored on private IPFS network
- **Certificate-Based Authentication**: X.509 certificates for user identity
- **Audit Trail**: Complete blockchain-based transaction history

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd secureblockchain-vault
```

2. Make setup script executable:
```bash
chmod +x scripts/*.sh
```

3. Run the setup script:
```bash
./scripts/setup.sh
```

4. Start the application:
```bash
docker-compose up -d
```

5. Access the application:
- Web Interface: http://localhost:8080
- API Server: http://localhost:3000
- IPFS Gateway: http://localhost:8080/ipfs/

## 📱 Usage

### Web Interface

1. **File Upload**:
   - Navigate to the Upload tab
   - Select a file
   - File is automatically encrypted and uploaded to IPFS
   - Metadata is recorded on the blockchain

2. **File Access**:
   - View all accessible files in the Files tab
   - Download files (automatically decrypted)
   - Manage file permissions

3. **User Management**:
   - View registered users
   - Manage user certificates and access rights

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

#### File Management
- `POST /api/files/upload` - Upload encrypted file
- `GET /api/files/download/:fileId` - Download and decrypt file
- `GET /api/files/metadata/:fileId` - Get file metadata
- `POST /api/files/grant-access` - Grant file access to user
- `POST /api/files/revoke-access` - Revoke file access
- `GET /api/files/user-files` - Get user's accessible files
- `DELETE /api/files/:fileId` - Delete file
- `GET /api/files/history/:fileId` - Get file access history

#### System
- `GET /api/system/status` - System health check
- `GET /api/system/network-info` - Blockchain network information

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the API directory:

```env
NODE_ENV=production
PORT=3000
FABRIC_NETWORK_CONFIG_PATH=/app/config/connection-org1.json
FABRIC_WALLET_PATH=/app/wallet
IPFS_URL=http://ipfs:5001
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:3000
```

### Fabric Network Configuration

The Hyperledger Fabric network consists of:
- **1 Certificate Authority (CA)**: Manages user certificates
- **1 Peer**: Hosts the chaincode and maintains the ledger
- **1 Orderer**: Orders transactions into blocks
- **1 Channel**: `mychannel` for transaction processing

### Chaincode Functions

The `securefile` chaincode provides:
- `storeFileMetadata()` - Store file metadata with encryption info
- `queryFileMetadata()` - Query file metadata
- `grantAccess()` - Grant access to a user
- `revokeAccess()` - Revoke access from a user
- `checkAccess()` - Check if user has access
- `recordDownload()` - Record file download event
- `queryUserFiles()` - Get all files accessible to a user
- `deleteFile()` - Soft delete a file
- `getFileHistory()` - Get file transaction history

## 🐳 Docker Services

### Hyperledger Fabric Services
- `ca.org1.example.com` - Certificate Authority (Port 7054)
- `orderer.example.com` - Orderer Service (Port 7050)
- `peer0.org1.example.com` - Peer Node (Port 7051)

### Storage & API Services
- `ipfs` - IPFS Node (Ports 4001, 5001, 8080)
- `api` - Express.js API Server (Port 3000)

## 🔐 Cryptographic Operations

### File Encryption Flow
1. Generate random AES-256 key and IV
2. Encrypt file with AES key
3. Upload encrypted file to IPFS
4. Encrypt AES key with user's public key (ECDH)
5. Store encrypted key and metadata on blockchain

### File Decryption Flow
1. Verify user access permissions via blockchain
2. Retrieve encrypted AES key from blockchain
3. Decrypt AES key with user's private key (ECDH)
4. Download encrypted file from IPFS
5. Decrypt file with AES key

### Key Exchange (ECDH)
1. Generate ephemeral key pair
2. Derive shared secret using recipient's public key
3. Encrypt AES key with shared secret
4. Store ephemeral public key with encrypted data

## 📊 Monitoring & Logging

### Health Checks
- API Server: `GET /health`
- IPFS Node: Automatic connection monitoring
- Fabric Network: Peer and orderer status checks

### Logging
- Application logs: `api/logs/`
- Container logs: `docker-compose logs [service]`
- Blockchain events: Real-time event monitoring

## 🧪 Testing

### Manual Testing Scripts

```bash
# Test file upload
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@test.pdf" \
  -H "Authorization: Bearer <token>"

# Test file download
curl -X GET http://localhost:3000/api/files/download/FILE_ID \
  -H "Authorization: Bearer <token>" \
  -o downloaded_file.pdf

# Test access control
curl -X POST http://localhost:3000/api/files/grant-access \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"fileId":"FILE_ID","targetUserCertHash":"USER_CERT_HASH"}'
```

### Automated Testing

```bash
# Run API tests
cd api && npm test

# Run integration tests
./scripts/run-tests.sh
```

## 🔍 Troubleshooting

### Common Issues

1. **Docker containers not starting**:
   ```bash
   docker-compose down
   docker system prune -f
   docker-compose up -d
   ```

2. **Fabric connection errors**:
   - Check peer and orderer containers are running
   - Verify crypto material is generated correctly
   - Check network connectivity between containers

3. **IPFS connection issues**:
   ```bash
   docker exec -it ipfs_node ipfs swarm peers
   ```

4. **Certificate/Wallet issues**:
   ```bash
   rm -rf wallet/*
   cd api && npm run enroll-admin && npm run register-user
   ```

### Debug Mode

Enable debug logging:
```bash
export DEBUG=fabric-network:*,fabric-client:*
docker-compose up
```

## 🔒 Security Considerations

### Production Deployment

1. **Certificate Management**:
   - Use proper CA infrastructure
   - Implement certificate rotation
   - Secure private key storage

2. **Network Security**:
   - Use TLS for all communications
   - Implement proper firewall rules
   - Use VPN for inter-service communication

3. **Data Protection**:
   - Regular backups of blockchain data
   - Secure key management (HSM recommended)
   - Implement data retention policies

4. **Access Control**:
   - Role-based access control (RBAC)
   - Multi-factor authentication
   - Regular access audits

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: [Wiki](https://github.com/your-repo/wiki)
- Email: support@yourcompany.com

---

**⚠️ Important**: This is a demonstration system. For production use, implement proper security measures, key management, and compliance requirements specific to your organization.
