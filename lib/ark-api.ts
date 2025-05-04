type ImageAnalysisRequest = {
  imageUrl: string;
  prompt: string;
};

type ImageAnalysisResponse = {
  description: string;
  error?: string;
};

/**
 * Direct ARK API integration for image analysis
 * 
 * WARNING: This is a potentially dangerous approach that exposes the API key in frontend code.
 * This is only implemented to bypass Vercel's 25-second serverless function timeout limit,
 * as image analysis operations typically take longer than this threshold.
 * 
 * In a production environment, this should be replaced with a more secure approach,
 * such as using a backend proxy or implementing proper API key management.
 */

export async function analyzeImageDirect(
  request: ImageAnalysisRequest
): Promise<ImageAnalysisResponse> {
  const { imageUrl, prompt } = request;
  const API_KEY = process.env.NEXT_PUBLIC_ARK_API_KEY || '';

  if (!imageUrl) {
    throw new Error('Image URL is required');
  }

  if (!API_KEY) {
    throw new Error('API key is not available in NEXT_PUBLIC_ARK_API_KEY');
  }

  try {
    console.log('Calling ARK API for image analysis...');
    
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
      console.error('ARK API error:', errorText);
      return {
        description: '',
        error: `API request failed with status: ${response.status}`
      };
    }

    const data = await response.json();
    const analysisContent = data.choices[0]?.message?.content || '';
    
    return {
      description: analysisContent
    };
  } catch (error) {
    console.error('Direct image analysis error:', error);
    return {
      description: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 