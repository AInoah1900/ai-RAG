import { PostgrestError } from '@supabase/supabase-js';
import { supabase, getSupabaseClient, getDbConnection, tableExists } from './client';

// 检查是否在服务器端运行
const isServer = typeof window === 'undefined';

// 辅助函数：安全地处理错误对象
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
      const props = Object.getOwnPropertyNames(error);
      const details = props.map(prop => `${prop}: ${String(error[prop])}`).join(', ');
      return `Object: {${details}}`;
    }
    
    return String(error);
  } catch (e) {
    return 'Error while processing error object';
  }
};

// 通过SQL创建表 - 使用 PostgreSQL 直接连接
async function createTableWithSQL(): Promise<boolean> {
  try {
    // 如果不在服务器端，直接返回 false
    if (!isServer) {
      console.log('Skipping table creation via SQL in browser environment');
      return false;
    }
    
    const { pgClient, supabaseClient } = await getDbConnection();
    
    // 使用 PostgreSQL 直接创建表 (仅在服务器端)
    if (pgClient) {
      try {
        // 先检查 vector 扩展是否安装
        await pgClient`CREATE EXTENSION IF NOT EXISTS vector`;
        
        // 创建文档表
        await pgClient`
          CREATE TABLE IF NOT EXISTS documents (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            filename TEXT NOT NULL,
            type TEXT,
            content TEXT,
            url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `;
        
        console.log('Table created successfully with PostgreSQL direct connection');
        return true;
      } catch (error) {
        console.error('Failed to create table with PostgreSQL direct connection:', error);
      }
    }
    
    // 备用：使用 Supabase 客户端
    if (supabaseClient) {
      try {
        // 尝试使用 RPC 创建表
        const { error } = await supabaseClient.rpc('create_documents_table', {});
        
        if (error) {
          // 如果 RPC 函数不存在，尝试直接执行 SQL
          const sqlQuery = `
            CREATE TABLE IF NOT EXISTS documents (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              filename TEXT NOT NULL,
              type TEXT,
              content TEXT,
              url TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `;
          
          const { error: sqlError } = await supabaseClient.rpc('exec_sql', { sql: sqlQuery });
          
          if (sqlError) {
            console.error('Failed to create table with SQL via Supabase:', sqlError);
            return false;
          }
        }
        
        console.log('Table created successfully via Supabase client');
        return true;
      } catch (error) {
        console.error('Exception while creating table with Supabase:', 
          error instanceof Error ? error.message : String(error));
      }
    }
    
    return false;
  } catch (error) {
    console.error('Exception while creating table:', 
      error instanceof Error ? error.message : String(error));
    return false;
  }
}

// 初始化数据库
export async function initSupabaseDb(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Initializing database...');
    
    // 获取数据库连接
    try {
      const { pgClient, supabaseClient } = await getDbConnection();
      
      if (!pgClient && !supabaseClient) {
        return { 
          success: false, 
          message: '无法连接到数据库。请检查您的环境变量和数据库状态。' 
        };
      }
      
      // 测试连接 - PostgreSQL 直连 (仅在服务器端)
      if (pgClient && isServer) {
        try {
          const result = await pgClient`SELECT 1 as test`;
          if (result && result[0] && result[0].test === 1) {
            console.log('PostgreSQL direct connection successful');
          } else {
            return {
              success: false,
              message: '无法验证 PostgreSQL 连接。请检查连接参数。'
            };
          }
        } catch (error) {
          console.error('PostgreSQL connection test failed:', error);
          
          // 如果是认证错误
          if (error instanceof Error && error.message.includes('authentication')) {
            return {
              success: false,
              message: '数据库认证失败：用户名或密码不正确。'
            };
          }
          
          // 如果是连接错误
          if (error instanceof Error && error.message.includes('connect')) {
            return {
              success: false,
              message: '数据库连接被拒绝：服务器不可达或不接受连接。'
            };
          }
          
          return {
            success: false,
            message: `PostgreSQL 连接错误：${safeError(error)}`
          };
        }
      }
      
      // 备用：测试 Supabase 客户端连接
      if (supabaseClient) {
        try {
          const { error: pingError } = await supabaseClient
            .from('_nonexistent_table_')
            .select('count')
            .limit(1);
          
          // 我们期望得到表不存在的错误，如果是连接问题会得到不同的错误
          if (pingError && pingError.code !== '42P01') {
            if (pingError.code?.startsWith('PGRST')) {
              return { 
                success: false,
                message: `Supabase 连接错误：${pingError.message}。请检查网络连接和服务器状态。`
              };
            } else if (pingError.code?.startsWith('2')) {  // HTTP 2xx errors
              return { 
                success: false,
                message: `Supabase 认证错误：${pingError.message}。请检查您的 API 密钥。`
              };
            } else {
              return { 
                success: false,
                message: `Supabase 错误：${pingError.message}。数据库可能不可用。`
              };
            }
          }
        } catch (connError) {
          return { 
            success: false,
            message: `无法连接到 Supabase：${connError instanceof Error ? connError.message : String(connError)}`
          };
        }
      }
    } catch (connectionError) {
      return { 
        success: false,
        message: `初始化数据库连接失败：${connectionError instanceof Error ? connectionError.message : String(connectionError)}`
      };
    }
    
    // 检查表是否存在
    const documentsTableExists = await tableExists('documents');
    
    if (!documentsTableExists) {
      console.log('Documents table does not exist, attempting to create it...');
      
      // 使用 SQL 创建表
      const tableCreated = await createTableWithSQL();
      
      if (tableCreated) {
        return { 
          success: true, 
          message: '数据库表创建成功。' 
        };
      }
      
      // 如果创建失败，提供手动创建的说明
      const manualCreationMessage = `
无法自动创建数据库表。请在 Supabase 仪表板中手动执行以下 SQL：

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  type TEXT,
  content TEXT,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
      `;
      
      console.warn(manualCreationMessage);
      
      return {
        success: false,
        message: '无法创建数据库表。请手动创建表或检查数据库权限。'
      };
    }
    
    console.log('Documents table exists, database is ready');
    return { success: true, message: '数据库已初始化并准备使用。' };
    
  } catch (error) {
    console.error('Error initializing database:', 
      error instanceof Error ? error.message : String(error));
    
    return { 
      success: false,
      message: `初始化数据库失败：${error instanceof Error ? error.message : String(error)}`
    };
  }
} 