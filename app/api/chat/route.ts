import { Message } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { streamText, tool } from 'ai';
import { queryDocuments } from '../../../lib/utils/retriever';
import { createResource } from '@/lib/actions/resources';
import { findRelevantContent } from '@/lib/ai/embedding';
import { z } from 'zod';

// 允许流式响应持续30秒
export const maxDuration = 30;

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // 解析请求
    const { messages } = await req.json();
    
    // 创建流式文本响应，包含工具
    const result = streamText({
      model: deepseek('deepseek-chat'),
      messages,
      system: `你是一个基于DeepSeek模型的AI助手，支持用户就各种话题进行交流。

在回答用户问题时，请先检查你的知识库并使用从工具调用中获取的信息。
如果没有从工具调用中找到相关信息，请诚实说明你不知道。`,
      maxSteps: 3, // 允许多步工具调用
      tools: {
        // 添加资源工具
        addResource: tool({
          description: `将资源添加到你的知识库。
          如果用户提供任意信息但没有明确要求，使用此工具而不用询问确认。`,
          parameters: z.object({
            content: z
              .string()
              .describe('要添加到知识库的内容或资源')
          }),
          execute: async ({ content }) => createResource({ content })
        }),
        
        // 获取信息工具
        getInformation: tool({
          description: `从你的知识库获取信息来回答问题。`,
          parameters: z.object({
            question: z.string().describe('用户的问题')
          }),
          execute: async ({ question }) => findRelevantContent(question)
        })
      }
    });

    // 返回流式文本响应
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to chat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 