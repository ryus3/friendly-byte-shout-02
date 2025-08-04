import { supabase } from '@/lib/customSupabaseClient';

// خدمة مركزية لجميع عمليات API
class ApiService {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  // إدارة الذاكرة المؤقتة
  setCacheItem(key, data, ttl = 300000) { // 5 minutes default TTL
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }

  getCacheItem(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  // تجنب التكرار في الطلبات المتزامنة
  async dedupeRequest(key, requestFn) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  // المنتجات
  async getProducts(options = {}) {
    const cacheKey = `products-${JSON.stringify(options)}`;
    const cached = this.getCacheItem(cacheKey);
    if (cached) return cached;

    return this.dedupeRequest(cacheKey, async () => {
      const { data, error } = await supabase
        .from('products')
        .select(\`
          *,
          category:categories(name),
          variants:product_variants(
            *,
            color:colors(name, hex_code),
            size:sizes(name)
          ),
          inventory(quantity, reserved_quantity, min_stock)
        \`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.setCacheItem(cacheKey, data);
      return data;
    });
  }

  // الطلبات
  async getOrders(options = {}) {
    const cacheKey = `orders-${JSON.stringify(options)}`;
    const cached = this.getCacheItem(cacheKey);
    if (cached) return cached;

    return this.dedupeRequest(cacheKey, async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(\`
          *,
          customer:customers(name, phone),
          items:order_items(
            *,
            product:products(name),
            variant:product_variants(
              *,
              color:colors(name),
              size:sizes(name)
            )
          ),
          creator:profiles!orders_created_by_fkey(full_name),
          assigned:profiles!orders_assigned_to_fkey(full_name)
        \`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.setCacheItem(cacheKey, data);
      return data;
    });
  }

  // المخزون
  async getInventory(options = {}) {
    const cacheKey = `inventory-${JSON.stringify(options)}`;
    const cached = this.getCacheItem(cacheKey);
    if (cached) return cached;

    return this.dedupeRequest(cacheKey, async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(\`
          *,
          product:products(name, barcode),
          variant:product_variants(
            *,
            color:colors(name),
            size:sizes(name)
          )
        \`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      this.setCacheItem(cacheKey, data);
      return data;
    });
  }

  // تحديث البيانات
  async invalidateCache(pattern) {
    for (const key of this.cache.keys()) {
      if (pattern instanceof RegExp ? pattern.test(key) : key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // مزامنة البيانات
  setupRealtimeSync() {
    const channels = [
      supabase
        .channel('products-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, 
          () => this.invalidateCache('products')),

      supabase
        .channel('orders-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' },
          () => this.invalidateCache('orders')),

      supabase
        .channel('inventory-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' },
          () => this.invalidateCache('inventory'))
    ];

    channels.forEach(channel => channel.subscribe());
    return () => channels.forEach(channel => supabase.removeChannel(channel));
  }
}

export const apiService = new ApiService();
