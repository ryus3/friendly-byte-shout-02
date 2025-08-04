import { useApi } from '@/hooks/useApi';
import { useEffect } from 'react';
import { useInventory } from '@/contexts/InventoryContext';

export const useProducts = () => {
  const { data: products, loading, error, refresh } = useApi('getProducts');
  const { setProducts } = useInventory();

  // مزامنة البيانات مع context المخزون
  useEffect(() => {
    if (products) {
      setProducts(products);
    }
  }, [products, setProducts]);

  return {
    products,
    loading,
    error,
    refresh
  };
};
