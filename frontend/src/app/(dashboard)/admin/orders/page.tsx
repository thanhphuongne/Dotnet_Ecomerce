'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils';
import { Search, Eye, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'Pending', label: 'Chờ xác nhận' },
  { value: 'Confirmed', label: 'Đã xác nhận' },
  { value: 'Shipping', label: 'Đang giao' },
  { value: 'Delivered', label: 'Đã giao' },
  { value: 'Cancelled', label: 'Đã hủy' },
];

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', search, status, page],
    queryFn: () => ordersApi.getAll({ search, status: status || undefined, page, pageSize: 10 }).then(r => r.data.data),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, newStatus, note }: { id: number; newStatus: string; note?: string }) =>
      ordersApi.updateStatus(id, { status: newStatus, note }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setUpdatingId(null);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Cập nhật thất bại'),
  });

  const NEXT_STATUS: Record<string, { value: string; label: string }> = {
    Pending: { value: 'Confirmed', label: 'Xác nhận đơn' },
    Confirmed: { value: 'Shipping', label: 'Bắt đầu giao' },
    Shipping: { value: 'Delivered', label: 'Đã giao hàng' },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Quản lý đơn hàng</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo mã đơn, tên khách..."
            className="input-field pl-10"
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="input-field w-48"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Mã đơn</th>
                <th className="px-4 py-3 font-medium">Khách hàng</th>
                <th className="px-4 py-3 font-medium">SP</th>
                <th className="px-4 py-3 font-medium">Tổng tiền</th>
                <th className="px-4 py-3 font-medium">Thanh toán</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Ngày đặt</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-10 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : data?.items?.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${order.id}`} className="text-primary-600 hover:underline font-medium">
                      #{order.orderCode}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{order.customerName}</td>
                  <td className="px-4 py-3 text-gray-500">{order.totalItems}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${order.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {order.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}`}>
                      {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {NEXT_STATUS[order.status] && (
                        <button
                          onClick={() => updateStatusMutation.mutate({
                            id: order.id,
                            newStatus: NEXT_STATUS[order.status].value,
                          })}
                          disabled={updateStatusMutation.isPending}
                          className="text-xs px-2 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          {NEXT_STATUS[order.status].label}
                        </button>
                      )}
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data?.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {data?.totalCount} đơn hàng
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40">
                Trước
              </button>
              <span className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg">{page} / {data?.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= data?.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40">
                Tiếp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
