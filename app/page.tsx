import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8">DeepSeek RAG 聊天机器人</h1>
      <p className="text-xl mb-8 text-center max-w-2xl">
        基于Next.js和DeepSeek模型的知识库增强型聊天应用，支持上传文件和添加URL。
      </p>
      <Link 
        href="/rag-chatbot" 
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        进入聊天页面
      </Link>
    </div>
  );
}
