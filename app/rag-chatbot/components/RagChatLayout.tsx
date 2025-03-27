'use client';

import React, { useState, useEffect } from 'react';
import KnowledgeBase from './KnowledgeBase';
import ChatInterface from './ChatInterface';
import { Button } from '@/components/ui/button';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function RagChatLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 在客户端渲染后再执行主题相关操作
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="h-screen w-full flex flex-col">
      {/* 页面顶部导航栏 */}
      <header className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-gray-900 flex items-center justify-between px-4 py-2 h-14 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">RAG知识库智能助手</h1>
        <div className="flex items-center space-x-3">
          {mounted && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full"
              aria-label="切换主题"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-yellow-400" />
              ) : (
                <Moon className="h-5 w-5 text-slate-700" />
              )}
            </Button>
          )}
        </div>
      </header>

      {/* 页面主体内容 */}
      <div style={{ display: 'flex', flexDirection: 'row', flex: '1', overflow: 'hidden' }} className="flex-1 flex flex-row overflow-hidden">
        {/* 知识库侧边栏 */}
        <aside 
          style={{ 
            display: isSidebarOpen ? 'flex' : 'none',
            flexDirection: 'column',
            width: isSidebarOpen ? '400px' : '0',
            minWidth: isSidebarOpen ? '400px' : '0',
            borderRight: '1px solid #e5e7eb'
          }}
          className={`border-r border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0 transition-all duration-300 flex flex-col ${
            isSidebarOpen 
              ? 'w-[400px] md:w-[450px] lg:w-[500px]' 
              : 'w-0 border-0'
          }`}
        >
          {isSidebarOpen && <KnowledgeBase />}
        </aside>

        {/* 移动端侧边栏切换按钮 */}
        <div style={{
          position: 'absolute',
          top: '4rem',
          left: isSidebarOpen ? '400px' : '0.5rem',
          zIndex: 10,
          transition: 'all 0.3s ease'
        }} className={`absolute top-16 z-10 transition-all duration-300 ${
          isSidebarOpen 
            ? 'left-[400px] md:left-[450px] lg:left-[500px]' 
            : 'left-2'
        }`}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700"
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? "关闭侧边栏" : "打开侧边栏"}
          >
            {isSidebarOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* 聊天区域 */}
        <main style={{ flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="flex-1 transition-all duration-300">
          <ChatInterface />
        </main>
      </div>
    </div>
  );
} 