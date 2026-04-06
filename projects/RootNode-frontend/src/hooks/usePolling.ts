import { useState, useEffect, useRef, useCallback } from 'react';

export interface PollingState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  lastUpdated: Date | null;
}

export const usePolling = <T,>(
  fetchFn: () => Promise<{ data: T }>, 
  intervalMs = 3000, 
  mockData?: T
): PollingState<T> => {
  const [data, setData] = useState<T | null>(mockData || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetchRef = useRef(fetchFn);
  const mockRef = useRef(mockData);
  const offlineCountRef = useRef(0);

  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    mockRef.current = mockData;
  }, [mockData]);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetchRef.current();
      if (response?.data) {
        setData(response.data);
        setLastUpdated(new Date());
        setError(null);
        setIsOffline(false);
        offlineCountRef.current = 0;
      }
    } catch (err: unknown) {
      const errorObj = err as { offline?: boolean; message?: string };
      
      if (errorObj.offline) {
        offlineCountRef.current++;
        
        if (offlineCountRef.current >= 3) {
          setIsOffline(true);
          setError(errorObj.message || 'Backend offline');
        }
        
        if (mockRef.current !== undefined) {
          setData(mockRef.current);
        }
      } else {
        setError(errorObj.message || 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, intervalMs);
    return () => clearInterval(intervalId);
  }, [fetchData, intervalMs]);

  return { data, loading, error, isOffline, lastUpdated };
};
