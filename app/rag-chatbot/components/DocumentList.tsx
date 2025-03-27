import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Trash2, File, FileText, FileJson, FileCode, ExternalLink, 
  Loader2, AlertCircle, Calendar 
} from 'lucide-react';
import { Document } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DocumentListProps {
  documents: Document[];
  onDocumentDeleted: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export default function DocumentList({ 
  documents, 
  onDocumentDeleted,
  isLoading,
  disabled = false
}: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 获取文件图标
  const getFileIcon = (doc: Document) => {
    // 从元数据中获取文件类型
    const type = doc.metadata?.type?.toLowerCase() || '';
    const filename = doc.metadata?.filename?.toLowerCase() || '';
    
    if (type.includes('pdf') || filename.endsWith('.pdf')) {
      return <FileText className="h-4 w-4 text-red-500" />;
    } else if (type.includes('docx') || filename.endsWith('.docx')) {
      return <FileText className="h-4 w-4 text-blue-500" />;
    } else if (type.includes('json') || filename.endsWith('.json')) {
      return <FileJson className="h-4 w-4 text-amber-500" />;
    } else if (type.includes('html') || filename.endsWith('.html')) {
      return <FileCode className="h-4 w-4 text-purple-500" />;
    } else if (type.includes('text') || filename.endsWith('.txt')) {
      return <File className="h-4 w-4 text-gray-500" />;
    } else if (doc.metadata?.url) {
      return <ExternalLink className="h-4 w-4 text-green-500" />;
    }
    
    return <File className="h-4 w-4 text-gray-500" />;
  };

  // 获取文档标题
  const getDocumentTitle = (doc: Document) => {
    return (
      doc.metadata?.filename || 
      doc.metadata?.title || 
      doc.metadata?.source ||
      doc.metadata?.url || 
      '未命名文档'
    );
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', year: 'numeric' });
    }
  };

  // 处理文档删除
  const handleDeleteDocument = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      setTimeout(() => {
        setConfirmDelete(null);
      }, 3000); // 3秒后自动取消确认状态
      return;
    }
    
    setDeletingId(id);
    setDeleteError(null);
    
    try {
      // 使用 API 路由删除文档
      const response = await fetch(`/api/db?action=delete&id=${id}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Document deleted:', id);
        onDocumentDeleted();
      } else {
        setDeleteError(`删除失败: ${result.error}`);
        console.error('Failed to delete document:', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setDeleteError(`删除出错: ${errorMessage}`);
      console.error('Error deleting document:', errorMessage);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500 dark:text-blue-400" />
          <p className="text-xs text-slate-600 dark:text-slate-300">加载文档中...</p>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return null; // 空文档列表不显示任何内容，外部组件会显示提示
  }

  return (
    <div className="space-y-2">
      {/* 删除错误提示 */}
      {deleteError && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/30 mb-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p>{deleteError}</p>
        </div>
      )}
      
      {/* 文档列表标题 */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">
          文档列表 ({documents.length})
        </h3>
      </div>
      
      {/* 文档列表 */}
      <div className="space-y-1.5">
        {documents.map((doc) => (
          <div 
            key={doc.id} 
            className="group relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-sm"
          >
            <div className="p-2">
              <div className="flex items-start">
                <div className="p-1.5 rounded-md bg-gray-100 dark:bg-slate-700 mr-2">
                  {getFileIcon(doc)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate pr-6">{getDocumentTitle(doc)}</h4>
                  </div>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                    {doc.metadata?.type && (
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded-full 
                        ${doc.metadata.type.includes('pdf') ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' : 
                          doc.metadata.type.includes('docx') ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' : 
                          doc.metadata.type.includes('json') ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300' : 
                          doc.metadata.type.includes('html') ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300' : 
                          'bg-gray-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {doc.metadata.type.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {doc.metadata?.url && (
                    <a
                      href={doc.metadata.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[10px] text-blue-500 hover:underline truncate mt-0.5"
                    >
                      {doc.metadata.url}
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            {/* 删除按钮 - 悬浮显示 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDocument(doc.id)}
                    disabled={!!deletingId || disabled}
                    className={`absolute top-1.5 right-1.5 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                      confirmDelete === doc.id 
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 opacity-100' 
                        : 'bg-white dark:bg-slate-700'
                    }`}
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {confirmDelete === doc.id ? '再次点击确认删除' : '删除文档'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ))}
      </div>
    </div>
  );
} 