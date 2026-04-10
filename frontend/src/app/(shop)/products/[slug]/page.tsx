'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi, cartApi } from '@/lib/api';
import { useAuthStore, useCartStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Heart, Star, ChevronLeft, ChevronRight, Minus, Plus, Share2 } from 'lucide-react';
import Link from 'next/link';
import ProductCard from '@/components/shop/ProductCard';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { setCart } = useCartStore();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [addingToCart, setAddingToCart] = useState(false);

  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', params.slug],
    queryFn: () => productsApi.getBySlug(params.slug).then(r => r.data.data),
  });

  const { data: relatedData } = useQuery({
    queryKey: ['related', productData?.id],
    queryFn: () => productsApi.getRelated(productData!.id).then(r => r.data.data),
    enabled: !!productData?.id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', productData?.id],
    queryFn: () => fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews/product/${productData!.id}`).then(r => r.json()).then(d => d.data),
    enabled: !!productData?.id,
  });

  if (isLoading) {
    return (
      <div className="container-shop py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-square bg-gray-200 rounded-xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="container-shop py-20 text-center">
        <p className="text-gray-400 text-lg">Không tìm thấy sản phẩm</p>
        <Link href="/products" className="btn-primary mt-4 inline-block">Quay lại</Link>
      </div>
    );
  }

  const product = productData;

  // Find the selected variant
  const selectedVariant = product.variants?.find(
    v => v.size === selectedSize && v.color === selectedColor
  );

  const displayPrice = selectedVariant?.priceAdjustment
    ? (product.salePrice ?? product.basePrice) + selectedVariant.priceAdjustment
    : (product.salePrice ?? product.basePrice);

  const maxQuantity = selectedVariant?.stock ?? product.totalStock;

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để mua hàng');
      router.push('/login');
      return;
    }

    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      toast.error('Vui lòng chọn kích thước và màu sắc');
      return;
    }

    if (selectedVariant && selectedVariant.stock < quantity) {
      toast.error(`Kho chỉ còn ${selectedVariant.stock} sản phẩm`);
      return;
    }

    setAddingToCart(true);
    try {
      const res = await cartApi.addItem(product.id, selectedVariant?.id, quantity);
      setCart(res.data.data);
      toast.success('Đã thêm vào giỏ hàng!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể thêm vào giỏ hàng');
    } finally {
      setAddingToCart(false);
    }
  };

  // Colors available for selected size (or all if no size selected)
  const availableColors = product.availableColors || [];
  const availableSizes = product.availableSizes || [];

  return (
    <div className="container-shop py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-primary-600">Trang chủ</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/products" className="hover:text-primary-600">Sản phẩm</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/products?categoryId=${product.categoryId}`} className="hover:text-primary-600">
          {product.categoryName}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-800 truncate max-w-xs">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Images */}
        <div>
          <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-3">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[selectedImage]?.url || product.primaryImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                No image
              </div>
            )}
          </div>

          {product.images && product.images.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === i ? 'border-primary-500' : 'border-transparent'}`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <div className="mb-3">
            <span className="text-sm text-primary-600 font-medium">{product.brand || product.categoryName}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">{product.name}</h1>

          {/* Rating */}
          {product.totalReviews > 0 && (
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= Math.round(product.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {product.averageRating.toFixed(1)} ({product.totalReviews} đánh giá)
              </span>
              <span className="text-sm text-gray-400">·</span>
              <span className="text-sm text-gray-500">{product.soldCount} đã bán</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center space-x-3 mb-5">
            <span className="text-3xl font-bold text-primary-600">{formatCurrency(displayPrice)}</span>
            {product.salePrice && product.salePrice < product.basePrice && (
              <>
                <span className="text-lg text-gray-400 line-through">{formatCurrency(product.basePrice)}</span>
                <span className="badge bg-red-100 text-red-600">-{product.discountPercent}%</span>
              </>
            )}
          </div>

          {product.shortDescription && (
            <p className="text-gray-600 text-sm mb-5">{product.shortDescription}</p>
          )}

          {/* Colors */}
          {availableColors.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Màu sắc</span>
                {selectedColor && <span className="text-sm text-gray-500">{selectedColor}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(selectedColor === c.name ? '' : c.name)}
                    title={c.name}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === c.name ? 'border-primary-500 scale-110' : 'border-gray-200 hover:border-gray-400'}`}
                    style={{ backgroundColor: c.hex || '#ccc' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {availableSizes.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Kích thước</span>
                {selectedSize && <span className="text-sm text-gray-500">{selectedSize}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((s) => {
                  const hasStock = product.variants?.some(
                    v => v.size === s && (!selectedColor || v.color === selectedColor) && v.stock > 0
                  );
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(selectedSize === s ? '' : s)}
                      disabled={!hasStock}
                      className={`w-12 h-10 rounded-lg border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${selectedSize === s ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-700 hover:border-primary-400'}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center space-x-4 mb-6">
            <span className="text-sm font-medium text-gray-700">Số lượng:</span>
            <div className="flex items-center border border-gray-200 rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-l-lg"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(maxQuantity || 10, quantity + 1))}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-r-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {selectedVariant && (
              <span className="text-sm text-gray-500">Còn {selectedVariant.stock} sản phẩm</span>
            )}
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 mb-5">
            <button
              onClick={handleAddToCart}
              disabled={addingToCart || product.totalStock === 0}
              className="flex-1 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ'}</span>
            </button>
            <button className="w-12 h-12 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors">
              <Heart className="w-5 h-5 text-gray-500" />
            </button>
            <button className="w-12 h-12 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
              <Share2 className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Buy Now */}
          <button
            onClick={async () => {
              await handleAddToCart();
              router.push('/cart');
            }}
            disabled={addingToCart || product.totalStock === 0}
            className="w-full border-2 border-primary-600 text-primary-600 font-semibold py-3 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
          >
            Mua ngay
          </button>

          {/* Info */}
          {product.material && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Chất liệu:</span>
                  <span className="ml-2 text-gray-700">{product.material}</span>
                </div>
                {product.brand && (
                  <div>
                    <span className="text-gray-500">Thương hiệu:</span>
                    <span className="ml-2 text-gray-700">{product.brand}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-12">
        <div className="flex border-b border-gray-200 mb-6">
          {[
            { id: 'description', label: 'Mô tả sản phẩm' },
            { id: 'reviews', label: `Đánh giá (${product.totalReviews})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'description' && (
          <div className="prose max-w-none text-gray-600">
            <p>{product.description || product.shortDescription || 'Không có mô tả.'}</p>
            {product.careInstructions && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700">Hướng dẫn bảo quản:</h4>
                <p>{product.careInstructions}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            {reviewsData?.reviews?.length > 0 ? (
              <div className="space-y-4">
                {reviewsData.reviews.map((review: any) => (
                  <div key={review.id} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 text-sm font-semibold">
                            {review.user.fullName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-800">{review.user.fullName}</p>
                          {review.isVerifiedPurchase && (
                            <span className="text-xs text-green-600">✓ Đã mua hàng</span>
                          )}
                        </div>
                      </div>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    {review.title && <p className="font-medium text-gray-700 mb-1">{review.title}</p>}
                    {review.content && <p className="text-gray-600 text-sm">{review.content}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">Chưa có đánh giá nào</p>
            )}
          </div>
        )}
      </div>

      {/* Related Products */}
      {relatedData && relatedData.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-5">Sản phẩm liên quan</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedData.map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
