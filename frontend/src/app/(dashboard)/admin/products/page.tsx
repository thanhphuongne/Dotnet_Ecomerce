'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', search, page],
    queryFn: () => productsApi.getAll({ search, page, pageSize: 10 }).then(r => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa sản phẩm');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Không thể xóa'),
  });

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Bạn chắc chắn muốn xóa sản phẩm "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý sản phẩm</h1>
        <Link href="/admin/products/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Thêm sản phẩm
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm sản phẩm..."
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
                <th className="px-4 py-3 font-medium w-12">#</th>
                <th className="px-4 py-3 font-medium">Sản phẩm</th>
                <th className="px-4 py-3 font-medium">Danh mục</th>
                <th className="px-4 py-3 font-medium">Giá</th>
                <th className="px-4 py-3 font-medium">Tồn kho</th>
                <th className="px-4 py-3 font-medium">Đã bán</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
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
              ) : data?.items?.map((product: any) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400">{product.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.primaryImage || '/placeholder.jpg'}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                      />
                      <div>
                        <p className="font-medium text-gray-800 line-clamp-1">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{product.categoryName}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-primary-600">{formatCurrency(product.displayPrice)}</span>
                    {product.salePrice && (
                      <p className="text-xs text-gray-400 line-through">{formatCurrency(product.basePrice)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={product.totalStock < 5 ? 'text-red-500 font-medium' : 'text-gray-600'}>
                      {product.totalStock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{product.soldCount}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {product.isActive ? 'Đang bán' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/products/${product.slug}`}
                        className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50"
                        title="Xem"
                        target="_blank"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="p-1.5 text-gray-400 hover:text-primary-500 rounded-lg hover:bg-primary-50"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Hiển thị {data?.items?.length} / {data?.totalCount} sản phẩm
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:border-primary-400"
              >
                Trước
              </button>
              <span className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg">{page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= data?.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:border-primary-400"
              >
                Tiếp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
