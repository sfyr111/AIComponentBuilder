import { useState, useCallback } from 'react';
import { analyzeImageDirect } from '@/lib/ark-api';

export type ImageAnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Custom React Hook for performing image analysis
 * 
 * WARNING: This hook directly calls the ARK API using NEXT_PUBLIC_ARK_API_KEY environment variable
 * This is a potentially dangerous approach used to bypass Vercel's 25s timeout limitations on serverless functions
 * The API key is exposed in the frontend code, which is a security risk
 * This should only be used in development or with proper security measures in place
 */
export function useImageAnalysis() {
  const [status, setStatus] = useState<ImageAnalysisStatus>('idle');
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const analyzeImage = useCallback(async (imageUrl: string, prompt: string) => {
    setStatus('loading');
    setError(null);
    setResult('');
    
    try {
      const apiResult = await analyzeImageDirect({ imageUrl, prompt });
      
      if (apiResult.error) {
        setError(apiResult.error);
        setStatus('error');
        return null;
      }
      
      setResult(apiResult.description);
      setStatus('success');
      return apiResult.description;
      
    } catch (err) {
      console.error('Image analysis error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
      return null;
    }
  }, []);

  return {
    analyzeImage,
    status,
    result,
    error,
    isReady: process.env.NEXT_PUBLIC_ARK_API_KEY ? true : false,
  };
} 