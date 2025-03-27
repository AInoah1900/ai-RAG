import { embed, embedMany } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { queryDocuments } from '../utils/retriever';

// 使用deepseek的嵌入模型
const embeddingModel = deepseek('deepseek-chat');

// 将内容分割成块
const generateChunks = (input: string): string[] => {
  return input
    .trim()
    .split('.')
    .filter(i => i !== '');
};

// 生成多个文本块的嵌入
export const generateEmbeddings = async (
  value: string,
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

// 生成单个文本的嵌入
export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll('\\n', ' ');
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

// 查找与用户查询相关的内容
export const findRelevantContent = async (userQuery: string) => {
  try {
    console.log('查询相关内容:', userQuery);
    const docs = await queryDocuments(userQuery);
    
    if (docs.length === 0) {
      return { 
        found: false, 
        message: '未找到相关信息' 
      };
    }
    
    return {
      found: true,
      relevantContent: docs.map((doc, i) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        relevance: 1.0 - (0.1 * i) // 简单模拟相关性评分
      }))
    };
  } catch (error) {
    console.error('查询相关内容出错:', error);
    return { 
      found: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}; 