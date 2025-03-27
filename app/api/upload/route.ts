import { NextRequest, NextResponse } from 'next/server';
import { processFile } from '@/lib/utils/document-loader';
import { ensureIndexExists } from '@/lib/pinecone/client';

// 设置请求参数
export const dynamic = 'force-dynamic'; // 强制动态渲染
export const maxDuration = 60; // 设置60秒超时
export const fetchCache = 'force-no-store'; // 不缓存
export const runtime = 'nodejs'; // 使用Node.js运行时

// 安全地处理错误
const safeErrorMessage = (error: any): string => {
  if (!error) return 'Unknown error';
  
  try {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object') {
      return JSON.stringify(error);
    }
    return String(error);
  } catch (e) {
    return 'Error could not be serialized';
  }
};

// 处理文件上传
export async function POST(request: Request) {
  try {
    // 确保Pinecone索引存在
    try {
      await ensureIndexExists();
    } catch (pineconeError) {
      console.error('Pinecone初始化错误:', pineconeError);
      // 继续处理，这样至少可以将文件保存到数据库
      console.warn('继续处理而不使用Pinecone...');
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '未选择文件' },
        { status: 400 }
      );
    }
    
    // 获取文件内容为 Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 处理文件并添加到数据库
    const result = await processFile(file.name, buffer, file.type);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '文件上传失败' 
      },
      { status: 500 }
    );
  }
} 