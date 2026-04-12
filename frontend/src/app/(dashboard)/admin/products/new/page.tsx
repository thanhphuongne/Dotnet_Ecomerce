'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function AdminProductNewPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [imageUrls, setImageUrls] = useState(['']);

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => categoriesApi.getAll({ page: 1, pageSize: 100 }).then((r: any) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => productsApi.create(payload),
    onSuccess: () => {
      toast.success('Đã tạo sản phẩm');
      router.push('/admin/products');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Lỗi khi tạo sản phẩm'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name,
      slug,
      basePrice: parseFloat(basePrice || '0'),
      salePrice: salePrice ? parseFloat(salePrice) : undefined,
      categoryId: categoryId || undefined,
      isActive,
      imageUrls: imageUrls.filter(u => u && u.trim()),
      variants: [],
    };
    createMutation.mutate(payload);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Thêm sản phẩm</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border p-6">
        <div>
          <label className="text-sm text-gray-600">Tên sản phẩm</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input-field mt-1" required />
        </div>
        <div>
          <label className="text-sm text-gray-600">Slug</label>
          <input value={slug} onChange={e => setSlug(e.target.value)} className="input-field mt-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-gray-600">Giá gốc</label>
            <input value={basePrice} onChange={e => setBasePrice(e.target.value)} type="number" step="0.01" className="input-field mt-1" required />
          </div>
          <div>
            <label className="text-sm text-gray-600">Giá khuyến mãi</label>
            <input value={salePrice} onChange={e => setSalePrice(e.target.value)} type="number" step="0.01" className="input-field mt-1" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Danh mục</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')} className="input-field mt-1">
              <option value="">Chọn danh mục</option>
              {categoriesData?.items?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600">Ảnh (URLs)</label>
          {imageUrls.map((u, idx) => (
            <div key={idx} className="flex gap-2 mt-2">
              <input value={u} onChange={(e) => setImageUrls(prev => prev.map((v,i) => i===idx?e.target.value:v))} className="input-field flex-1" />
              <button type="button" className="btn-outline" onClick={() => setImageUrls(prev => prev.filter((_,i) => i!==idx))}>Xóa</button>
            </div>
          ))}
          <div className="mt-2">
            <button type="button" onClick={() => setImageUrls(prev => [...prev, ''])} className="btn-outline">Thêm ảnh</button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            <span className="text-sm">Hiển thị sản phẩm</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary">Tạo sản phẩm</button>
          <button type="button" className="btn-outline" onClick={() => router.push('/admin/products')}>Hủy</button>
        </div>
      </form>
    </div>
  );
}
