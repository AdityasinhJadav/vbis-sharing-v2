/**
 * Custom hook for optimistic updates
 * Updates UI immediately, then reverts if operation fails
 */
import { useState, useCallback } from 'react';

export function useOptimisticUpdate(initialState, updateFn) {
  const [state, setState] = useState(initialState);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const optimisticUpdate = useCallback(async (optimisticState, asyncFn) => {
    // Save current state for rollback
    const previousState = state;
    
    // Optimistically update UI
    setState(optimisticState);
    setError(null);
    setIsLoading(true);
    
    try {
      // Perform async operation
      const result = await asyncFn();
      
      // Update with actual result
      if (updateFn) {
        setState(updateFn(state, result));
      } else {
        setState(result);
      }
      
      setIsLoading(false);
      return result;
    } catch (err) {
      // Rollback on error
      setState(previousState);
      setError(err);
      setIsLoading(false);
      throw err;
    }
  }, [state, updateFn]);

  return { state, error, isLoading, optimisticUpdate, setState };
}

