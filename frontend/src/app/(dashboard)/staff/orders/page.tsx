'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils';
import { Search, Eye, CheckCircle, Truck, Package } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const NEXT_ACTION: Record<string, { status: string; label: string; icon: React.ElementType; color: string }> = {
  Pending: {
    status: 'Confirmed',
    label: 'Xác nhận',
    icon: CheckCircle,
    color: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  Confirmed: {
    status: 'Shipping',
    label: 'Giao hàng',
    icon: Truck,
    color: 'bg-purple-600 hover:bg-purple-700 text-white',
  },
  Shipping: {
    status: 'Delivered',
    label: 'Đã giao',
    icon: Package,
    color: 'bg-green-600 hover:bg-green-700 text-white',
  },
};

export default function StaffOrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Pending');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['staff-orders', search, status, page],
    queryFn: () => ordersApi.getAll({ search, status: status || undefined, page, pageSize: 15 }).then(r => r.data.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: number; newStatus: string }) =>
      ordersApi.updateStatus(id, { status: newStatus }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái đơn hàng');
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Cập nhật thất bại'),
  });

  const STATUS_TABS = [
    { value: 'Pending', label: 'Chờ xác nhận' },
    { value: 'Confirmed', label: 'Đã xác nhận' },
    { value: 'Shipping', label: 'Đang giao' },
    { value: 'Delivered', label: 'Đã giao' },
    { value: '', label: 'Tất cả' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Quản lý đơn hàng</h1>

      {/* Status Tabs */}
      <div className="flex overflow-x-auto gap-1 mb-5 pb-1">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className={`flex-shrink-0 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              status === tab.value
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm mã đơn, tên khách..."
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Mã đơn</th>
                <th className="px-4 py-3 font-medium">Khách hàng</th>
                <th className="px-4 py-3 font-medium">Địa chỉ</th>
                <th className="px-4 py-3 font-medium">Số SP</th>
                <th className="px-4 py-3 font-medium">Tổng tiền</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Ngày đặt</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-10 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    Không có đơn hàng nào
                  </td>
                </tr>
              ) : data?.items?.map((order: any) => {
                const nextAction = NEXT_ACTION[order.status];
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-600">#{order.orderCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{order.customerName}</p>
                      <p className="text-xs text-gray-400">{order.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-32">
                      <p className="truncate text-xs">{order.shippingAddress}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order.totalItems}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}`}>
                        {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {nextAction && (
                          <button
                            onClick={() => updateMutation.mutate({ id: order.id, newStatus: nextAction.status })}
                            disabled={updateMutation.isPending}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg ${nextAction.color}`}
                          >
                            <nextAction.icon className="w-3.5 h-3.5" />
                            {nextAction.label}
                          </button>
                        )}
                        <Link
                          href={`/staff/orders/${order.id}`}
                          className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data?.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">{data?.totalCount} đơn hàng</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40">Trước</button>
              <span className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg">{page} / {data?.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= data?.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40">Tiếp</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
