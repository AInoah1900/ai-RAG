import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { getIndex } from '../pinecone/client';
import * as fs from 'fs';
import * as path from 'path';
import { PineconeStore } from '@langchain/pinecone';
import { addDocument } from '../supabase/client';

// 文件类型配置
const FILE_TYPE_CONFIG = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'text',
  'text/html': 'html',
  'application/json': 'json',
};

// 安全地处理错误
const safeError = (error: any): string => {
  if (!error) return 'No error';
  
  try {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object') {
      try {
        return JSON.stringify(error);
      } catch (e) {
        return String(Object.prototype.toString.call(error));
      }
    }
    return String(error);
  } catch (e) {
    return 'Unknown error occurred';
  }
};

// 验证OpenAI API密钥是否有效
const validateOpenAiApiKey = (): boolean => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OpenAI API Key is missing in environment variables');
    return false;
  }
  
  // 简单验证API密钥格式
  if (!apiKey.startsWith('sk-')) {
    console.error('OpenAI API Key format appears invalid');
    return false;
  }
  
  return true;
};

// 分割文本为块
const splitTextIntoChunks = async (text: string): Promise<Document[]> => {
  // 清理文本，移除多余的空格和换行符
  const cleanText = text
    .replace(/\r\n/g, '\n')         // 统一换行符
    .replace(/\n{3,}/g, '\n\n')     // 将3个或更多连续换行替换为2个
    .replace(/\s{3,}/g, ' ')        // 多余空格清理
    .trim();
  
  if (cleanText.length === 0) {
    throw new Error('文本内容为空，无法处理');
  }
  
  // 根据文本长度动态设置块大小
  let chunkSize = 500;
  let chunkOverlap = 50;
  
  if (cleanText.length > 100000) {  // 对于非常长的文本 (>100K字符)
    chunkSize = 1000;
    chunkOverlap = 100;
  } else if (cleanText.length > 10000) {  // 适中长度的文本 (>10K字符)
    chunkSize = 750;
    chunkOverlap = 75;
  }
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  const chunks = await splitter.createDocuments([cleanText]);
  
  // 过滤掉太短的块（可能只包含空格或不相关内容）
  return chunks.filter(chunk => chunk.pageContent.trim().length > 20);
};

// 根据文件URL处理文档内容
export const processDocumentFromUrl = async (url: string, fileName: string) => {
  try {
    console.log(`处理URL文档: ${url}`);
    
    // 验证URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('无效的URL，必须以http://或https://开头');
    }
    
    // 尝试获取URL内容
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 30000,  // 30秒超时
      });
    } catch (fetchError) {
      console.error('URL获取失败:', safeError(fetchError));
      throw new Error('无法获取URL内容: ' + safeError(fetchError));
    }
    
    if (!response.ok) {
      throw new Error(`获取URL内容失败，状态码: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    const type = FILE_TYPE_CONFIG[contentType.split(';')[0]] || 'text';
    
    const text = await response.text();
    console.log(`成功获取URL内容，长度: ${text.length} 字符`);
    
    if (text.length === 0) {
      throw new Error('URL内容为空');
    }
    
    // 将文档添加到Supabase
    try {
      console.log('将文档添加到Supabase...');
      await addDocument({
        filename: fileName,
        type,
        url,
        content: text.substring(0, 500) + '...',  // 只存储部分内容预览
      });
      console.log('已成功将文档添加到Supabase');
    } catch (dbError) {
      console.error('无法将文档添加到Supabase:', safeError(dbError));
      throw new Error('无法将文档添加到数据库: ' + safeError(dbError));
    }
    
    // 分割并存储向量
    let vectorizationResult = null;
    try {
      console.log('处理并存储文档块...');
      vectorizationResult = await processAndStoreDocumentChunks(text, fileName);
      console.log('已成功处理并存储文档块');
    } catch (vectorError) {
      console.error('向量化过程中出错:', safeError(vectorError));
      return { 
        success: true, 
        fileName, 
        warning: '文档已保存但未向量化: ' + safeError(vectorError),
        vectorized: false 
      };
    }
    
    return { success: true, fileName, vectorized: true };
  } catch (error) {
    console.error('处理URL文档时出错:', safeError(error));
    throw error;
  }
};

// 处理并存储文档块
const processAndStoreDocumentChunks = async (text: string, fileName: string) => {
  try {
    console.log(`处理文档内容，文件名: ${fileName}, 长度: ${text.length} 字符`);
    
    // 检查OpenAI API密钥
    if (!validateOpenAiApiKey()) {
      throw new Error('OpenAI API密钥缺失或无效');
    }
    
    // 分割文本
    console.log('将文本分割为块...');
    const chunks = await splitTextIntoChunks(text);
    console.log(`创建了 ${chunks.length} 个文本块`);
    
    if (chunks.length === 0) {
      throw new Error('未能从文档中提取有效内容');
    }
    
    // 添加元数据
    const documentsWithMetadata = chunks.map((chunk, index) => {
      return {
        ...chunk,
        metadata: {
          ...chunk.metadata,
          fileName,
          chunkIndex: index,
          totalChunks: chunks.length
        },
      };
    });

    // 创建embeddings
    console.log('创建OpenAI embeddings...');
    let embeddings;
    try {
      embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        batchSize: 16,  // 每次批处理16个文本块以提高性能
      });
    } catch (embeddingError) {
      console.error('初始化OpenAI embeddings失败:', safeError(embeddingError));
      throw new Error('OpenAI embeddings初始化失败: ' + safeError(embeddingError));
    }
    
    // 获取Pinecone索引
    console.log('获取Pinecone索引...');
    try {
      const index = getIndex();
      
      // 存储到向量数据库
      console.log('将文档存储到Pinecone...');
      await PineconeStore.fromDocuments(documentsWithMetadata, embeddings, {
        pineconeIndex: index,
        namespace: 'default',
        batchSize: 32,  // 每批处理32条记录以提高性能
      });
      console.log('向量已成功存储到Pinecone');
    } catch (pineconeError) {
      console.error('Pinecone存储错误:', safeError(pineconeError));
      throw new Error('无法将向量存储到Pinecone: ' + safeError(pineconeError));
    }
    
    return { success: true };
  } catch (error) {
    console.error('处理和存储文档块时出错:', safeError(error));
    throw error;
  }
};

// 处理上传的文件
export const processUploadedFile = async (
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
) => {
  const logPrefix = `[处理文件:${fileName}]`;
  
  try {
    console.log(`${logPrefix} 开始处理上传的文件: (${contentType}, ${Math.round(fileBuffer.length / 1024)} KB)`);
    const type = FILE_TYPE_CONFIG[contentType] || 'text';
    
    // 验证文件大小
    if (fileBuffer.length === 0) {
      throw new Error('文件内容为空');
    }
    
    // 解析文件内容为文本
    let text = '';
    try {
      console.log(`${logPrefix} 解析 ${type} 文件...`);
      
      if (type === 'pdf') {
        // 处理PDF文件
        try {
          console.log(`${logPrefix} 使用pdf-parse处理PDF文件...`);
          // 动态导入pdf-parse
          const pdfParse = await import('pdf-parse').then(mod => mod.default || mod);
          
          // 设置解析选项以提高可靠性
          const options = {
            max: 0,       // 所有页面
            version: 'v2.0.550',
            pagerender: null,
            debug: false,
          };
          
          try {
            // 直接传递当前的buffer，而不是尝试读取文件
            const pdfData = await pdfParse(fileBuffer, options);
            text = pdfData.text || '';
            
            // 简单验证提取的文本
            if (text.trim().length === 0) {
              throw new Error('从PDF中提取的文本为空');
            }
            
            console.log(`${logPrefix} 成功解析PDF，提取了 ${text.length} 个字符`);
          } catch (parseError) {
            console.error(`${logPrefix} PDF解析具体错误:`, safeError(parseError));
            throw new Error('解析PDF文件内容失败: ' + safeError(parseError));
          }
        } catch (pdfModuleError) {
          console.error(`${logPrefix} 导入pdf-parse模块失败:`, safeError(pdfModuleError));
          throw new Error('加载PDF解析模块失败: ' + safeError(pdfModuleError));
        }
      } else if (type === 'docx') {
        // 处理Word文档
        try {
          console.log(`${logPrefix} 使用mammoth处理DOCX文件...`);
          // 动态导入 mammoth
          const mammoth = await import('mammoth').then(mod => mod.default || mod);
          
          try {
            const options = {
              includeDefaultStyleMap: true,
              convertImage: null,
              ignoreEmptyParagraphs: true,
            };
            
            const result = await mammoth.extractRawText({ 
              buffer: fileBuffer,
              ...options
            });
            
            text = result.value || '';
            const warnings = result.messages || [];
            
            if (warnings.length > 0) {
              console.warn(`${logPrefix} DOCX解析警告:`, warnings);
            }
            
            // 简单验证提取的文本
            if (text.trim().length === 0) {
              throw new Error('从DOCX中提取的文本为空');
            }
            
            console.log(`${logPrefix} 成功解析DOCX，提取了 ${text.length} 个字符`);
          } catch (parseError) {
            console.error(`${logPrefix} DOCX解析具体错误:`, safeError(parseError));
            throw new Error('解析DOCX文件内容失败: ' + safeError(parseError));
          }
        } catch (docxModuleError) {
          console.error(`${logPrefix} 导入mammoth模块失败:`, safeError(docxModuleError));
          throw new Error('加载DOCX解析模块失败: ' + safeError(docxModuleError));
        }
      } else {
        // 处理其他文本类型
        try {
          text = fileBuffer.toString('utf-8');
          console.log(`${logPrefix} 转换 ${type} 文件为文本，共 ${text.length} 个字符`);
          
          // 简单验证提取的文本  
          if (text.trim().length === 0) {
            throw new Error('提取的文本内容为空');
          }
        } catch (textError) {
          console.error(`${logPrefix} 文本解析错误:`, safeError(textError));
          throw new Error('解析文本内容失败: ' + safeError(textError));
        }
      }
    } catch (parseError) {
      console.error(`${logPrefix} 文件解析错误:`, safeError(parseError));
      throw new Error('解析文件内容失败: ' + safeError(parseError));
    }
    
    // 将文档添加到Supabase
    try {
      console.log(`${logPrefix} 将文档添加到Supabase...`);
      await addDocument({
        filename: fileName,
        type,
        content: text.length > 500 ? text.substring(0, 500) + '...' : text,  // 存储前500个字符作为预览
      });
      console.log(`${logPrefix} a成功将文档添加到Supabase`);
    } catch (dbError) {
      console.error(`${logPrefix} 无法将文档添加到Supabase:`, safeError(dbError));
      throw new Error('无法将文档添加到数据库: ' + safeError(dbError));
    }
    
    // 分割并存储向量
    let vectorizationResult = null;
    try {
      console.log(`${logPrefix} 处理并存储文档块...`);
      vectorizationResult = await processAndStoreDocumentChunks(text, fileName);
      console.log(`${logPrefix} 已成功处理并存储文档块`);
    } catch (vectorError) {
      console.error(`${logPrefix} 向量化过程中出错:`, safeError(vectorError));
      return { 
        success: true, 
        fileName, 
        warning: '文档已保存但未向量化: ' + safeError(vectorError),
        vectorized: false 
      };
    }
    
    return { success: true, fileName, vectorized: true };
  } catch (error) {
    console.error(`${logPrefix} 处理上传的文件时出错:`, safeError(error));
    throw error;
  }
};

// 处理上传的文件
export const processFile = async (fileName: string, fileBuffer: Buffer, contentType: string) => {
  try {
    console.log(`处理文件: ${fileName} (${contentType}, ${Math.round(fileBuffer.length / 1024)} KB)`);
    
    // 设置标志，如果向量处理失败，至少保存文件本身
    let vectorProcessingFailed = false;
    
    try {
      // 尝试处理上传的文件，包括向量化和存储
      console.log(`处理上传的文件...`);
      await processUploadedFile(fileBuffer, fileName, contentType);
    } catch (processingError) {
      console.error(`文件处理过程中发生错误:`, safeError(processingError));
      console.log(`尝试在不向量化的情况下保存文件...`);
      vectorProcessingFailed = true;
      
      // 尝试只存储到数据库，跳过向量化
      try {
        console.log(`尝试将文件保存到数据库而不进行向量化...`);
        
        await addDocument({
          filename: fileName,
          type: contentType,
          content: '由于处理错误，文件内容未处理',
        });
      } catch (dbError) {
        console.error(`保存文件到数据库失败:`, safeError(dbError));
        throw new Error(`文件处理和保存失败: ${safeError(processingError)}`);
      }
    }
    
    // 返回成功响应
    console.log(`文件处理完成`);
    return { 
      success: true, 
      fileName,
      vectorized: !vectorProcessingFailed,
      message: vectorProcessingFailed ? '文件已保存但未向量化用于搜索' : '文件已完全处理'
    };
  } catch (error) {
    console.error(`文件处理错误:`, safeError(error));
    throw error;
  }
}; 