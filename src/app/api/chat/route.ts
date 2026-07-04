import { google } from '@ai-sdk/google';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { PERSONA_SYSTEM_PROMPT } from '@/lib/persona';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: PERSONA_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    temperature: 0.9,
  });
  return result.toUIMessageStreamResponse();
}
