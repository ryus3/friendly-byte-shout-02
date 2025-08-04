import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { toast } from '@/components/ui/use-toast';

export function useApiQuery(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService[endpoint](options);
      setData(result);
    } catch (err) {
      setError(err);
      toast({
        title: "خطأ في جلب البيانات",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [endpoint, JSON.stringify(options)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await apiService.invalidateCache(endpoint);
    fetchData();
  }, [endpoint, fetchData]);

  return {
    data,
    loading,
    error,
    refresh
  };
}
