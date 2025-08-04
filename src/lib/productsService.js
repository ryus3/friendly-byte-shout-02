import { supabase } from '@/lib/customSupabaseClient';

// جلب جميع المنتجات مع إمكانية الفلترة
export async function getProducts(filters = {}) {
  return await supabase.from('products').select('*').match(filters);
}

// جلب منتج واحد حسب ID
export async function getProductById(id) {
  return await supabase.from('products').select('*').eq('id', id).single();
}

// إضافة منتج جديد
export async function createProduct(data) {
  return await supabase.from('products').insert([data]);
}

// تعديل منتج
export async function updateProduct(id, data) {
  return await supabase.from('products').update(data).eq('id', id);
}

// حذف منتج
export async function deleteProduct(id) {
  return await supabase.from('products').delete().eq('id', id);
}

// جلب جميع المتغيرات
export async function getVariants(filters = {}) {
  return await supabase.from('product_variants').select('*').match(filters);
}

// إضافة متغير جديد
export async function createVariant(data) {
  return await supabase.from('product_variants').insert([data]);
}

// تعديل متغير
export async function updateVariant(id, data) {
  return await supabase.from('product_variants').update(data).eq('id', id);
}

// حذف متغير
export async function deleteVariant(id) {
  return await supabase.from('product_variants').delete().eq('id', id);
}

// جلب الجرد التفصيلي
export async function getInventory(filters = {}) {
  return await supabase.from('inventory').select('*').match(filters);
}

// تحديث الجرد
export async function updateInventory(id, data) {
  return await supabase.from('inventory').update(data).eq('id', id);
}
