import React from 'react';
import RagChatLayout from './components/RagChatLayout';

export const metadata = {
  title: 'DeepSeek RAG Chatbot',
  description: '使用DeepSeek模型进行基于知识库的对话',
};

export default function RagChatPage() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <RagChatLayout />
    </div>
  );
} 