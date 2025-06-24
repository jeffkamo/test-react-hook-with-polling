import { useState, useEffect, useRef } from 'react';
import useStuff from './useStuff';

export default function useFetchByPolling(maxAttempts = 10, pollInterval = 1000) {
  const [pollCount, setPollCount] = useState(0);
  const [timeout, setTimeoutState] = useState(false);
  const timeoutRef = useRef(null);
  const { loading, success, failed, fetchStuff } = useStuff();

  useEffect(() => {
    const pollEndpoint = async () => {
      const result = await fetchStuff();
      
      if (result.success) {
        // Stop polling on success
        return;
      }

      // Increment poll count
      setPollCount(prevCount => {
        const newCount = prevCount + 1;
        
        if (newCount >= maxAttempts) {
          // Hit max attempts, set timeout state
          setTimeoutState(true);
          return newCount;
        }
        
        // Schedule next poll
        timeoutRef.current = setTimeout(pollEndpoint, pollInterval);
        return newCount;
      });
    };

    // Start polling
    pollEndpoint();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [maxAttempts, pollInterval, fetchStuff]);

  return { loading, success, failed, timeout, pollCount };
}