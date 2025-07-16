const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const storageRoutes = require('./routes/storage');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/storage', storageRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Secure Storage API',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        user: 'GET /api/auth/user'
      },
      storage: {
        store: 'POST /api/storage',
        retrieve: 'GET /api/storage/:key',
        list: 'GET /api/storage',
        delete: 'DELETE /api/storage/:key'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`✅ API documentation available at http://localhost:${PORT}`);
}); 