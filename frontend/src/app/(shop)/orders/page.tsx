'use client';

import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils';
import Link from 'next/link';
import { Package } from 'lucide-react';

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.getMyOrders({ page: 1, pageSize: 20 }).then(r => r.data.data),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="container-shop py-20 text-center">
        <p className="text-gray-500 mb-4">Vui lòng đăng nhập để xem đơn hàng</p>
        <Link href="/login" className="btn-primary">Đăng nhập</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container-shop py-8">
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 h-24 bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const orders = ordersData?.items || [];

  return (
    <div className="container-shop py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Đơn hàng của tôi</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Bạn chưa có đơn hàng nào</p>
          <Link href="/products" className="btn-primary">Mua sắm ngay</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <Link key={order.id} href={`/orders/${order.id}`} className="block">
              <div className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">#{order.orderCode}</p>
                    <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <span className={`badge ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || 'bg-gray-100 text-gray-600'}`}>
                    {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] || order.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  {order.items?.slice(0, 3).map((item: any, i: number) => (
                    <img
                      key={i}
                      src={item.productImage || '/placeholder.jpg'}
                      alt={item.productName}
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                    />
                  ))}
                  {order.items?.length > 3 && (
                    <span className="text-sm text-gray-400">+{order.items.length - 3} sản phẩm</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{order.totalItems} sản phẩm</span>
                  <span className="font-bold text-primary-600">{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
