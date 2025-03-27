import { Pinecone } from '@pinecone-database/pinecone';

// 从环境变量获取配置
const apiKey = process.env.PINECONE_API_KEY || '';
const environment = process.env.PINECONE_ENVIRONMENT; // 确保添加这个环境变量
const indexName = process.env.PINECONE_INDEX || 'chatbot';
const host = process.env.PINECONE_HOST || '';

// 验证环境变量
const validatePineconeConfig = () => {
  const missingVars = [];
  
  if (!apiKey) missingVars.push('PINECONE_API_KEY');
  if (!indexName) missingVars.push('PINECONE_INDEX');
  
  // 检查至少有environment或host设置
  if (!environment && !host) {
    missingVars.push('PINECONE_ENVIRONMENT or PINECONE_HOST');
  }
  
  if (missingVars.length > 0) {
    console.error(`Missing Pinecone configuration: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
};

// 安全地处理错误
const safeError = (error: any): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch (e) {
    return 'Unknown error occurred';
  }
};

// 创建Pinecone客户端实例
export const getPineconeClient = () => {
  if (!validatePineconeConfig()) {
    throw new Error('Pinecone configuration is incomplete. Please check your environment variables.');
  }
  
  try {
    // 更新：Pinecone SDK 已更新，不再支持 environment 参数
    // 只使用 apiKey 和可选的 host
    const config: any = { apiKey };
    
    // 如果有提供host，则使用host
    if (host) {
      config.controllerHostUrl = host;
    }
    
    return new Pinecone(config);
  } catch (error) {
    console.error('Failed to initialize Pinecone client:', safeError(error));
    throw new Error('Pinecone client initialization failed: ' + safeError(error));
  }
};

// 获取Pinecone客户端实例（懒加载）
let pineconeInstance: Pinecone | null = null;
export const pinecone = (): Pinecone => {
  if (!pineconeInstance) {
    pineconeInstance = getPineconeClient();
  }
  return pineconeInstance;
};

// 获取向量存储索引
export const getIndex = () => {
  try {
    return pinecone().index(indexName);
  } catch (error) {
    console.error('Failed to get Pinecone index:', safeError(error));
    throw new Error('Pinecone index access failed: ' + safeError(error));
  }
};

// 检查索引是否存在，如果不存在则创建
export const ensureIndexExists = async () => {
  try {
    console.log('Checking if Pinecone index exists...');
    const client = pinecone();
    
    // 列出所有索引
    const indexes = await client.listIndexes();
    console.log('Available Pinecone indexes:', indexes);
    
    if (!indexes.includes(indexName)) {
      console.log(`Creating Pinecone index "${indexName}"...`);
      
      try {
        await client.createIndex({
          name: indexName,
          dimension: 1536, // OpenAI embeddings 默认维度
          metric: 'cosine',
        });
        
        console.log('Index creation initiated, waiting for it to be ready...');
        
        // 等待索引准备就绪
        let isReady = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!isReady && attempts < maxAttempts) {
          attempts++;
          try {
            const index = await client.describeIndex(indexName);
            console.log(`Index status (attempt ${attempts}/${maxAttempts}):`, index.status);
            
            if (index.status.ready) {
              isReady = true;
              console.log('Index is now ready!');
            } else {
              console.log('Index not ready yet, waiting...');
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          } catch (statusError) {
            console.warn(`Failed to check index status (attempt ${attempts}/${maxAttempts}):`, safeError(statusError));
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
        
        if (!isReady) {
          console.warn(`Index did not become ready after ${maxAttempts} attempts. Proceeding anyway.`);
        }
      } catch (createError) {
        console.error('Failed to create Pinecone index:', safeError(createError));
        throw new Error('Pinecone index creation failed: ' + safeError(createError));
      }
    } else {
      console.log(`Pinecone index "${indexName}" already exists.`);
    }
    
    return getIndex();
  } catch (error) {
    console.error('Error ensuring Pinecone index exists:', safeError(error));
    throw new Error('Pinecone index initialization failed: ' + safeError(error));
  }
}; 