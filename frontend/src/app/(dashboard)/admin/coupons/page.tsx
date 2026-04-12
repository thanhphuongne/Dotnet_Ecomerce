'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => couponsApi.getAll().then((r: any) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => couponsApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa mã giảm giá');
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Không thể xóa'),
  });

  const handleDelete = (id: number) => {
    if (confirm('Bạn chắc chắn muốn xóa mã này?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý mã giảm giá</h1>
        <Link href="/admin/coupons/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Thêm mã
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs border-b border-gray-100">
                <th className="px-4 py-3 font-medium w-12">#</th>
                <th className="px-4 py-3 font-medium">Mã</th>
                <th className="px-4 py-3 font-medium">Loại</th>
                <th className="px-4 py-3 font-medium">Giá trị</th>
                <th className="px-4 py-3 font-medium">Điều kiện</th>
                <th className="px-4 py-3 font-medium">Lượt SD / Giới hạn</th>
                <th className="px-4 py-3 font-medium">Thời gian</th>
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
              ) : (
                data?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400">{c.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{c.code}</div>
                      <div className="text-xs text-gray-400">{c.description}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.type}</td>
                    <td className="px-4 py-3 text-gray-600">{c.type === 'Percentage' ? `${c.value}%` : c.type === 'FreeShipping' ? 'Miễn phí' : c.value?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{c.minOrderAmount ? c.minOrderAmount.toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.usedCount ?? 0} / {c.usageLimit ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.startDate ? formatDate(c.startDate) : '-'} - {c.endDate ? formatDate(c.endDate) : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/coupons/${c.id}/edit`} className="p-1.5 text-gray-400 hover:text-primary-500 rounded-lg hover:bg-primary-50" title="Chỉnh sửa">
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
