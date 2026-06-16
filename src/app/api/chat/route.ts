import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = await streamText({
    model: google('gemini-2.0-flash'), // 使用目前最新的稳定闪电模型
    messages,
  });
  return result.toTextStreamResponse();
}