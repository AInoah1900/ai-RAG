'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Database, Upload, Loader2, FileUp, Globe, RefreshCw, AlertCircle } from 'lucide-react';
import FileUpload from './FileUpload';
import DocumentList from './DocumentList';
import { Document } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface StatusMessageType {
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<StatusMessageType | null>(null);
  const [dbStatus, setDbStatus] = useState<{ initialized: boolean; message: string }>({
    initialized: false,
    message: '正在连接数据库...'
  });
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('documents');

  // 初始化数据库并加载文档列表
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      setDbStatus(prev => ({ ...prev, message: '正在连接到数据库...' }));
      
      try {
        // 使用 API 路由初始化数据库
        const response = await fetch('/api/db?action=init');
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setDbStatus({ initialized: true, message: result.message || '数据库连接成功' });
          await fetchDocuments();
        } else {
          setDbStatus({ initialized: false, message: result.error || '数据库初始化失败' });
          console.error('Database initialization failed:', result.error);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setDbStatus(prev => ({ 
          ...prev, 
          message: `数据库初始化失败: ${errorMessage}。请检查数据库连接配置。` 
        }));
        console.error('Error initializing knowledge base:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // 获取文档列表
  const fetchDocuments = async () => {
    setIsLoading(true);
    setDbStatus(prev => ({ ...prev, message: '正在刷新文档列表...' }));
    
    try {
      // 使用 API 路由获取文档列表
      const response = await fetch('/api/db?action=documents');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const docs = result.data || [];
        setDocuments(docs);
        
        if (docs.length > 0) {
          setDbStatus(prev => ({ 
            ...prev, 
            message: `成功加载 ${docs.length} 个文档。` 
          }));
        } else {
          setDbStatus(prev => ({ 
            ...prev, 
            message: '知识库中暂无文档。请上传文件或添加 URL 以丰富知识库。' 
          }));
        }
        console.log('Documents loaded successfully:', docs.length);
      } else {
        throw new Error(result.error || '获取文档失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 特殊处理常见错误
      if (errorMessage.includes('table') && errorMessage.includes('not exist')) {
        setDbStatus(prev => ({ 
          ...prev, 
          message: '数据库表不存在。请检查数据库配置并确保已创建必要的表结构。' 
        }));
      } else if (errorMessage.includes('authentication') || errorMessage.includes('auth')) {
        setDbStatus(prev => ({ 
          ...prev, 
          message: '数据库认证失败。请检查您的 API 密钥是否正确。' 
        }));
      } else if (errorMessage.includes('network') || errorMessage.includes('connect')) {
        setDbStatus(prev => ({ 
          ...prev, 
          message: '无法连接到数据库。请检查您的网络连接和数据库服务状态。' 
        }));
      } else {
        setDbStatus(prev => ({ 
          ...prev, 
          message: `获取文档失败: ${errorMessage}` 
        }));
      }
      
      console.error('Error fetching documents:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = async () => {
    setIsUploading(false);
    setShowFileUpload(false);
    setUploadError(null);
    setUploadStatus({
      type: 'success',
      message: '文档上传成功！已添加到知识库。'
    });
    await fetchDocuments();
    // 设置一个定时器清除上传状态消息
    setTimeout(() => setUploadStatus(null), 5000);
  };

  const handleUploadError = (error: string) => {
    setIsUploading(false);
    setUploadError(error);
    setUploadStatus({
      type: 'error',
      message: error
    });
    // 设置一个定时器清除错误消息
    setTimeout(() => setUploadStatus(null), 5000);
  };

  // 获取文件类型图标
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'docx':
        return '📝';
      case 'text':
        return '📃';
      case 'html':
        return '🌐';
      case 'json':
        return '📋';
      default:
        return '📁';
    }
  };

  // 显示手动创建表指南
  const showTableCreationGuide = () => {
    setShowManualInstructions(true);
  };

  return (
    <div className="p-4 space-y-4 flex-1 h-full flex flex-col overflow-hidden">
      {/* 状态信息展示 */}
      {!dbStatus.initialized && (
        <Card className="border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 flex-shrink-0">
          <CardContent className="p-3 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                {dbStatus.message || '数据库初始化失败。请检查您的配置。'}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                请确保数据库配置正确并创建了必要的表结构。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 上传状态通知 */}
      {uploadStatus && (
        <Card className={`border flex-shrink-0 ${
          uploadStatus.type === 'success' 
            ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800' 
            : uploadStatus.type === 'error'
              ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
              : 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800'
        } shadow-sm transition-all duration-300 animate-fadeIn`}>
          <CardContent className="p-3">
            <p className={`text-sm ${
              uploadStatus.type === 'success' 
                ? 'text-green-800 dark:text-green-300' 
                : uploadStatus.type === 'error'
                  ? 'text-red-800 dark:text-red-300'
                  : 'text-blue-800 dark:text-blue-300'
            }`}>
              {uploadStatus.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 知识库操作区 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex-1 flex flex-col">
        <Tabs 
          defaultValue="documents" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full h-full flex flex-col"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
            <TabsList className="bg-gray-100 dark:bg-slate-700 h-8">
              <TabsTrigger value="documents" className="text-xs px-2 py-1 h-6">
                文档列表
              </TabsTrigger>
              <TabsTrigger value="upload" className="text-xs px-2 py-1 h-6">
                上传文件
              </TabsTrigger>
              <TabsTrigger value="url" className="text-xs px-2 py-1 h-6">
                添加URL
              </TabsTrigger>
            </TabsList>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDocuments}
              disabled={isLoading || !dbStatus.initialized}
              className="h-7 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>

          <TabsContent value="documents" className="flex-1 overflow-hidden p-0 focus:outline-none">
            <div className="p-3 h-full overflow-y-auto">
              {/* 文档列表 */}
              <DocumentList 
                documents={documents} 
                onDocumentDeleted={fetchDocuments} 
                isLoading={isLoading}
                disabled={!dbStatus.initialized}
              />
              
              {/* 无文档时的提示 */}
              {dbStatus.initialized && documents.length === 0 && !isLoading && (
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-4">
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mb-3">
                      <Database className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">
                      知识库为空
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 max-w-md">
                      上传文件或添加URL以开始构建您的知识库
                    </p>
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => setActiveTab('upload')}
                        className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-xs h-8"
                      >
                        <FileUp className="h-3 w-3" />
                        上传文件
                      </Button>
                      <Button 
                        onClick={() => setActiveTab('url')}
                        variant="outline"
                        className="flex items-center gap-1 text-xs h-8"
                      >
                        <Globe className="h-3 w-3" />
                        添加URL
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 overflow-hidden focus:outline-none">
            {/* 文件上传组件 */}
            {dbStatus.initialized && (
              <div className="p-3 h-full overflow-y-auto">
                <FileUpload
                  onUploadStart={() => setIsUploading(true)}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="url" className="flex-1 overflow-hidden focus:outline-none">
            {/* URL 添加表单 */}
            {dbStatus.initialized && (
              <div className="p-3 h-full overflow-y-auto">
                <h3 className="text-base font-medium mb-2 text-slate-800 dark:text-slate-200">添加网页URL</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                  输入网页URL，系统将抓取内容并添加到知识库
                </p>
                <form className="space-y-3" onSubmit={(e) => {
                  e.preventDefault();
                  // URL 添加逻辑
                }}>
                  <div>
                    <label htmlFor="url" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      网页URL
                    </label>
                    <input
                      type="url"
                      id="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/article"
                      className="w-full p-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="filename" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      文件名称
                    </label>
                    <input
                      type="text"
                      id="filename"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="为此URL取一个名称"
                      className="w-full p-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      required
                    />
                  </div>
                  <Button 
                    type="submit"
                    disabled={isUploading || !url || !fileName}
                    className="w-full flex items-center justify-center gap-1 h-9 text-sm"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <Globe className="h-3 w-3" />
                        添加URL
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 