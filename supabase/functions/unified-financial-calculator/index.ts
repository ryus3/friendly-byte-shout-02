import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { dateRange, userId } = await req.json()

    console.log('📊 Computing unified financial calculations:', { dateRange, userId })

    // جلب جميع البيانات المطلوبة
    const [
      { data: orders },
      { data: profits },
      { data: expenses },
      { data: purchases },
      { data: products },
      { data: settings }
    ] = await Promise.all([
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
    ])

    // تحويل الإعدادات لكائن
    const settingsObj = {}
    settings?.forEach(setting => {
      settingsObj[setting.key] = setting.value
    })

    const initialCapital = Number(settingsObj.initial_capital || 0)
    const deliveryFee = Number(settingsObj.delivery_fee || 5000)

    // فلترة البيانات حسب التاريخ
    const filterByDate = (itemDateStr: string) => {
      if (!dateRange?.from || !dateRange?.to || !itemDateStr) return true
      try {
        const itemDate = new Date(itemDateStr)
        const fromDate = new Date(dateRange.from)
        const toDate = new Date(dateRange.to)
        return itemDate >= fromDate && itemDate <= toDate
      } catch (e) {
        return true
      }
    }

    // الطلبات المسلمة فعلياً (تم التسليم + استلام الفاتورة)
    const deliveredOrders = (orders || []).filter(order => {
      const isDelivered = order.status === 'delivered' || order.status === 'completed'
      const isReceiptReceived = order.receipt_received === true
      const isInDateRange = filterByDate(order.updated_at || order.created_at)
      
      return isDelivered && isReceiptReceived && isInDateRange
    })

    console.log('📦 Delivered orders found:', deliveredOrders.length)

    // فصل طلبات المدير والموظفين
    const managerOrders = deliveredOrders.filter(order => !order.created_by || order.created_by === 'manager')
    const employeeOrders = deliveredOrders.filter(order => order.created_by && order.created_by !== 'manager')

    // حساب إيرادات المدير (تدخل كاملة للنظام)
    const managerRevenue = managerOrders.reduce((sum, order) => {
      const totalAmount = order.final_amount || order.total_amount || 0
      return sum + (totalAmount - deliveryFee) // استبعاد أجور التوصيل
    }, 0)

    // حساب تكلفة البضاعة للمدير
    const managerCOGS = managerOrders.reduce((sum, order) => {
      if (!order.order_items || !Array.isArray(order.order_items)) return sum
      
      return sum + order.order_items.reduce((itemSum, item) => {
        const costPrice = item.product_variants?.cost_price || item.products?.cost_price || 0
        const quantity = item.quantity || 0
        return itemSum + (costPrice * quantity)
      }, 0)
    }, 0)

    // ربح المدير الكامل (يذهب للنظام)
    const managerProfit = managerRevenue - managerCOGS

    // حساب إيرادات الموظفين (تقسم حسب القواعد)
    const employeeRevenue = employeeOrders.reduce((sum, order) => {
      const totalAmount = order.final_amount || order.total_amount || 0
      return sum + (totalAmount - deliveryFee) // استبعاد أجور التوصيل
    }, 0)

    // حساب تكلفة البضاعة للموظفين
    const employeeCOGS = employeeOrders.reduce((sum, order) => {
      if (!order.order_items || !Array.isArray(order.order_items)) return sum
      
      return sum + order.order_items.reduce((itemSum, item) => {
        const costPrice = item.product_variants?.cost_price || item.products?.cost_price || 0
        const quantity = item.quantity || 0
        return itemSum + (costPrice * quantity)
      }, 0)
    }, 0)

    // إجمالي ربح الموظفين (قبل التقسيم)
    const totalEmployeeProfit = employeeRevenue - employeeCOGS

    // حساب مستحقات الموظفين من جدول الأرباح
    const employeeDues = (profits || [])
      .filter(profit => {
        const order = deliveredOrders.find(o => o.id === profit.order_id)
        return order && filterByDate(order.updated_at || order.created_at)
      })
      .reduce((sum, profit) => sum + (profit.employee_profit || 0), 0)

    // ربح النظام من طلبات الموظفين
    const systemProfitFromEmployees = totalEmployeeProfit - employeeDues

    // إجمالي ربح النظام
    const totalSystemProfit = managerProfit + systemProfitFromEmployees

    // المصاريف العامة (مفلترة حسب التاريخ)
    const generalExpenses = (expenses || [])
      .filter(expense => {
        if (!filterByDate(expense.transaction_date)) return false
        if (expense.expense_type === 'system') return false
        if (expense.category === 'مستحقات الموظفين') return false
        if (expense.related_data?.category === 'شراء بضاعة') return false
        return true
      })
      .reduce((sum, expense) => sum + (expense.amount || 0), 0)

    // المشتريات (مفلترة حسب التاريخ)
    const totalPurchases = (purchases || [])
      .filter(purchase => filterByDate(purchase.created_at))
      .reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0)

    // قيمة المخزون الحقيقية
    const inventoryValue = (products || []).reduce((sum, product) => {
      if (!product.variants || !Array.isArray(product.variants)) return sum
      
      return sum + product.variants.reduce((variantSum, variant) => {
        const quantity = variant.quantity || 0
        const costPrice = variant.cost_price || product.cost_price || 0
        return variantSum + (quantity * costPrice)
      }, 0)
    }, 0)

    // صافي الربح الحقيقي
    const netProfit = totalSystemProfit - generalExpenses

    // رصيد القاصة الرئيسية الحقيقي
    const mainCashBalance = initialCapital + netProfit - totalPurchases

    // إجمالي الإيرادات
    const totalRevenue = managerRevenue + employeeRevenue
    const totalCOGS = managerCOGS + employeeCOGS
    const grossProfit = totalRevenue - totalCOGS

    const result = {
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
      deliveredOrdersCount: deliveredOrders.length,
      managerOrdersCount: managerOrders.length,
      employeeOrdersCount: employeeOrders.length,
      
      // الإعدادات
      deliveryFee,
      initialCapital,
      
      // معلومات إضافية
      dateRange,
      calculatedAt: new Date().toISOString()
    }

    console.log('💰 Financial calculations completed:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )

  } catch (error) {
    console.error('❌ Error in unified financial calculator:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to calculate unified financial data'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      },
    )
  }
})