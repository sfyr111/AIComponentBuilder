"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import * as esbuild from 'esbuild-wasm';
import { hashString } from '@/lib/utils';

export interface EsbuildContextType {
  esbuildService: typeof esbuild | null;
  transformCode: (code: string) => Promise<{ code: string; error?: string }>;
  isInitializing: boolean;
  hasError: boolean;
  retryInitialization: () => void;
}

const EsbuildContext = createContext<EsbuildContextType | null>(null);

// Code transformation cache
const codeCache = new Map<string, { code: string; timestamp: number }>();
const CACHE_EXPIRY = 1000 * 60 * 5; // 5 minutes cache expiry
const MAX_CACHE_SIZE = 100; // Limit cache size

// Function to clean up expired cache
const cleanupExpiredCache = () => {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  for (const [key, value] of codeCache.entries()) {
    if (now - value.timestamp > CACHE_EXPIRY) {
      expiredKeys.push(key);
    }
  }
  
  for (const key of expiredKeys) {
    codeCache.delete(key);
  }
  
  if (codeCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(codeCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
    const keysToRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE)
      .map(entry => entry[0]);
      
    for (const key of keysToRemove) {
      codeCache.delete(key);
    }
  }
};

// Clean up expired cache every minute
let cacheCleanupInterval: NodeJS.Timeout | null = null;
if (typeof window !== 'undefined') {
  cacheCleanupInterval = setInterval(cleanupExpiredCache, 60000);
}

export function EsbuildProvider({ children }: { children: ReactNode }) {
  const [esbuildService, setEsbuildService] = useState<typeof esbuild | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasError, setHasError] = useState(false);
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function - only used when component unmounts
  const cleanupService = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    
    if (typeof window !== 'undefined' && cacheCleanupInterval) {
      clearInterval(cacheCleanupInterval);
    }
  }, []);

  // Initialize esbuild
  const initializeEsbuild = useCallback(async () => {
    if (initializingRef.current || initializedRef.current) return;
    
    initializingRef.current = true;
    
    try {
      setIsInitializing(true);
      setHasError(false);
      
      // Set timeout to avoid infinite waiting
      const timeout = setTimeout(() => {
        console.error('esbuild initialization timeout');
        setHasError(true);
        setIsInitializing(false);
        initializingRef.current = false;
        initializedRef.current = false;
      }, 10000);
      
      timeoutIdRef.current = timeout;

      try {
        await esbuild.initialize({
          wasmURL: '/esbuild.wasm',
          worker: false
        });
        
        setEsbuildService(esbuild);
        setIsInitializing(false);
        setHasError(false);
        initializedRef.current = true;
        
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }
        
        console.log('esbuild initialized successfully');
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error && 
            typeof error.message === 'string' && 
            error.message.includes('initialize') && 
            error.message.includes('once')) {
          console.log('esbuild already initialized, treating as success');
          setEsbuildService(esbuild);
          setIsInitializing(false);
          setHasError(false);
          initializedRef.current = true;
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('esbuild initialization failed:', error);
      setHasError(true);
      setIsInitializing(false);
      initializedRef.current = false;
    } finally {
      initializingRef.current = false;
    }
  }, []);

  // Retry initialization
  const retryInitialization = useCallback(() => {
    if (initializingRef.current) return;
    
    initializedRef.current = false;
    initializeEsbuild();
  }, [initializeEsbuild]);

  // Initialize esbuild on initial render
  useEffect(() => {
    initializeEsbuild();
    return cleanupService;
  }, [initializeEsbuild, cleanupService]);

  const transformCode = useCallback(async (code: string) => {
    const cacheKey = hashString(code);
    
    const cached = codeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return { code: cached.code };
    }
    
    if (!esbuildService) {
      return { 
        code: "",
        error: "Compilation service not initialized, please retry"
      };
    }

    try {
      const result = await esbuildService.transform(code, {
        loader: 'jsx',         
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
        target: 'es2015',      
        format: 'iife',         
      });
      
      codeCache.set(cacheKey, { 
        code: result.code, 
        timestamp: Date.now() 
      });
      
      return { code: result.code };
    } catch (error) {
      console.error('Code transformation error:', error);
      if (error instanceof Error) {
        return { 
          code: "",
          error: `Compilation error: ${error.message}`
        };
      }
      return { 
        code: "",
        error: "Unknown compilation error"
      };
    }
  }, [esbuildService]);

  return (
    <EsbuildContext.Provider
      value={{
        esbuildService,
        transformCode,
        isInitializing,
        hasError,
        retryInitialization
      }}
    >
      {children}
    </EsbuildContext.Provider>
  );
}

export function useEsbuild() {
  const context = useContext(EsbuildContext);
  if (context === null) {
    throw new Error("useEsbuild must be used within an EsbuildProvider");
  }
  return context;
}

// Bundle and transform function
export async function bundleAndTransform(source: string) {
  const service = await getEsbuildService();
  if (!service) throw new Error('esbuild not initialized');
  
  try {
    const result = await service.build({
      stdin: {
        contents: source,
        resolveDir: '/',
        loader: 'tsx',
      },
      bundle: true,
      platform: 'browser',
      external: ['react', 'react-dom'],
      write: false,
      format: 'iife',
      globalName: 'Sandbox',
      banner: {
        js: [
          'var __window = typeof window !== "undefined" ? window : this;',
          'var React = __window.React, ReactDOM = __window.ReactDOM;'
        ].join('')
      },
      define: {
        'React': 'window.React',
        'ReactDOM': 'window.ReactDOM',
      },
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      target: 'es2015',
    });
    
    // Replace require calls with global variables
    let out = result.outputFiles[0].text;
    out = out
      .replace(/require\(\s*['"]react['"]\s*\)/g, 'window.React')
      .replace(/require\(\s*['"]react-dom['"]\s*\)/g, 'window.ReactDOM');
    
    return out;
  } catch (error) {
    console.error('Bundle error:', error);
    if (error instanceof Error) {
      throw new Error(`Bundle error: ${error.message}`);
    }
    throw new Error('Unknown bundle error');
  }
}

// Helper function to get esbuild service instance
async function getEsbuildService(): Promise<typeof esbuild | null> {
  try {
    await esbuild.initialize({
      wasmURL: '/esbuild.wasm',
      worker: false
    });
    console.log('esbuild initialized on demand');
  } catch (error) {
    if (error && typeof error === 'object' && 'message' in error && 
        typeof error.message === 'string' && 
        error.message.includes('initialize') && 
        error.message.includes('once')) {
      console.log('esbuild already initialized');
    } else {
      console.error('Failed to initialize esbuild:', error);
      return null;
    }
  }
  
  return esbuild;
}