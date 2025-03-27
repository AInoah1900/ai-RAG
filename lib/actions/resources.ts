'use server';

import { addDocument } from '../supabase/client';
import { revalidatePath } from 'next/cache';

// 添加资源到知识库
export async function createResource({ content }: { content: string }) {
  try {
    console.log('添加新资源到知识库:', content.substring(0, 50) + '...');
    
    // 添加到数据库
    const document = await addDocument({
      filename: `用户添加内容-${new Date().toISOString().split('T')[0]}`,
      type: 'text',
      content: content,
    });
    
    // 刷新页面缓存
    revalidatePath('/rag-chatbot');
    
    console.log('资源添加成功，ID:', document.id);
    return { success: true, resourceId: document.id };
  } catch (error) {
    console.error('添加资源失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
} 