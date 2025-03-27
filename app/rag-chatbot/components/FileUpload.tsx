import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, CheckCircle, AlertCircle, File, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  onUploadStart: () => void;
  onUploadComplete: () => void;
  onUploadError: (error: string) => void;
}

export default function FileUpload({ 
  onUploadStart, 
  onUploadComplete, 
  onUploadError 
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      onUploadError('请选择文件');
      return;
    }
    
    const file = files[0];
    setSelectedFile(file);
    
    // 验证文件大小，最大允许10MB
    if (file.size > 10 * 1024 * 1024) {
      onUploadError('文件大小超过10MB，请选择更小的文件');
      return;
    }
    
    // 验证文件类型
    const validFileTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/html',
      'application/json'
    ];
    
    if (!validFileTypes.includes(file.type)) {
      onUploadError('不支持的文件类型，请选择 PDF, DOCX, TXT, HTML 或 JSON 文件');
      return;
    }
    
    await uploadFile(file);
  };
  
  const uploadFile = async (file: File) => {
    // 开始上传
    setIsUploading(true);
    onUploadStart();
    setUploadProgress(5);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('开始上传文件:', file.name, '大小:', Math.round(file.size / 1024), 'KB', '类型:', file.type);
      
      // 模拟进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 400);
      
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // 如果服务器返回错误，获取详细信息
        if (!response.ok) {
          const errorText = await response.text();
          let errorDetails = '';
          
          try {
            const errorJson = JSON.parse(errorText);
            errorDetails = errorJson.error || errorText;
          } catch (e) {
            errorDetails = errorText;
          }
          
          console.error('文件上传失败:', errorDetails);
          onUploadError(`上传失败: ${errorDetails || '服务器错误，请检查控制台获取详细信息'}`);
          return;
        }
        
        const result = await response.json();
        console.log('上传成功:', result);
        
        // 检查是否完成了向量化
        if (result.vectorized === false) {
          onUploadError(`文件 ${result.fileName} 已保存，但未能向量化用于搜索。${result.message || ''}`);
        } else {
          setTimeout(() => {
            onUploadComplete();
            // 清除选择的文件和进度
            setSelectedFile(null);
            setUploadProgress(0);
          }, 1000); // 给一点时间显示100%进度
        }
      } catch (fetchError) {
        clearInterval(progressInterval);
        console.error('文件上传请求失败:', fetchError);
        onUploadError(`上传失败: 请求错误 - ${fetchError instanceof Error ? fetchError.message : '网络问题或服务器未响应'}`);
      }
    } catch (error) {
      console.error('文件上传过程中发生错误:', error);
      onUploadError(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  // 处理拖拽事件
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  // 处理拖拽上传
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      
      // 验证文件大小，最大允许10MB
      if (file.size > 10 * 1024 * 1024) {
        onUploadError('文件大小超过10MB，请选择更小的文件');
        return;
      }
      
      // 验证文件类型
      const validFileTypes = [
        'application/pdf', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/html',
        'application/json'
      ];
      
      if (!validFileTypes.includes(file.type)) {
        onUploadError('不支持的文件类型，请选择 PDF, DOCX, TXT, HTML 或 JSON 文件');
        return;
      }
      
      await uploadFile(file);
    }
  };
  
  // 获取文件图标
  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (file.type.includes('document')) {
      return <FileText className="h-8 w-8 text-blue-500" />;
    } else if (file.type.includes('json')) {
      return <File className="h-8 w-8 text-amber-500" />;
    } else if (file.type.includes('html')) {
      return <File className="h-8 w-8 text-purple-500" />;
    } else if (file.type.includes('text')) {
      return <File className="h-8 w-8 text-gray-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };
  
  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    } else {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="flex flex-col space-y-1">
        <h3 className="text-base font-medium text-slate-800 dark:text-slate-200">上传文件到知识库</h3>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          支持 PDF, DOCX, TXT, HTML, 和 JSON 文件。最大大小: 10MB
        </p>
      </div>
      
      {/* 文件上传区域 */}
      <div 
        className={`
          relative border-2 border-dashed rounded-lg p-4 
          transition-all duration-200 ease-in-out
          ${dragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-slate-800/80 dark:border-blue-500/70' 
            : 'border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-800'
          }
          ${isUploading ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={isUploading ? undefined : handleDrop}
        onClick={() => {
          if (!isUploading && !selectedFile) {
            // 触发隐藏的文件输入点击
            document.getElementById('file-upload')?.click();
          }
        }}
      >
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept=".pdf,.docx,.txt,.html,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/html,application/json"
          disabled={isUploading}
        />
        
        {isUploading ? (
          /* 上传中状态 */
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="flex flex-col items-center">
              {getFileIcon(selectedFile!)}
              <h4 className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">{selectedFile?.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(selectedFile?.size || 0)}</p>
            </div>
            <div className="w-full max-w-md space-y-1">
              <Progress value={uploadProgress} className="h-1.5 w-full bg-gray-200 dark:bg-slate-700" />
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>正在上传...</span>
                <span>{uploadProgress}%</span>
              </div>
            </div>
          </div>
        ) : selectedFile ? (
          /* 已选择文件但未上传状态 */
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="flex flex-col items-center">
              {getFileIcon(selectedFile)}
              <h4 className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">{selectedFile.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(selectedFile.size)}</p>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  uploadFile(selectedFile);
                }}
                className="flex items-center gap-1 h-8 text-xs"
                disabled={isUploading}
              >
                <Upload className="h-3 w-3" />
                上传文件
              </Button>
              <Button 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="flex items-center gap-1 h-8 text-xs"
                disabled={isUploading}
              >
                <X className="h-3 w-3" />
                取消
              </Button>
            </div>
          </div>
        ) : dragActive ? (
          /* 拖拽中状态 */
          <div className="flex flex-col items-center justify-center py-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-500/20 mb-3">
              <Upload className="h-6 w-6 text-blue-500 dark:text-blue-400" />
            </div>
            <h4 className="text-base font-medium text-blue-600 dark:text-blue-400">松开以上传文件</h4>
          </div>
        ) : (
          /* 默认状态 */
          <div className="flex flex-col items-center justify-center py-3">
            <div className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 mb-3">
              <Upload className="h-6 w-6 text-slate-500 dark:text-slate-400" />
            </div>
            <h4 className="text-base font-medium text-slate-800 dark:text-slate-200">拖放您的文件到此处</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">或点击此区域选择文件</p>
            <div className="flex flex-wrap justify-center gap-1 mt-2">
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">PDF</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">DOCX</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-300">TXT</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300">HTML</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">JSON</span>
            </div>
          </div>
        )}
      </div>
      
      {/* 提示信息 */}
      <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-800 dark:text-blue-300">
        <AlertCircle className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p><strong>提示：</strong>文件上传后会自动进行向量化处理，以便在对话中引用</p>
          <p className="mt-0.5">大型文件处理可能需要较长时间</p>
        </div>
      </div>
    </div>
  );
} 