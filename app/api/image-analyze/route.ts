/**
 * This is the preferred server-side implementation for image analysis using ARK API.
 * However, due to Vercel's 25-second timeout limit for serverless functions,
 * and the fact that image analysis typically takes longer than this threshold,
 * this implementation is currently not in use.
 * 
 * Instead, we're using a direct client-side implementation (see lib/ark-api.ts)
 * that bypasses the timeout limitation, though this approach exposes the API key
 * in the frontend code.
 * 
 * TODO: Implement a more secure solution that doesn't expose the API key
 * while still handling long-running image analysis requests.
 */

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { imageUrl, prompt } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'imageUrl is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const API_KEY = process.env.ARK_API_KEY;
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ARK_API_KEY is not set in environment variables' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'doubao-1-5-vision-pro-32k-250115',
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return new Response(
        JSON.stringify({ error: `API request failed: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    const analysisContent = data.choices[0]?.message?.content || '';
    
    return new Response(
      JSON.stringify({ description: analysisContent }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error processing image analysis request:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process image analysis request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}