import { NextResponse } from 'next/server';
import { getDocuments, addDocument, deleteDocument } from '../../../lib/supabase/client';
import { initSupabaseDb } from '../../../lib/supabase/init-db';

// 初始化数据库
export async function GET(request: Request) {
  try {
    // 从 URL 获取操作类型
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'init';
    const id = searchParams.get('id');

    switch (action) {
      case 'init':
        // 初始化数据库
        const initResult = await initSupabaseDb();
        return NextResponse.json(initResult);
      
      case 'documents':
        // 获取文档列表
        const documents = await getDocuments();
        return NextResponse.json({ success: true, data: documents });
      
      case 'delete':
        // 删除文档
        if (!id) {
          return NextResponse.json(
            { success: false, error: '缺少文档 ID 参数' },
            { status: 400 }
          );
        }
        
        const deleteResult = await deleteDocument(id);
        return NextResponse.json(deleteResult);
      
      default:
        return NextResponse.json(
          { success: false, error: '未知操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Database API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '数据库操作失败' 
      },
      { status: 500 }
    );
  }
}

// 添加文档
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 验证请求体
    if (!body.filename || !body.type) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数 (filename, type)' },
        { status: 400 }
      );
    }
    
    const document = await addDocument({
      filename: body.filename,
      type: body.type,
      content: body.content,
      url: body.url
    });
    
    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    console.error('Add document error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '添加文档失败' 
      },
      { status: 500 }
    );
  }
} 