'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Send, Bot, Sparkles, User, MoreHorizontal, Loader2, ChevronDown, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, reload, stop } = useChat({
    api: '/api/chat',
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  
  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // 复制文本到剪贴板
  const copyToClipboard = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(messageId);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* 聊天标题 */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Bot className="h-6 w-6 text-blue-500" />
              <span>DeepSeek 智能助手</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              基于您的知识库进行对话，为您提供精准的回答
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-slate-600 dark:text-slate-300">
              <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
              升级到专业版
            </Button>
          </div>
        </div>
      </div>
      
      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-slate-900">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-6">
              <Bot className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-slate-800 dark:text-slate-200">欢迎使用 DeepSeek RAG 智能助手</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mb-8">
              上传文档到知识库，然后向我提问。我会基于您的知识库和我的能力，为您提供最准确的回答。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-2 flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                  我能为您做什么
                </h3>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• 回答基于您文档的问题</li>
                  <li>• 总结长文档要点</li>
                  <li>• 解释复杂概念</li>
                  <li>• 提供相关建议</li>
                </ul>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-2 flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                  如何获得最佳体验
                </h3>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• 上传高质量的文档</li>
                  <li>• 提出具体的问题</li>
                  <li>• 使用简明的语言</li>
                  <li>• 可以连续提问</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isUser = message.role === 'user';
            
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}
              >
                <div
                  className={`flex max-w-[90%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div 
                    className={`flex items-center justify-center h-8 w-8 rounded-full flex-shrink-0 ${
                      isUser 
                        ? 'bg-blue-500 ml-3' 
                        : 'bg-slate-700 dark:bg-slate-600 mr-3'
                    }`}
                  >
                    {isUser ? (
                      <User className="h-5 w-5 text-white" />
                    ) : (
                      <Bot className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div
                    className={`relative rounded-2xl p-4 shadow-sm ${
                      isUser
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    {message.content && message.content.length > 0 ? (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    ) : message.role === 'assistant' && message.toolInvocations && message.toolInvocations.length > 0 ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                        {message.toolInvocations[0].toolName === 'addResource' ? (
                          <span>正在将信息添加到知识库...</span>
                        ) : message.toolInvocations[0].toolName === 'getInformation' ? (
                          <span>正在查询知识库中的相关信息...</span>
                        ) : (
                          <span>正在处理信息...</span>
                        )}
                      </div>
                    ) : null}
                    
                    {/* 消息操作菜单 */}
                    <div className={`absolute ${isUser ? 'left-0' : 'right-0'} -top-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full bg-white dark:bg-slate-700 shadow-sm border border-gray-200 dark:border-slate-600"
                              onClick={() => copyToClipboard(message.content, message.id)}
                            >
                              {copied === message.id ? (
                                <span className="text-green-500 text-xs">已复制</span>
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>复制内容</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder="输入您的问题..."
              className="w-full p-3 pr-12 min-h-[56px] max-h-32 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) {
                    handleSubmit(e as any);
                  }
                }
              }}
              rows={1}
            />
            {!isLoading && (
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute bottom-2 right-2 p-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {isLoading && (
            <Button
              type="button"
              onClick={() => stop()}
              className="p-3 h-[56px] rounded-md bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center gap-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              停止生成
            </Button>
          )}
          
          {messages.length > 0 && !isLoading && (
            <Button
              type="button"
              onClick={() => reload()}
              className="p-3 h-[56px] rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              重新回答
            </Button>
          )}
        </form>
        
        {messages.length > 0 && (
          <div className="text-xs text-center mt-2 text-slate-500 dark:text-slate-400">
            DeepSeek 助手基于您的知识库生成答案。如需更精确的回答，请上传相关文档。
          </div>
        )}
      </div>
    </div>
  );
} 