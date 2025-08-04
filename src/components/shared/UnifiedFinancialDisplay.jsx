import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ShoppingCart, 
  Package,
  DollarSign,
  Users,
  User,
  Target,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * مكون عرض البيانات المالية الموحد
 * يستخدم النظام المالي الموحد لعرض البيانات بطريقة متسقة
 */
const UnifiedFinancialDisplay = ({
  financialData,
  mode = 'overview', // overview, dashboard, accounting
  className = '',
  onCardClick = () => {},
  showDetails = false
}) => {
  
  if (!financialData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-IQ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0) + ' د.ع';
  };

  // كروت النظرة العامة
  const overviewCards = [
    {
      key: 'capital',
      title: 'رأس المال',
      value: financialData.initialCapital,
      icon: DollarSign,
      color: 'bg-gradient-to-br from-blue-600 to-blue-700',
      description: 'رأس المال المستثمر',
      onClick: () => onCardClick('capital')
    },
    {
      key: 'netProfit',
      title: 'صافي الربح',
      value: financialData.netProfit,
      icon: TrendingUp,
      color: financialData.netProfit >= 0 
        ? 'bg-gradient-to-br from-green-600 to-green-700'
        : 'bg-gradient-to-br from-red-600 to-red-700',
      description: 'الربح بعد المصاريف',
      onClick: () => onCardClick('netProfit')
    },
    {
      key: 'cashBalance',
      title: 'رصيد القاصة',
      value: financialData.mainCashBalance,
      icon: Wallet,
      color: 'bg-gradient-to-br from-purple-600 to-purple-700',
      description: 'رأس المال + الأرباح - المشتريات',
      onClick: () => onCardClick('cash')
    },
    {
      key: 'inventory',
      title: 'قيمة المخزون',
      value: financialData.inventoryValue,
      icon: Package,
      color: 'bg-gradient-to-br from-orange-600 to-orange-700',
      description: 'قيمة المنتجات الموجودة',
      onClick: () => onCardClick('inventory')
    }
  ];

  // كروت لوحة التحكم
  const dashboardCards = [
    {
      key: 'totalRevenue',
      title: 'إجمالي الإيرادات',
      value: financialData.totalRevenue,
      icon: TrendingUp,
      color: 'bg-gradient-to-br from-emerald-600 to-emerald-700',
      description: `${financialData.deliveredOrders.length} طلب مسلم`
    },
    {
      key: 'systemProfit',
      title: 'ربح النظام',
      value: financialData.totalSystemProfit,
      icon: Target,
      color: 'bg-gradient-to-br from-indigo-600 to-indigo-700',
      description: 'ربح المدير + ربح النظام من الموظفين'
    },
    {
      key: 'employeeDues',
      title: 'مستحقات الموظفين',
      value: financialData.employeeDues,
      icon: Users,
      color: 'bg-gradient-to-br from-amber-600 to-amber-700',
      description: 'أرباح الموظفين المستحقة'
    },
    {
      key: 'expenses',
      title: 'المصاريف العامة',
      value: financialData.generalExpenses,
      icon: TrendingDown,
      color: 'bg-gradient-to-br from-red-600 to-red-700',
      description: 'المصاريف والتكاليف العامة'
    }
  ];

  // كروت المحاسبة التفصيلية
  const accountingCards = [
    {
      key: 'managerSales',
      title: 'مبيعات المدير',
      value: financialData.managerRevenue,
      icon: User,
      color: 'bg-gradient-to-br from-cyan-600 to-cyan-700',
      description: `${financialData.managerOrders.length} طلب - ربح كامل للنظام`
    },
    {
      key: 'employeeSales',
      title: 'مبيعات الموظفين',
      value: financialData.employeeRevenue,
      icon: Users,
      color: 'bg-gradient-to-br from-teal-600 to-teal-700',
      description: `${financialData.employeeOrders.length} طلب - مقسمة حسب القواعد`
    },
    {
      key: 'totalCOGS',
      title: 'تكلفة البضاعة',
      value: financialData.totalCOGS,
      icon: ShoppingCart,
      color: 'bg-gradient-to-br from-slate-600 to-slate-700',
      description: 'تكلفة المنتجات المباعة'
    },
    {
      key: 'purchases',
      title: 'المشتريات',
      value: financialData.totalPurchases,
      icon: Package,
      color: 'bg-gradient-to-br from-stone-600 to-stone-700',
      description: 'إجمالي قيمة المشتريات'
    }
  ];

  // اختيار الكروت حسب الوضع
  let cards = overviewCards;
  if (mode === 'dashboard') cards = dashboardCards;
  if (mode === 'accounting') cards = accountingCards;

  return (
    <div className={cn('space-y-6', className)}>
      {/* الكروت الأساسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card 
            key={card.key}
            className={cn(
              "overflow-hidden transition-all duration-300 border-0 group cursor-pointer",
              "shadow-lg hover:shadow-xl hover:scale-[1.02]",
              card.color,
              "text-white"
            )}
            onClick={card.onClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <card.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/80 font-medium">{card.title}</p>
                  <p className="text-xl font-bold text-white group-hover:scale-105 transition-transform">
                    {formatCurrency(card.value)}
                  </p>
                  {card.description && (
                    <p className="text-xs text-white/60 mt-1">{card.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* التفاصيل الإضافية للمحاسبة */}
      {mode === 'accounting' && showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                تفصيل الأرباح
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ربح المدير:</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(financialData.managerProfit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ربح النظام من الموظفين:</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(financialData.systemProfitFromEmployees)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">إجمالي ربح النظام:</span>
                <span className="font-bold text-primary">
                  {formatCurrency(financialData.totalSystemProfit)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                تفصيل الأصول
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">رصيد القاصة:</span>
                <span className="font-semibold">
                  {formatCurrency(financialData.mainCashBalance)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">قيمة المخزون:</span>
                <span className="font-semibold">
                  {formatCurrency(financialData.inventoryValue)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">إجمالي الأصول:</span>
                <span className="font-bold text-primary">
                  {formatCurrency(financialData.totalAssets)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* مؤشرات الأداء */}
      {mode === 'dashboard' && (
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={financialData.netProfit > 0 ? "default" : "destructive"}
            className="text-sm"
          >
            {financialData.netProfit > 0 ? "نشاط ربحي" : "تحت المراقبة"}
          </Badge>
          
          {financialData.totalRevenue > 0 && (
            <Badge variant="outline" className="text-sm">
              هامش الربح: {((financialData.totalSystemProfit / financialData.totalRevenue) * 100).toFixed(1)}%
            </Badge>
          )}
          
          <Badge variant="secondary" className="text-sm">
            {financialData.deliveredOrders.length} طلب مسلم
          </Badge>
        </div>
      )}
    </div>
  );
};

export default UnifiedFinancialDisplay;