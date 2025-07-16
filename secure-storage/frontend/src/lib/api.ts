import axios from 'axios';

// Update API base URL to match the backend port
const API_BASE_URL = 'http://localhost:3000/api';

// Add request interceptor to handle errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

interface RegisterUserResponse {
  message: string;
  identity: any;
}

interface LoginResponse {
  message: string;
  userId: string;
  isAdmin: boolean;
}

interface UploadFileResponse {
  message: string;
  fileId: string;
  metadata: {
    name: string;
    type: string;
    size: number;
    ipfsCid: string;
    encryptionKeyId: string;
  };
}

interface User {
  userId: string;
  isAdmin: boolean;
}

interface FileMetadata {
  id: string;
  name: string;
  description: string;
  ipfsCID: string;
  size: number;
  mimeType: string;
  createdAt: string;
  lastModified: string;
}

export const api = {
  // Auth endpoints
  login: async (userId: string): Promise<LoginResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/users/login`, { userId });
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // User endpoints
  registerUser: async (userId: string, adminId: string, role?: string): Promise<RegisterUserResponse> => {
    const response = await axios.post(
      `${API_BASE_URL}/users/register`,
      { userId, role },
      { headers: { 'admin-id': adminId } }
    );
    return response.data;
  },

  getAllUsers: async (adminId: string): Promise<User[]> => {
    const response = await axios.get(`${API_BASE_URL}/users`, {
      headers: { 'admin-id': adminId }
    });
    return response.data;
  },

  // File endpoints
  getAllFiles: async (userId: string): Promise<FileMetadata[]> => {
    const response = await axios.get(`${API_BASE_URL}/files`, {
      headers: { 'user-id': userId }
    });
    return response.data;
  },

  uploadFile: async (file: File, userId: string): Promise<UploadFileResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'user-id': userId,
      },
    });
    return response.data;
  },

  downloadFile: async (fileId: string, userId: string): Promise<Blob> => {
    const response = await axios.get(`${API_BASE_URL}/files/${fileId}`, {
      headers: {
        'user-id': userId,
      },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api; 