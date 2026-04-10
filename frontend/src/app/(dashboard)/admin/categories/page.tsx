'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '@/lib/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', parentId: '', imageUrl: '', sortOrder: '0' });

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => categoriesApi.getAll(true).then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => editingId ? categoriesApi.update(editingId, data) : categoriesApi.create(data),
    onSuccess: () => {
      toast.success(editingId ? 'Đã cập nhật danh mục' : 'Đã tạo danh mục');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', parentId: '', imageUrl: '', sortOrder: '0' });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa danh mục');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, parentId: cat.parentId?.toString() || '', imageUrl: cat.imageUrl || '', sortOrder: cat.sortOrder?.toString() || '0' });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên danh mục'); return; }
    createMutation.mutate({
      name: form.name,
      parentId: form.parentId ? parseInt(form.parentId) : null,
      imageUrl: form.imageUrl || null,
      sortOrder: parseInt(form.sortOrder),
    });
  };

  const parents = categories?.filter((c: any) => !c.parentId) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý danh mục</h1>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: '', parentId: '', imageUrl: '', sortOrder: '0' }); }}
          className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Thêm danh mục
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
          <h3 className="font-semibold text-gray-800 mb-4">{editingId ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Tên danh mục *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="input-field"
                placeholder="Áo Thun, Quần Jeans,..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Danh mục cha</label>
              <select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })} className="input-field">
                <option value="">Không có (danh mục gốc)</option>
                {parents.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">URL ảnh</label>
              <input
                value={form.imageUrl}
                onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                className="input-field"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Thứ tự hiển thị</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm({ ...form, sortOrder: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSubmit} disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm mới'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-outline">
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500 text-xs border-b border-gray-100">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Tên danh mục</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Danh mục cha</th>
              <th className="px-4 py-3 font-medium">Sản phẩm</th>
              <th className="px-4 py-3 font-medium">Thứ tự</th>
              <th className="px-4 py-3 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : categories?.map((cat: any) => (
              <tr key={cat.id} className={`hover:bg-gray-50 ${cat.parentId ? 'bg-gray-25' : ''}`}>
                <td className="px-4 py-3 text-gray-400">{cat.id}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {cat.parentId && <span className="text-gray-300">└</span>}
                    {cat.imageUrl && (
                      <img src={cat.imageUrl} alt="" className="w-6 h-6 rounded object-cover" />
                    )}
                    <span className={`font-medium ${cat.parentId ? 'text-gray-600 text-xs' : 'text-gray-800'}`}>
                      {cat.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400">{cat.slug}</td>
                <td className="px-4 py-3 text-gray-500">
                  {cat.parentId ? categories?.find((p: any) => p.id === cat.parentId)?.name || '-' : '-'}
                </td>
                <td className="px-4 py-3 text-gray-600">{cat.productCount || 0}</td>
                <td className="px-4 py-3 text-gray-600">{cat.sortOrder || 0}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(cat)} className="p-1.5 text-gray-400 hover:text-primary-500 rounded-lg hover:bg-primary-50">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Xóa danh mục "${cat.name}"?`)) deleteMutation.mutate(cat.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
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
    </div>
  );
}
