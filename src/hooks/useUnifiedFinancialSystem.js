import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { parseISO, isValid } from 'date-fns';
import { toast } from '@/hooks/use-toast';

/**
 * النظام المالي الموحد الصحيح - مصدر واحد للحقيقة المالية
 * يدير: رأس المال، الطلبات، الأرباح، القاصة، المشتريات، المصاريف
 */
export const useUnifiedFinancialSystem = (dateRange = null) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // البيانات الأساسية
  const [initialCapital, setInitialCapital] = useState(0);
  const [orders, setOrders] = useState([]);
  const [profits, setProfits] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});

  // إعداد التوصيل من الإعدادات
  const deliveryFee = settings.delivery_fee || 5000;

  // فلترة البيانات حسب التاريخ
  const filterByDate = (itemDateStr) => {
    if (!dateRange?.from || !dateRange?.to || !itemDateStr) return true;
    try {
      const itemDate = parseISO(itemDateStr);
      return isValid(itemDate) && itemDate >= dateRange.from && itemDate <= dateRange.to;
    } catch (e) {
      return true;
    }
  };

  // جلب جميع البيانات المالية
  const fetchAllFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        { data: capitalData },
        { data: ordersData }, 
        { data: profitsData },
        { data: expensesData },
        { data: purchasesData },
        { data: productsData },
        { data: settingsData }
      ] = await Promise.all([
        supabase.from('settings').select('*').eq('key', 'initial_capital').single(),
        supabase.from('orders').select(`
          *,
          order_items (
            *,
            product_variants (cost_price, price),
            products (cost_price, base_price)
          )
        `),
        supabase.from('profits').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('purchases').select('*'),
        supabase.from('products').select(`
          *,
          variants:product_variants (*)
        `),
        supabase.from('settings').select('*')
      ]);

      // تحديث البيانات
      setInitialCapital(Number(capitalData?.value || 0));
      setOrders(ordersData || []);
      setProfits(profitsData || []);
      setExpenses(expensesData || []);
      setPurchases(purchasesData || []);
      setProducts(productsData || []);
      
      // تحويل الإعدادات لكائن
      const settingsObj = {};
      (settingsData || []).forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });
      setSettings(settingsObj);

      console.log('💰 تم جلب البيانات المالية الموحدة بنجاح');
      
    } catch (err) {
      console.error('❌ خطأ في جلب البيانات المالية:', err);
      setError(err.message);
      toast({
        title: "خطأ",
        description: "فشل في جلب البيانات المالية",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // الحسابات المالية الصحيحة
  const financialCalculations = useMemo(() => {
    // الطلبات المسلمة فعلياً (تم التسليم + استلام الفاتورة)
    const deliveredOrders = orders.filter(order => {
      const isDelivered = order.status === 'delivered' || order.status === 'completed';
      const isReceiptReceived = order.receipt_received === true;
      const isInDateRange = filterByDate(order.updated_at || order.created_at);
      
      return isDelivered && isReceiptReceived && isInDateRange;
    });

    console.log('📦 الطلبات المسلمة فعلياً:', deliveredOrders.length);

    // فصل طلبات المدير والموظفين
    const managerOrders = deliveredOrders.filter(order => !order.created_by || order.created_by === 'manager');
    const employeeOrders = deliveredOrders.filter(order => order.created_by && order.created_by !== 'manager');

    // حساب إيرادات المدير (تدخل كاملة للنظام)
    const managerRevenue = managerOrders.reduce((sum, order) => {
      const totalAmount = order.final_amount || order.total_amount || 0;
      return sum + (totalAmount - deliveryFee); // استبعاد أجور التوصيل
    }, 0);

    // حساب تكلفة البضاعة للمدير
    const managerCOGS = managerOrders.reduce((sum, order) => {
      if (!order.order_items || !Array.isArray(order.order_items)) return sum;
      
      return sum + order.order_items.reduce((itemSum, item) => {
        const costPrice = item.product_variants?.cost_price || item.products?.cost_price || 0;
        const quantity = item.quantity || 0;
        return itemSum + (costPrice * quantity);
      }, 0);
    }, 0);

    // ربح المدير الكامل (يذهب للنظام)
    const managerProfit = managerRevenue - managerCOGS;

    // حساب إيرادات الموظفين (تقسم حسب القواعد)
    const employeeRevenue = employeeOrders.reduce((sum, order) => {
      const totalAmount = order.final_amount || order.total_amount || 0;
      return sum + (totalAmount - deliveryFee); // استبعاد أجور التوصيل
    }, 0);

    // حساب تكلفة البضاعة للموظفين
    const employeeCOGS = employeeOrders.reduce((sum, order) => {
      if (!order.order_items || !Array.isArray(order.order_items)) return sum;
      
      return sum + order.order_items.reduce((itemSum, item) => {
        const costPrice = item.product_variants?.cost_price || item.products?.cost_price || 0;
        const quantity = item.quantity || 0;
        return itemSum + (costPrice * quantity);
      }, 0);
    }, 0);

    // إجمالي ربح الموظفين (قبل التقسيم)
    const totalEmployeeProfit = employeeRevenue - employeeCOGS;

    // حساب مستحقات الموظفين من جدول الأرباح
    const employeeDues = profits
      .filter(profit => {
        const order = deliveredOrders.find(o => o.id === profit.order_id);
        return order && filterByDate(order.updated_at || order.created_at);
      })
      .reduce((sum, profit) => sum + (profit.employee_profit || 0), 0);

    // ربح النظام من طلبات الموظفين
    const systemProfitFromEmployees = totalEmployeeProfit - employeeDues;

    // إجمالي ربح النظام
    const totalSystemProfit = managerProfit + systemProfitFromEmployees;

    // المصاريف العامة (مفلترة حسب التاريخ)
    const generalExpenses = expenses
      .filter(expense => {
        if (!filterByDate(expense.transaction_date)) return false;
        if (expense.expense_type === 'system') return false;
        if (expense.category === 'مستحقات الموظفين') return false;
        if (expense.related_data?.category === 'شراء بضاعة') return false;
        return true;
      })
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    // المشتريات (مفلترة حسب التاريخ)
    const totalPurchases = purchases
      .filter(purchase => filterByDate(purchase.created_at))
      .reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0);

    // قيمة المخزون الحقيقية
    const inventoryValue = products.reduce((sum, product) => {
      if (!product.variants || !Array.isArray(product.variants)) return sum;
      
      return sum + product.variants.reduce((variantSum, variant) => {
        const quantity = variant.quantity || 0;
        const costPrice = variant.cost_price || product.cost_price || 0;
        return variantSum + (quantity * costPrice);
      }, 0);
    }, 0);

    // صافي الربح الحقيقي
    const netProfit = totalSystemProfit - generalExpenses;

    // رصيد القاصة الرئيسية الحقيقي
    const mainCashBalance = initialCapital + netProfit - totalPurchases;

    // إجمالي الإيرادات
    const totalRevenue = managerRevenue + employeeRevenue;
    const totalCOGS = managerCOGS + employeeCOGS;
    const grossProfit = totalRevenue - totalCOGS;

    return {
      // الإيرادات والتكاليف
      totalRevenue,
      managerRevenue,
      employeeRevenue,
      totalCOGS,
      managerCOGS,
      employeeCOGS,
      grossProfit,
      
      // الأرباح
      managerProfit,
      totalEmployeeProfit,
      employeeDues,
      systemProfitFromEmployees,
      totalSystemProfit,
      netProfit,
      
      // المصاريف والمشتريات
      generalExpenses,
      totalPurchases,
      
      // الأصول والقاصة
      inventoryValue,
      mainCashBalance,
      totalAssets: mainCashBalance + inventoryValue,
      
      // الطلبات
      deliveredOrders,
      managerOrders,
      employeeOrders,
      
      // الإعدادات
      deliveryFee,
      initialCapital
    };
  }, [orders, profits, expenses, purchases, products, initialCapital, settings, dateRange]);

  // تحديث رأس المال
  const updateCapital = async (newCapital) => {
    try {
      const { error } = await supabase
        .from('settings')
        .update({ 
          value: Number(newCapital),
          updated_at: new Date().toISOString()
        })
        .eq('key', 'initial_capital');

      if (error) throw error;

      setInitialCapital(Number(newCapital));
      
      toast({
        title: "تم التحديث",
        description: "تم تحديث رأس المال بنجاح",
      });

      return { success: true };
    } catch (error) {
      console.error('خطأ في تحديث رأس المال:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث رأس المال",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // إعادة تحميل البيانات
  const refreshData = () => {
    fetchAllFinancialData();
  };

  // جلب البيانات عند التحميل
  useEffect(() => {
    fetchAllFinancialData();
  }, []);

  // الاشتراك في التحديثات الفورية
  useEffect(() => {
    const subscriptions = [
      supabase
        .channel('orders_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refreshData)
        .subscribe(),
      
      supabase
        .channel('profits_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profits' }, refreshData)
        .subscribe(),
      
      supabase
        .channel('expenses_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, refreshData)
        .subscribe(),
      
      supabase
        .channel('purchases_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, refreshData)
        .subscribe(),
      
      supabase
        .channel('settings_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, refreshData)
        .subscribe()
    ];

    return () => {
      subscriptions.forEach(sub => supabase.removeChannel(sub));
    };
  }, []);

  return {
    loading,
    error,
    ...financialCalculations,
    updateCapital,
    refreshData,
    
    // البيانات الخام للمكونات التي تحتاجها
    rawData: {
      orders,
      profits,
      expenses,
      purchases,
      products,
      settings
    }
  };
};

export default useUnifiedFinancialSystem;