import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook to prevent double submission of forms
 * Returns [isProcessing, withProcessing] where:
 * - isProcessing: boolean flag indicating if an operation is in progress
 * - withProcessing: wrapper function that prevents concurrent executions
 */
export const usePreventDoubleSubmit = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  const withProcessing = useCallback(async (asyncFunction) => {
    // Prevent double submission
    if (processingRef.current) {
      console.warn('[usePreventDoubleSubmit] Operation already in progress, ignoring duplicate request');
      return null;
    }

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const result = await asyncFunction();
      return result;
    } catch (error) {
      console.error('[usePreventDoubleSubmit] Operation failed:', error);
      throw error;
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  return [isProcessing, withProcessing];
};

export default usePreventDoubleSubmit;
