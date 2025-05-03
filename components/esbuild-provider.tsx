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

// Simple code transformation cache - using hash value as key
const codeCache = new Map<string, { code: string; timestamp: number }>();
const CACHE_EXPIRY = 1000 * 60 * 5; // 5 minutes cache expiry
const MAX_CACHE_SIZE = 100; // Limit cache size

// Function to clean up expired cache
const cleanupExpiredCache = () => {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  // Find all expired keys
  for (const [key, value] of codeCache.entries()) {
    if (now - value.timestamp > CACHE_EXPIRY) {
      expiredKeys.push(key);
    }
  }
  
  // Delete expired keys
  for (const key of expiredKeys) {
    codeCache.delete(key);
  }
  
  // If cache is still too large, delete oldest entries
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
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function - only used when component unmounts
  const cleanupService = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    
    // Only stop service when component unmounts
    if (typeof window !== 'undefined' && cacheCleanupInterval) {
      clearInterval(cacheCleanupInterval);
    }
  }, []);

  // Initialize esbuild
  const initializeEsbuild = useCallback(async () => {
    // Don't initialize if already initializing or completed
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
        initializedRef.current = false; // Ensure can retry after timeout
      }, 10000); // 10 second timeout
      
      timeoutIdRef.current = timeout;

      // Use local WASM file
      try {
        await esbuild.initialize({
          wasmURL: '/esbuild.wasm',
          worker: false // Disable worker mode to avoid cross-origin issues
        });
        
        setEsbuildService(esbuild);
        setIsInitializing(false);
        setHasError(false);
        initializedRef.current = true;
        
        // Clear timeout
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }
        
        console.log('esbuild initialized successfully');
      } catch (error: unknown) {
        // Check if it's an "already initialized" error, which we can treat as success
        if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('initialize') && error.message.includes('once')) {
          console.log('esbuild already initialized, treating as success');
          setEsbuildService(esbuild);
          setIsInitializing(false);
          setHasError(false);
          initializedRef.current = true;
        } else {
          throw error; // Rethrow other types of errors
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
    
    initializedRef.current = false; // Reset initialization state
    setInitializationAttempts(prev => prev + 1);
    initializeEsbuild();
  }, [initializeEsbuild]);

  // Initialize esbuild on initial render - run only once
  useEffect(() => {
    initializeEsbuild();
    
    // Only clean up on unmount, don't stop service on every code change
    return cleanupService;
  }, [initializeEsbuild, cleanupService]);

  // Code transformation function
  const transformCode = useCallback(async (code: string) => {
    // Calculate hash of code as cache key
    const cacheKey = hashString(code);
    
    // Try to get from cache
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
        format: 'esm',
      });
      
      // Cache result - using hash as key
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