# RAG Chatbot with DeepSeek

这是一个基于Next.js 15.2.4的网站项目，支持本地知识库（RAG 大模型检索增强生成）的DeepSeek对话页面。

## 功能特点

- **DeepSeek对话**: 基于Vercel AI SDK的DeepSeek模型聊天界面
- **知识库RAG**: 支持上传文件、网站URL和word文档等格式的资料
- **向量数据库**: 使用Pinecone存储文档向量
- **文件存储**: 使用Supabase存储上传的文件信息
- **文件处理**: 支持PDF、DOCX、TXT、HTML和JSON文件的处理和向量化
- **拖放上传**: 支持直接拖拽文件到上传区域

## 页面结构

整个页面分为左右两部分：
- 左侧：知识库RAG管理界面，支持文件上传和查看已上传文件列表
- 右侧：DeepSeek对话框，支持基于知识库的对话

## 快速开始

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 必需的依赖

确保安装以下关键依赖项：
```bash
npm install @pinecone-database/pinecone pdf-parse mammoth @langchain/pinecone @langchain/openai lucide-react
```

### 环境变量设置

在项目根目录创建`.env.local`文件，并设置以下环境变量：

```
# OpenAI API配置 - 用于文本嵌入
OPENAI_API_KEY=your-openai-api-key

# Pinecone 向量数据库配置
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_HOST=your-pinecone-host  # 例如：https://your-index.svc.your-region.pinecone.io
PINECONE_INDEX=your-pinecone-index-name  # 例如：chatbot
# 注意：新版本Pinecone SDK不再使用ENVIRONMENT参数
# PINECONE_ENVIRONMENT=your-pinecone-environment

# Supabase 数据库配置
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url  # 例如：https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_URL=your-supabase-url  # 与NEXT_PUBLIC_SUPABASE_URL相同
SUPABASE_KEY=your-supabase-key  # 与NEXT_PUBLIC_SUPABASE_ANON_KEY相同
SUPABASE_DB=your-supabase-connection-string  # 可选
```

### 初始化数据库

1. 登录您的[Supabase仪表板](https://app.supabase.com/)
2. 打开SQL编辑器
3. 执行以下SQL创建必要的`documents`表：

```sql
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  filename TEXT NOT NULL,
  type TEXT,
  content TEXT,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 运行项目

```bash
npm run dev
```

打开 [http://localhost:3000/rag-chatbot](http://localhost:3000/rag-chatbot) 查看页面。

## 使用方法

### 文件上传

1. 访问 `/rag-chatbot` 页面
2. 在左侧面板中，选择"上传文件"选项卡
3. 有两种方式上传文件：
   - 点击上传区域，通过文件选择器选择文件
   - 直接将文件拖放到上传区域
4. 支持的文件类型：PDF, DOCX, TXT, HTML, JSON
5. 文件大小限制：最大10MB
6. 上传后，文件将自动处理并向量化添加到知识库

### 添加URL

1. 在左侧面板中，选择"添加URL"选项卡
2. 输入网页URL和文件名称
3. 点击"添加URL"按钮
4. 系统将自动抓取URL内容，处理并向量化添加到知识库

### 查看文档

- 在左侧面板下方，可以查看所有已上传的文档列表
- 列表显示文件名、上传时间和类型
- 对于URL类型的文档，可以点击查看原始网页

### 对话交互

1. 在右侧对话框中输入问题
2. 系统会自动搜索知识库中的相关内容
3. 基于检索到的内容和DeepSeek模型能力，生成答案
4. 对话支持多轮交互，会保持上下文连贯性

## 支持的文件格式

- **PDF文档** (.pdf) - 支持文本提取和向量化
- **Word文档** (.docx) - 支持文本提取和向量化
- **文本文件** (.txt) - 直接处理文本内容
- **HTML文件** (.html) - 提取网页文本内容
- **JSON文件** (.json) - 解析JSON数据
- **网站URL** - 抓取网页内容并处理

## 最新更新

### 2024年5月更新

- **API路由架构**: 重构为基于API路由的架构，分离前端和后端逻辑
- **服务器组件优化**: 确保数据库操作仅在服务器端执行，解决客户端导入Node.js模块的问题
- **错误处理增强**: 改进API响应的错误处理和状态反馈
- **类型系统改进**: 统一的类型定义提高了代码质量和开发体验
- **Next.js兼容性**: 更好地适配Next.js的服务器组件模型

### 2024年3月更新

- **拖放上传**: 添加文件拖放上传功能，提升用户体验
- **文件验证**: 增强对文件类型和大小的验证
- **错误处理**: 改进错误处理和用户反馈机制
- **PDF处理优化**: 增强PDF文件解析的稳定性
- **文本清理**: 改进文本预处理，提高向量质量
- **UI优化**: 上传状态显示更加直观
- **性能提升**: 批处理向量嵌入，提高处理速度
- **日志增强**: 添加详细日志，便于故障排查

### 布局优化（2023-10-xx）

我们对应用程序的布局进行了全面优化，现在采用更直观的左右结构：

1. **左右布局结构**：
   - 左侧：知识库 RAG 智能搜索区域，包含文档管理、文件上传和URL添加功能
   - 右侧：DeepSeek 智能助手聊天界面，提供基于知识库的问答交互

2. **界面优化**：
   - 添加顶部导航栏，包含应用标题和主题切换功能
   - 优化侧边栏切换按钮，适配不同尺寸的屏幕
   - 改进组件内边距和滚动控制，确保在各种屏幕大小下的一致体验

3. **功能增强**：
   - 知识库区域添加标签页，便于切换不同功能
   - 聊天界面优化消息展示，添加操作菜单
   - 响应式设计，在桌面和移动设备上均能提供良好体验

4. **视觉一致性**：
   - 统一颜色主题和间距
   - 完善深色模式支持
   - 添加过渡动画，提升交互体验

这些更新使应用程序更加直观、美观和易于使用，特别是在需要同时使用知识库和聊天功能时，能够提供更高效的工作流程。

## 故障排除

### 文件上传失败

如果遇到文件上传失败，请检查：

1. **环境变量配置** - 确保所有必要的环境变量都已正确设置
2. **Supabase表结构** - 确保`documents`表已正确创建
3. **OpenAI API密钥** - 确保API密钥有效且具有足够的配额
4. **Pinecone配置** - 确保Pinecone索引已创建且配置正确
5. **控制台错误** - 检查浏览器控制台和服务器日志获取详细错误信息

### 上传文件时的常见问题

1. **"不支持的文件类型"错误**:
   - 确保上传的是支持的文件类型（PDF, DOCX, TXT, HTML, JSON）
   - 检查文件扩展名是否与实际文件类型匹配

2. **"文件大小超过限制"错误**:
   - 文件大小限制为10MB
   - 尝试压缩文件或分割为多个小文件

3. **文件处理失败**:
   - PDF文件可能是扫描版或加密的，无法提取文本
   - DOCX文件可能格式特殊或包含复杂元素
   - 尝试使用文本编辑器打开文件，确保能正确读取文本内容

4. **"向量化失败"提示**:
   - 文件已保存但未能向量化
   - 检查OpenAI API密钥是否有效
   - 检查Pinecone是否正确配置
   - 如果问题持续，可以尝试重新上传文件

### 缺少依赖

如果看到有关缺少模块的错误，请运行：

```bash
npm install @pinecone-database/pinecone pdf-parse mammoth @langchain/pinecone @langchain/openai
```

如果看到关于UI组件的错误（如"Can't resolve 'lucide-react'"），请运行：

```bash
npm install lucide-react
```

### Supabase连接问题

如果遇到数据库连接问题：

1. 确保公共URL和匿名密钥正确设置在环境变量中
2. 检查Supabase项目是否处于活动状态
3. 确认是否有正确的RLS(Row Level Security)策略允许读写操作

### PDF处理问题

如果遇到PDF处理错误，如"ENOENT: no such file or directory"，请确保:

1. 已正确安装`pdf-parse`和`mammoth`库
2. 尝试更新这些库到最新版本: `npm install pdf-parse@latest mammoth@latest`
3. 确保提供的PDF文件不是受损或受密码保护的

```bash
npm install pdf-parse@latest mammoth@latest
```

## 技术栈

- Next.js 15.2.4
- Vercel AI SDK
- Pinecone 向量数据库
- Supabase/PostgreSQL 数据存储
- Langchain 文档处理
- TailwindCSS
- OpenAI Embeddings API

## 项目结构

- `/app` - Next.js应用页面和组件
  - `/rag-chatbot` - RAG聊天机器人页面
  - `/api` - API路由（文件上传、URL处理、聊天、数据库操作）
- `/lib` - 公用函数库
  - `/pinecone` - Pinecone向量数据库客户端
  - `/supabase` - Supabase/PostgreSQL数据库客户端
  - `/utils` - 工具函数，包括文档处理
  - `/types.ts` - 全局类型定义

## 贡献指南

欢迎提交Issue和Pull Request来改进项目。

## 开源许可

[MIT](https://choosealicense.com/licenses/mit/)

## 常见问题排查

### Supabase 连接问题

如果遇到 Supabase 连接错误（如 "Failed to fetch" 或 "Supabase client is not initialized"），请尝试以下解决方案：

1. **检查环境变量**：
   - 确保 `.env.local` 文件中设置了以下变量：
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
     ```
   - 注意 URL 格式必须是有效的 URL 格式，以 `https://` 开头

2. **检查 Supabase 服务状态**：
   - 访问 [Supabase 状态页面](https://status.supabase.com/) 确认服务是否正常
   - 登录 [Supabase 控制台](https://app.supabase.com/)，确认您的项目是否处于活动状态

3. **检查 CORS 配置**：
   - 在 Supabase 控制台中，进入 API 设置，确保您的应用域名已添加到允许列表中
   - 对于本地开发，添加 `http://localhost:3000`

4. **网络问题排查**：
   - 清除浏览器缓存或尝试使用隐私模式
   - 检查网络防火墙是否阻止了对 Supabase 域名的访问
   - 尝试使用不同的网络连接

5. **检查 API 密钥**：
   - 确认 API 密钥正确且未过期
   - 在 Supabase 控制台 → Settings → API 中获取正确的 URL 和密钥

6. **表结构问题**：
   - 确认 `documents` 表已正确创建，您可以运行以下 SQL 创建它：
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;

     CREATE TABLE IF NOT EXISTS documents (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       content TEXT NOT NULL,
       metadata JSONB NOT NULL DEFAULT '{}',
       embedding VECTOR(1536),
       created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
     );
     ```

7. **重试机制**：
   - 应用内置了自动重试机制，偶尔的连接问题可能会自动恢复
   - 如果多次重试后仍然失败，请检查上述所有配置

通过实施以上解决方案，您应该能够解决 "Failed to fetch" 连接错误。如果问题仍然存在，请查看浏览器开发者工具中的网络选项卡，获取更详细的错误信息。

### 使用 PostgreSQL 直接连接（更可靠的方式）

如果您继续遇到 Supabase 连接问题，本项目现已支持使用 PostgreSQL 直接连接方式，这通常比使用 Supabase JavaScript SDK 更可靠，特别是在以下情况：

1. **CORS 问题持续存在**：直接 PostgreSQL 连接不受浏览器 CORS 策略的影响，因为连接发生在服务器端。
2. **需要更稳定的连接**：适用于需要长时间连接数据库的应用程序。
3. **需要执行复杂的 SQL 查询**：直接连接允许您执行任何 SQL 查询，而不仅限于 Supabase API 提供的功能。

#### 配置 PostgreSQL 直接连接

1. 确保 `.env.local` 文件中设置了以下变量：
   ```
   # PostgreSQL 直接连接配置 (注意主机名格式)
   POSTGRES_HOST=nqtvnwjmpvaitwneyqpk.supabase.co  # 注意不要添加 "db." 前缀
   POSTGRES_PORT=5432
   POSTGRES_DATABASE=postgres
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your-database-password
   POSTGRES_CONNECTION_STRING=postgresql://postgres:your-database-password@nqtvnwjmpvaitwneyqpk.supabase.co:5432/postgres?sslmode=require
   ```

2. 您可以在 Supabase 仪表板中找到这些连接参数：
   - 登录 [Supabase](https://app.supabase.com/)
   - 进入您的项目
   - 点击左侧菜单中的 "Settings" > "Database"
   - 在 "Connection string" 部分，您可以找到直接连接所需的所有信息
   - **重要：** 主机名格式应为 `yourproject.supabase.co`，不要包含 `db.` 前缀

3. 安装必要的依赖：
   ```bash
   npm install postgres
   ```

4. 重启应用程序：
   ```bash
   npm run dev
   ```

#### PostgreSQL 连接故障排除

如果您仍然遇到 PostgreSQL 连接问题，请尝试以下解决方案：

1. **查看错误信息**：
   - 检查服务器日志中的具体错误信息
   - 常见错误如 "ENOTFOUND" 通常表示主机名解析问题

2. **检查主机名格式**：
   - Supabase 数据库的正确主机名格式是 `project-id.supabase.co`（不带 `db.` 前缀）
   - 如果您看到错误 `getaddrinfo ENOTFOUND db.yourproject.supabase.co`，请移除 `db.` 前缀

3. **SSL 连接**：
   - Supabase 数据库需要 SSL 连接
   - 确保连接字符串中包含 `?sslmode=require` 或在代码中设置 `ssl: { rejectUnauthorized: false }`

4. **防火墙和网络**：
   - 确保您的网络允许端口 5432 的出站连接
   - 某些网络可能会阻止直接的数据库连接

5. **使用正确的密码**：
   - 确保您使用的是数据库密码，而不是 Supabase API 密钥
   - 数据库密码可以在 Supabase 仪表板中重置或查看

应用程序将优先使用 PostgreSQL 直接连接，如果直接连接失败，会自动回退到 Supabase JavaScript SDK。这种双重连接策略确保了您的应用程序在各种情况下都能连接到数据库。
