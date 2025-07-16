
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Users, Shield, FileText, Key, Lock, LogOut } from "lucide-react";
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';

const Index = () => {
  const [files, setFiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [newUserId, setNewUserId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { userId, isAdmin, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch files and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (userId) {
          const filesData = await api.getAllFiles(userId);
          setFiles(filesData);

          if (isAdmin) {
            const usersData = await api.getAllUsers(userId);
            setUsers(usersData);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch data",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [userId, isAdmin]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !userId) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = await api.uploadFile(file, userId);
      setFiles(prev => [...prev, response.metadata]);

      toast({
        title: "Success",
        description: `${file.name} has been uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  const handleDownload = async (file) => {
    try {
      const blob = await api.downloadFile(file.ipfsCID, userId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `${file.name} has been downloaded`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRegisterUser = async () => {
    if (!newUserId || !isAdmin || !userId) return;

    try {
      await api.registerUser(newUserId, userId);
      const updatedUsers = await api.getAllUsers(userId);
      setUsers(updatedUsers);
      setNewUserId('');

      toast({
        title: "Success",
        description: `User ${newUserId} has been registered`,
      });
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">SecureBlockchain Vault</h1>
                <p className="text-slate-400 text-sm">Hyperledger Fabric + IPFS File Sharing</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white">
                Logged in as: <strong>{userId}</strong>
                {isAdmin && <Badge className="ml-2 bg-blue-600">Admin</Badge>}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-slate-600 text-slate-300 hover:bg-slate-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="files" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Files
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
            )}
          </TabsList>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Your Files</CardTitle>
                <CardDescription>
                  All files are encrypted and stored on IPFS with access control on Hyperledger Fabric
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {files.map((file) => (
                  <div key={file.ipfsCID} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-600 rounded">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{file.name}</h3>
                          <Badge variant="secondary" className="bg-green-600 text-white">
                            <Lock className="h-3 w-3 mr-1" />
                            Encrypted
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">
                          Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-600"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
                {files.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    No files found. Upload some files to get started.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Upload File</CardTitle>
                <CardDescription>
                  Files will be encrypted before being stored on IPFS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  {isUploading && (
                    <div className="w-full bg-slate-700 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab (Admin only) */}
          {isAdmin && (
            <TabsContent value="users" className="space-y-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Manage Users</CardTitle>
                  <CardDescription>
                    Register and manage user access
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Input
                        type="text"
                        placeholder="Enter new user ID"
                        value={newUserId}
                        onChange={(e) => setNewUserId(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                      <Button
                        onClick={handleRegisterUser}
                        disabled={!newUserId}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Register User
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {users.map((user) => (
                        <div
                          key={user.userId}
                          className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="text-white">{user.userId}</span>
                            {user.isAdmin && (
                              <Badge className="bg-blue-600">Admin</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
