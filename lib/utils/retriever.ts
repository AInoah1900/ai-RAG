import { OpenAIEmbeddings } from '@langchain/openai';
import { getIndex } from '../pinecone/client';
import { PineconeStore } from '@langchain/pinecone';

// 创建文档检索器
export const createRetriever = async () => {
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    const index = getIndex();
    
    // 创建向量存储
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      namespace: 'default',
    });
    
    // 创建检索器
    return vectorStore.asRetriever({
      searchType: 'similarity',
      k: 5, // 返回最相似的5个文档
    });
  } catch (error) {
    console.error('Error creating retriever:', error);
    throw error;
  }
};

// 根据查询检索相关文档
export const queryDocuments = async (query: string) => {
  try {
    const retriever = await createRetriever();
    const documents = await retriever.getRelevantDocuments(query);
    
    return documents;
  } catch (error) {
    console.error('Error querying documents:', error);
    throw error;
  }
}; 