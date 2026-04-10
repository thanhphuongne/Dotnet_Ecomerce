'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Search, Shield, UserX, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_BADGES: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700',
  Staff: 'bg-blue-100 text-blue-700',
  Customer: 'bg-gray-100 text-gray-600',
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, role, page],
    queryFn: () => usersApi.getAll({ search, role: role || undefined, page, pageSize: 10 }).then(r => r.data.data),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, newRole }: { id: number; newRole: string }) => usersApi.updateRole(id, newRole),
    onSuccess: () => {
      toast.success('Đã cập nhật vai trò');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: number) => usersApi.toggleActive(id),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Quản lý người dùng</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm kiếm người dùng..."
            className="input-field pl-10"
          />
        </div>
        <select
          value={role}
          onChange={e => { setRole(e.target.value); setPage(1); }}
          className="input-field w-40"
        >
          <option value="">Tất cả vai trò</option>
          <option value="Admin">Admin</option>
          <option value="Staff">Staff</option>
          <option value="Customer">Khách hàng</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Người dùng</th>
                <th className="px-4 py-3 font-medium">Số điện thoại</th>
                <th className="px-4 py-3 font-medium">Vai trò</th>
                <th className="px-4 py-3 font-medium">Đơn hàng</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Ngày đăng ký</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-10 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : data?.items?.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                        ) : (
                          <span className="text-primary-700 text-sm font-bold">{user.fullName.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.fullName}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={e => {
                        if (confirm(`Đổi vai trò của ${user.fullName} thành ${e.target.value}?`)) {
                          updateRoleMutation.mutate({ id: user.id, newRole: e.target.value });
                        }
                      }}
                      className={`badge text-xs cursor-pointer border-0 ${ROLE_BADGES[user.role]} focus:outline-none`}
                    >
                      <option value="Customer">Khách hàng</option>
                      <option value="Staff">Staff</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.totalOrders || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => toggleActiveMutation.mutate(user.id)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                          user.isActive
                            ? 'text-red-500 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {user.isActive ? (
                          <><UserX className="w-3.5 h-3.5" /> Khóa</>
                        ) : (
                          <><UserCheck className="w-3.5 h-3.5" /> Mở khóa</>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data?.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">{data?.totalCount} người dùng</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40">Trước</button>
              <span className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg">{page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= data?.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40">Tiếp</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
