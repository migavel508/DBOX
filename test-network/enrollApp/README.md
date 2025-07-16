# Secure Storage Application

This application provides a secure storage system using Hyperledger Fabric, with user authentication and authorization.

## Prerequisites

- Node.js v14 or higher
- Running Hyperledger Fabric test network
- Fabric CA running for Org1

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a .env file in the root directory with the following content:
```
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secure-jwt-secret-key-change-this-in-production
```

3. Register an admin user:
```bash
npm run register-admin
```

4. Register a regular user:
```bash
npm run register-user
```

5. Start the application:
```bash
npm start
```

## API Endpoints

### Authentication

#### Register User (Admin only)
- **POST** `/api/auth/register`
- **Body**:
  ```json
  {
    "userId": "user1",
    "password": "userpassword"
  }
  ```
- **Headers**: `Authorization: Bearer <admin-token>`

#### Login
- **POST** `/api/auth/login`
- **Body**:
  ```json
  {
    "userId": "user1",
    "password": "userpassword"
  }
  ```

#### Get User Info
- **GET** `/api/auth/user`
- **Headers**: `Authorization: Bearer <token>`

### Storage

#### Store Data
- **POST** `/api/storage`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "key": "mydata",
    "value": {
      "any": "json data"
    }
  }
  ```

#### Retrieve Data
- **GET** `/api/storage/:key`
- **Headers**: `Authorization: Bearer <token>`

#### List All Keys
- **GET** `/api/storage`
- **Headers**: `Authorization: Bearer <token>`

#### Delete Data
- **DELETE** `/api/storage/:key`
- **Headers**: `Authorization: Bearer <token>`

## Security Features

1. JWT-based authentication
2. Password hashing with bcrypt
3. Role-based access control (admin vs regular users)
4. Secure storage using Hyperledger Fabric
5. TLS encryption for all communications

## Development

To run in development mode with auto-reload:
```bash
npm run dev
```

## Testing

You can use the provided demo.http file with VS Code's REST Client extension to test the API endpoints. 