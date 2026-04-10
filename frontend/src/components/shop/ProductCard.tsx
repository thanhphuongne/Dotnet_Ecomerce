'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';
import { cartApi } from '@/lib/api';
import { useAuthStore, useCartStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { setCart } = useCartStore();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để mua hàng');
      router.push('/login');
      return;
    }
    try {
      const res = await cartApi.addItem(product.id, undefined, 1);
      setCart(res.data.data);
      toast.success('Đã thêm vào giỏ hàng!');
    } catch {
      // If product has variants, redirect to detail page
      router.push(`/products/${product.slug}`);
    }
  };

  return (
    <Link href={`/products/${product.slug}`} className="group">
      <div className="card overflow-hidden hover:shadow-md transition-shadow duration-300">
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
          {product.primaryImage ? (
            <img
              src={product.primaryImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col space-y-1">
            {product.discountPercent && product.discountPercent > 0 && (
              <span className="badge bg-red-500 text-white text-xs">
                -{product.discountPercent}%
              </span>
            )}
            {product.isFeatured && (
              <span className="badge bg-primary-600 text-white text-xs">
                Hot
              </span>
            )}
          </div>

          {/* Wishlist */}
          <button className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50">
            <Heart className="w-4 h-4 text-gray-500 hover:text-red-500 transition-colors" />
          </button>

          {/* Add to cart overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 translate-y-full group-hover:translate-y-0 transition-transform duration-300 py-2 px-3">
            <button
              onClick={handleAddToCart}
              className="w-full text-white text-xs font-medium flex items-center justify-center space-x-2 hover:text-primary-300 transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Thêm vào giỏ</span>
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-xs text-gray-400 mb-1">{product.categoryName}</p>
          <h3 className="font-medium text-gray-800 text-sm leading-tight line-clamp-2 mb-2">
            {product.name}
          </h3>

          {/* Rating */}
          {product.totalReviews > 0 && (
            <div className="flex items-center space-x-1 mb-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${star <= Math.round(product.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400">({product.totalReviews})</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center space-x-2">
            <span className="font-bold text-primary-600">
              {formatCurrency(product.displayPrice)}
            </span>
            {product.salePrice && product.salePrice < product.basePrice && (
              <span className="text-xs text-gray-400 line-through">
                {formatCurrency(product.basePrice)}
              </span>
            )}
          </div>

          {product.totalStock === 0 && (
            <p className="text-xs text-red-500 mt-1">Hết hàng</p>
          )}
        </div>
      </div>
    </Link>
  );
}
