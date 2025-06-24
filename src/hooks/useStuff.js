import { useState, useCallback } from 'react';

export default function useStuff() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [failed, setFailed] = useState(false);

  const fetchStuff = useCallback(async () => {
    setLoading(true);
    setSuccess(false);
    setFailed(false);
    
    try {
      const response = await fetch('http://localhost/api/stuff');
      if (response.ok) {
        setSuccess(true);
        return { success: true, response };
      } else {
        return { success: false, response };
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setFailed(true);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  return { 
    loading, 
    success, 
    failed, 
    fetchStuff 
  };
}