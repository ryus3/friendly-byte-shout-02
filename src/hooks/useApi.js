import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

export const useApi = (endpoint, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiService[endpoint](options);
        setData(result);
      } catch (err) {
        setError(err);
        console.error(`Error fetching ${endpoint}:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, JSON.stringify(options)]);

  const refresh = async () => {
    await apiService.invalidateCache(endpoint);
    try {
      setLoading(true);
      const result = await apiService[endpoint](options);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refresh };
};
