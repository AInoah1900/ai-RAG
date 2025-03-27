import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// 从环境变量获取连接配置（保留原有的环境变量兼容性）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

// 新增：PostgreSQL 直接连接配置
// 使用正确的 Supabase 数据库主机名格式
const pgHost = process.env.POSTGRES_HOST || 'nqtvnwjmpvaitwneyqpk.supabase.co';
const pgPort = process.env.POSTGRES_PORT || '5432';
const pgDatabase = process.env.POSTGRES_DATABASE || 'postgres';
const pgUser = process.env.POSTGRES_USER || 'postgres';
const pgPassword = process.env.POSTGRES_PASSWORD || 'xiaoke1900Db';
const pgConnectionString = process.env.POSTGRES_CONNECTION_STRING || 
  `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;

// 验证配置
const isValidConnectionConfig = (): boolean => {
  // 检查直接连接方式所需参数
  if (!pgHost || !pgPort || !pgDatabase || !pgUser || !pgPassword) {
    console.error('Missing PostgreSQL connection parameters. Please check your environment variables.');
    console.error(`Host: ${pgHost ? '(set)' : '(missing)'}, User: ${pgUser ? '(set)' : '(missing)'}, DB: ${pgDatabase ? '(set)' : '(missing)'}`);
    
    // 如果直接连接参数不完整，检查 Supabase 客户端参数
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials as fallback. Please check your environment variables.');
      console.error(`URL: ${supabaseUrl ? '(set)' : '(missing)'}, Key: ${supabaseKey ? '(set)' : '(missing)'}`);
      return false;
    }
  }
  
  return true;
};

// 自定义的错误处理函数
const handleDbError = (error: any): string => {
  if (error instanceof Error) {
    // PostgreSQL 常见错误
    if (error.message.includes('connection refused')) {
      return 'Database connection refused: The database server is not accepting connections.';
    }
    
    if (error.message.includes('password authentication failed')) {
      return 'Authentication failed: Invalid database username or password.';
    }
    
    if (error.message.includes('database') && error.message.includes('does not exist')) {
      return 'Database does not exist: The specified database could not be found.';
    }
    
    if (error.message.includes('timeout')) {
      return 'Connection timeout: The database server took too long to respond.';
    }
    
    return error.message;
  }
  
  return String(error);
};

// PostgreSQL 客户端
let pgClient: any = null;

// Supabase 客户端（作为备用方案保留）
let supabaseClient: SupabaseClient | null = null;

// 动态导入 postgres 库（仅在服务器端）
let postgres: any = null;

// 检查是否在服务器端运行
const isServer = typeof window === 'undefined';

// 创建 PostgreSQL 连接 - 仅在服务器端
const createPgConnection = async () => {
  // 判断是否在服务器端，如果不是则返回 null
  if (!isServer) {
    console.log('Skipping direct PostgreSQL connection in browser environment');
    return null;
  }
  
  // 检查是否禁用了直接连接
  if (process.env.DISABLE_DIRECT_PG_CONNECTION === 'true') {
    console.log('Direct PostgreSQL connection is disabled by environment variable');
    return null;
  }
  
  try {
    console.log(`Creating direct PostgreSQL connection to ${pgHost}...`);
    
    // 动态导入 postgres 库，这样它就不会在客户端加载
    if (!postgres) {
      try {
        postgres = (await import('postgres')).default;
      } catch (importError) {
        console.error('Failed to import postgres library:', importError);
        return null;
      }
    }
    
    // 创建 postgres 连接实例，增加超时时间和重试次数
    const sql = postgres(pgConnectionString, {
      idle_timeout: 30, // 增加到 30 秒
      connect_timeout: 30, // 增加到 30 秒
      max: 5, // 减少连接池大小以减少资源消耗
      max_lifetime: 60 * 5, // 连接最长生命周期为 5 分钟
      ssl: { rejectUnauthorized: false }, // 添加 SSL 配置以适应 Supabase PostgreSQL
      retry_limit: 3, // 重试 3 次
      debug: true, // 启用调试以获取更多日志信息
    });
    
    return sql;
  } catch (error) {
    const errorMessage = handleDbError(error);
    console.error('Failed to create PostgreSQL connection:', errorMessage);
    return null;
  }
};

// 创建 Supabase 客户端作为备用
const createSupabaseClient = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Cannot create Supabase client: invalid configuration');
    return null;
  }
  
  try {
    console.log('Creating Supabase client...');
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
      },
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(20000),
            mode: 'cors',
            credentials: 'include'
          }).catch(error => {
            console.error(`Supabase fetch error:`, error);
            throw error;
          });
        },
      },
    });
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return null;
  }
};

// 初始化数据库连接
const initDbConnection = async () => {
  if (!isValidConnectionConfig()) {
    throw new Error('无效的数据库连接配置，请检查环境变量');
  }
  
  let directConnectionSuccessful = false;
  
  // 尝试创建 PostgreSQL 直连（仅在服务器端）
  if (!pgClient && isServer) {
    try {
      console.log('尝试直接连接 PostgreSQL...');
      pgClient = await createPgConnection();
      
      // 测试连接是否可用
      if (pgClient) {
        try {
          console.log('测试直接 PostgreSQL 连接...');
          const testResult = await Promise.race([
            pgClient`SELECT 1 as test`,
            new Promise((_, reject) => setTimeout(() => reject(new Error('连接测试超时')), 5000))
          ]);
          
          if (testResult && testResult[0] && testResult[0].test === 1) {
            console.log('PostgreSQL 直接连接测试成功！');
            directConnectionSuccessful = true;
          } else {
            console.error('PostgreSQL 连接测试失败：无法执行简单查询');
            pgClient = null;
          }
        } catch (testError) {
          console.error('PostgreSQL 连接测试失败:', testError);
          pgClient = null;
        }
      }
    } catch (error) {
      console.error('无法创建 PostgreSQL 直接连接:', error);
      pgClient = null;
    }
  }
  
  // 如果 PostgreSQL 直连失败或在客户端环境，尝试使用 Supabase 客户端
  if (!pgClient && !supabaseClient) {
    console.log(isServer 
      ? `PostgreSQL 直接连接 ${directConnectionSuccessful ? '成功' : '失败'}，尝试使用 Supabase 客户端...` 
      : '在浏览器环境中运行，使用 Supabase 客户端...');
      
    supabaseClient = createSupabaseClient();
  }
  
  if (!pgClient && !supabaseClient) {
    throw new Error('无法连接到数据库，请检查连接参数和网络状态');
  }
  
  return { pgClient, supabaseClient };
};

// 测试数据库连接
const testDbConnection = async () => {
  try {
    const { pgClient, supabaseClient } = await initDbConnection();
    
    if (pgClient && isServer) {
      // 测试 PostgreSQL 连接
      try {
        const result = await pgClient`SELECT 1 as test`;
        if (result && result[0] && result[0].test === 1) {
          console.log('PostgreSQL direct connection successful');
          return true;
        }
      } catch (error) {
        console.error('PostgreSQL connection test failed:', handleDbError(error));
      }
    }
    
    if (supabaseClient) {
      // 测试 Supabase 连接
      try {
        const { error } = await supabaseClient.from('_nonexistent_table_').select('count').limit(1);
        if (error && error.code === '42P01') {
          console.log('Supabase connection successful');
          return true;
        }
      } catch (error) {
        console.error('Supabase connection test failed:', error);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Failed to test database connection:', error);
    return false;
  }
};

// 初始化连接
let connectionInitialized = false;
let connectionPromise: Promise<{ pgClient: any; supabaseClient: SupabaseClient | null }> | null = null;

// 获取数据库连接
export const getDbConnection = async () => {
  if (!connectionPromise) {
    connectionPromise = initDbConnection();
  }
  
  try {
    const result = await connectionPromise;
    connectionInitialized = true;
    return result;
  } catch (error) {
    connectionPromise = null;
    console.error('Failed to get database connection:', error);
    throw error;
  }
};

// 定义文件表结构
export const documentsTable = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: text('filename').notNull(),
  type: text('type').notNull(),
  content: text('content'),
  url: text('url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 检查表是否存在
export const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { pgClient, supabaseClient } = await getDbConnection();
    
    if (pgClient && isServer) {
      // 使用 PostgreSQL 直接查询 (仅在服务器端)
      const result = await pgClient`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = ${tableName}
        ) as exists
      `;
      
      return result[0]?.exists || false;
    }
    
    if (supabaseClient) {
      // 使用 Supabase 客户端尝试查询
      const { error } = await supabaseClient
        .from(tableName)
        .select('id')
        .limit(1);
        
      // 如果没有错误或者错误不是表不存在，那么表存在
      if (!error) return true;
      
      // 表不存在错误代码通常是 42P01
      if (error.code === '42P01') return false;
    }
    
    throw new Error('没有可用的数据库连接');
  } catch (error) {
    console.error(`Failed to check if table ${tableName} exists:`, error);
    return false;
  }
};

// 获取文件列表
export const getDocuments = async () => {
  try {
    console.log('Attempting to fetch documents from database...');
    
    // 获取数据库连接
    const { pgClient, supabaseClient } = await getDbConnection();
    
    // 检查连接是否成功
    if (!pgClient && !supabaseClient) {
      throw new Error('数据库连接未初始化，请检查连接配置');
    }
    
    // 检查表是否存在
    const documentsExists = await tableExists('documents');
    if (!documentsExists) {
      throw new Error('documents 表不存在，请按照指南创建表');
    }
    
    // 查询文档 - 仅在服务器端使用 PostgreSQL 直连
    if (pgClient && isServer) {
      // 使用 PostgreSQL 直接查询
      try {
        const documents = await pgClient`
          SELECT * FROM documents 
          ORDER BY created_at DESC
        `;
        
        console.log(`Successfully fetched ${documents.length} documents via PostgreSQL direct connection`);
        return documents;
      } catch (error) {
        const errorMessage = handleDbError(error);
        console.error('PostgreSQL query error:', errorMessage);
        throw new Error(`获取文档失败: ${errorMessage}`);
      }
    }
    
    // 备用：使用 Supabase 客户端
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (!data) {
          return [];
        }
        
        console.log(`Successfully fetched ${data.length} documents via Supabase client`);
        return data;
      } catch (error) {
        console.error('Supabase query error:', error);
        throw new Error(`获取文档失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    throw new Error('没有可用的数据库连接方法');
  } catch (error) {
    console.error('Error in getDocuments:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// 添加文件记录
export const addDocument = async (document: {
  filename: string;
  type: string;
  content?: string;
  url?: string;
}) => {
  try {
    console.log(`Adding document to database: ${document.filename}`);
    
    // 获取数据库连接
    const { pgClient, supabaseClient } = await getDbConnection();
    
    // 检查连接是否成功
    if (!pgClient && !supabaseClient) {
      throw new Error('数据库连接未初始化，请检查连接配置');
    }
    
    // 使用 PostgreSQL 直接插入 (仅在服务器端)
    if (pgClient && isServer) {
      try {
        const result = await pgClient`
          INSERT INTO documents (
            filename, type, content, url, created_at, updated_at
          ) VALUES (
            ${document.filename}, 
            ${document.type}, 
            ${document.content || null}, 
            ${document.url || null},
            now(),
            now()
          )
          RETURNING *
        `;
        
        if (!result || result.length === 0) {
          throw new Error('文档添加后未返回数据');
        }
        
        console.log(`Document added successfully with ID: ${result[0].id}`);
        return result[0];
      } catch (error) {
        const errorMessage = handleDbError(error);
        console.error('PostgreSQL insert error:', errorMessage);
        throw new Error(`添加文档失败: ${errorMessage}`);
      }
    }
    
    // 备用：使用 Supabase 客户端
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('documents')
          .insert([
            {
              filename: document.filename,
              type: document.type,
              content: document.content,
              url: document.url,
            },
          ])
          .select();
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (!data || data.length === 0) {
          throw new Error('文档添加成功但未返回数据');
        }
        
        console.log(`Document added successfully with ID: ${data[0].id}`);
        return data[0];
      } catch (error) {
        console.error('Supabase insert error:', error);
        throw new Error(`添加文档失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    throw new Error('没有可用的数据库连接方法');
  } catch (error) {
    console.error('Error in addDocument:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// 删除文档
export const deleteDocument = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`Deleting document with ID: ${id}`);
    
    // 获取数据库连接
    const { pgClient, supabaseClient } = await getDbConnection();
    
    // 检查连接是否成功
    if (!pgClient && !supabaseClient) {
      return { 
        success: false, 
        error: '数据库连接未初始化，请检查连接配置' 
      };
    }
    
    // 使用 PostgreSQL 直接删除 (仅在服务器端)
    if (pgClient && isServer) {
      try {
        await pgClient`
          DELETE FROM documents 
          WHERE id = ${id}
        `;
        
        console.log(`Document with ID ${id} successfully deleted`);
        return { success: true };
      } catch (error) {
        const errorMessage = handleDbError(error);
        console.error('PostgreSQL delete error:', errorMessage);
        return { 
          success: false, 
          error: `删除失败: ${errorMessage}` 
        };
      }
    }
    
    // 备用：使用 Supabase 客户端
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('documents')
          .delete()
          .match({ id });
        
        if (error) {
          throw new Error(error.message);
        }
        
        console.log(`Document with ID ${id} successfully deleted`);
        return { success: true };
      } catch (error) {
        console.error('Supabase delete error:', error);
        return { 
          success: false, 
          error: `删除失败: ${error instanceof Error ? error.message : String(error)}` 
        };
      }
    }
    
    return { 
      success: false, 
      error: '没有可用的数据库连接方法'
    };
  } catch (error) {
    console.error('Error in deleteDocument:', error);
    return { 
      success: false, 
      error: `删除过程中出错: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// 兼容性：导出 supabase 客户端以兼容旧代码
export const supabase = null; // 不再直接导出 supabase 客户端，使用 getDbConnection 代替

// 兼容旧代码的 getSupabaseClient 函数
export const getSupabaseClient = async (): Promise<SupabaseClient | null> => {
  try {
    const { supabaseClient } = await getDbConnection();
    return supabaseClient;
  } catch (error) {
    console.error('Failed to get Supabase client:', error);
    return null;
  }
}; 