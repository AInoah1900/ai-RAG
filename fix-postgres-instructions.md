# PostgreSQL 连接错误修复指南

## 问题描述

您可能遇到了以下错误：
```
PostgreSQL connection test failed: Error: getaddrinfo ENOTFOUND db.nqtvnwjmpvaitwneyqpk.supabase.co
```

或者

```
PostgreSQL 连接错误：write CONNECT_TIMEOUT nqtvnwjmpvaitwneyqpk.supabase.co:5432
```

第一个错误表明系统无法解析 `db.nqtvnwjmpvaitwneyqpk.supabase.co` 主机名。
第二个错误表明尝试连接到数据库服务器时超时，这可能是由于网络问题或防火墙限制。

## 解决方案

### 主机名格式错误（ENOTFOUND 错误）

如果您遇到 `ENOTFOUND` 错误，问题很容易解决，只需要修改 PostgreSQL 主机名，去掉 `db.` 前缀即可。

1. 在项目根目录创建或编辑 `.env.local` 文件
2. 找到 `POSTGRES_HOST` 变量，并修改为不带 `db.` 前缀的格式：

```
# 错误的格式
POSTGRES_HOST=db.nqtvnwjmpvaitwneyqpk.supabase.co

# 正确的格式
POSTGRES_HOST=nqtvnwjmpvaitwneyqpk.supabase.co
```

3. 同样，如果您使用了 `POSTGRES_CONNECTION_STRING`，也需要修改主机名部分：

```
# 错误的格式
POSTGRES_CONNECTION_STRING=postgresql://postgres:password@db.nqtvnwjmpvaitwneyqpk.supabase.co:5432/postgres

# 正确的格式
POSTGRES_CONNECTION_STRING=postgresql://postgres:password@nqtvnwjmpvaitwneyqpk.supabase.co:5432/postgres?sslmode=require
```

4. 保存文件并重启应用程序：
```bash
npm run dev
```

### 连接超时问题（CONNECT_TIMEOUT 错误）

如果您遇到超时错误，可能是由于以下原因：

1. **网络连接问题**：
   - 检查您的网络连接是否稳定
   - 确认您的网络允许端口 5432 的出站连接（许多企业和学校网络会阻止此端口）
   - 尝试使用不同的网络连接（如手机热点）测试

2. **防火墙限制**：
   - 一些防火墙配置可能会阻止直接的数据库连接
   - 检查您的防火墙设置

3. **Supabase 服务状态**：
   - 检查 [Supabase 状态页面](https://status.supabase.com/) 确认服务是否正常

### 临时解决方案：使用本地 SQLite 数据库

如果您继续遇到问题，可以考虑临时使用本地 SQLite 数据库进行开发：

1. 安装所需依赖：
```bash
npm install better-sqlite3
```

2. 修改代码以使用 SQLite 而不是 PostgreSQL/Supabase

### 使用仅 Supabase API 模式

您可以设置一个环境变量，强制应用程序仅使用 Supabase API 而不尝试直接 PostgreSQL 连接：

1. 在 `.env.local` 中添加：
```
DISABLE_DIRECT_PG_CONNECTION=true
```

2. 修改 `lib/supabase/client.ts` 文件，添加此环境变量的检查：

```typescript
// 在 createPgConnection 函数顶部
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
  
  // ... rest of the function
};
```

## 其他提示

1. **确保使用 SSL 连接**：Supabase 数据库需要 SSL 连接，请在连接字符串中添加 `?sslmode=require` 或在代码中设置 `ssl: { rejectUnauthorized: false }`

2. **增加连接超时**：您可以修改 `lib/supabase/client.ts` 文件，增加连接超时时间：
```typescript
const sql = postgres(pgConnectionString, {
  idle_timeout: 30, // 30 秒
  connect_timeout: 30, // 30 秒
  max: 5,
  ssl: { rejectUnauthorized: false }
});
```

3. **使用正确的密码**：确保使用的是数据库密码，而不是 Supabase API 密钥

## 需要更多帮助？

如果您仍然遇到问题，请查看服务器日志获取更详细的错误信息，或参考 [Supabase 文档](https://supabase.com/docs) 获取更多信息。 