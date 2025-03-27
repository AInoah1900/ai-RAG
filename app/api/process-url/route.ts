import { NextRequest, NextResponse } from 'next/server';
import { processDocumentFromUrl } from '@/lib/utils/document-loader';
import { ensureIndexExists } from '@/lib/pinecone/client';

// 处理URL文档
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, fileName } = body;
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: '未提供URL' },
        { status: 400 }
      );
    }
    
    if (!fileName) {
      return NextResponse.json(
        { success: false, error: '未提供文件名' },
        { status: 400 }
      );
    }
    
    // 确保Pinecone索引存在
    try {
      await ensureIndexExists();
    } catch (pineconeError) {
      console.error('Pinecone初始化错误:', pineconeError);
      // 继续处理，这样至少可以将文件保存到数据库
      console.warn('继续处理而不使用Pinecone...');
    }
    
    // 处理URL并添加到数据库
    const result = await processDocumentFromUrl(url, fileName);
    
    return NextResponse.json({
      success: true,
      fileName,
      url,
      message: '已成功处理URL'
    });
  } catch (error) {
    console.error('URL processing error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'URL处理失败' 
      },
      { status: 500 }
    );
  }
} 