'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@/lib/api';
import ProductCard from '@/components/shop/ProductCard';
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { SIZES } from '@/lib/utils';

const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: 'Mới nhất' },
  { value: 'sold_desc', label: 'Bán chạy nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'rating_desc', label: 'Đánh giá cao nhất' },
];

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const size = searchParams.get('size') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const hasSale = searchParams.get('hasSale') || '';
  const isFeatured = searchParams.get('isFeatured') || '';
  const sortParam = searchParams.get('sort') || 'createdAt_desc';
  const page = parseInt(searchParams.get('page') || '1');

  const [sortBy, sortOrder] = sortParam.split('_');

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(false).then(r => r.data.data),
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', { search, categoryId, size, minPrice, maxPrice, hasSale, isFeatured, sortBy, sortOrder, page }],
    queryFn: () => productsApi.getAll({
      search,
      categoryId: categoryId || undefined,
      size: size || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      hasSale: hasSale === 'true' ? true : undefined,
      isFeatured: isFeatured === 'true' ? true : undefined,
      sortBy,
      sortOrder,
      page,
      pageSize: 12,
    }).then(r => r.data.data),
  });

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/products?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/products');
  };

  const hasActiveFilters = search || categoryId || size || minPrice || maxPrice || hasSale || isFeatured;

  return (
    <div className="container-shop py-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters Sidebar */}
        <aside className={`w-full md:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>
          <div className="card p-4 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Bộ lọc</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <X className="w-3 h-3" /> Xóa tất cả
                </button>
              )}
            </div>

            {/* Categories */}
            <div className="mb-5">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Danh mục</h4>
              <div className="space-y-1">
                <button
                  onClick={() => updateParam('categoryId', '')}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${!categoryId ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Tất cả
                </button>
                {categoriesData?.map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => updateParam('categoryId', cat.id.toString())}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${categoryId === cat.id.toString() ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div className="mb-5">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Kích thước</h4>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateParam('size', size === s ? '' : s)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${size === s ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:border-primary-400'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-5">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Khoảng giá (đ)</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Từ"
                  value={minPrice}
                  onChange={(e) => updateParam('minPrice', e.target.value)}
                  className="input-field text-xs"
                />
                <input
                  type="number"
                  placeholder="Đến"
                  value={maxPrice}
                  onChange={(e) => updateParam('maxPrice', e.target.value)}
                  className="input-field text-xs"
                />
              </div>
            </div>

            {/* Other Filters */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSale === 'true'}
                  onChange={(e) => updateParam('hasSale', e.target.checked ? 'true' : '')}
                  className="rounded text-primary-600"
                />
                <span className="text-sm text-gray-600">Đang giảm giá</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured === 'true'}
                  onChange={(e) => updateParam('isFeatured', e.target.checked ? 'true' : '')}
                  className="rounded text-primary-600"
                />
                <span className="text-sm text-gray-600">Sản phẩm nổi bật</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Products */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Bộ lọc
              </button>
              <span className="text-sm text-gray-500">
                {productsData?.totalCount || 0} sản phẩm
              </span>
              {search && (
                <span className="text-sm text-gray-600">
                  cho "<strong>{search}</strong>"
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sắp xếp:</span>
              <select
                value={sortParam}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary-400"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="card overflow-hidden animate-pulse">
                  <div className="aspect-[3/4] bg-gray-200" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : productsData?.items?.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {productsData.items.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {productsData.totalPages > 1 && (
                <div className="flex justify-center mt-8 gap-2">
                  {Array.from({ length: Math.min(productsData.totalPages, 7) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => updateParam('page', p.toString())}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-primary-600 text-white' : 'border border-gray-200 text-gray-600 hover:border-primary-400'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg mb-4">Không tìm thấy sản phẩm</p>
              <button onClick={clearFilters} className="btn-outline text-sm">
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
