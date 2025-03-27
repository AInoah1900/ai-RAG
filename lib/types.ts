// 文档类型定义
export interface Document {
  id: string;
  content?: string;
  metadata: {
    filename?: string;
    title?: string;
    type?: string;
    url?: string;
    source?: string;
    [key: string]: any;
  };
  created_at: string;
}

// API响应类型
export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// 数据库初始化响应
export interface DbInitResponse extends ApiResponse {
  initialized?: boolean;
}

// 文档列表响应
export interface DocumentsResponse extends ApiResponse {
  data?: Document[];
}

// 文档删除响应
export interface DeleteDocumentResponse extends ApiResponse {
  id?: string;
}

// 文档添加响应
export interface AddDocumentResponse extends ApiResponse {
  document?: Document;
}

// 文件上传响应
export interface FileUploadResponse extends ApiResponse {
  fileName?: string;
  vectorized?: boolean;
}

// URL处理响应
export interface UrlProcessingResponse extends ApiResponse {
  fileName?: string;
  url?: string;
} 