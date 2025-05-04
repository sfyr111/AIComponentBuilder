import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export const runtime = 'edge';

// Define request handler function
export async function POST(req: Request) {
  try {
    // Parse request body
    const { messages, systemPrompt, model = 'deepseek-v3-250324' } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages are required and must be an array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize OpenAI client (for ARK API - DeepSeek models)
    const arkClient = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_ARK_API_KEY || '',
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    });

    // Format messages
    const formattedMessages: ChatCompletionMessageParam[] = messages.map((message: { content: string; role: string }) => {
      return {
        content: message.content,
        role: message.role as 'user' | 'assistant' | 'system',
      };
    });

    // Add system prompt to the beginning of messages if provided
    if (systemPrompt) {
      formattedMessages.unshift({
        content: systemPrompt,
        role: 'system',
      });
    }

    // Call the model
    const stream = await arkClient.chat.completions.create({
      model: model,
      messages: formattedMessages,
      stream: true,
    });

    // Convert OpenAI stream to ReadableStream
    const textEncoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const part of stream) {
          const text = part.choices[0]?.delta?.content || '';
          if (text) {
            controller.enqueue(textEncoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }
        controller.enqueue(textEncoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
    
  } catch (error) {
    console.error('Error processing chat request:', error);
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
