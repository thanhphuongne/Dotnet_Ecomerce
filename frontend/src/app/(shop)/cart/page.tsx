'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/lib/api';
import { useAuthStore, useCartStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { Minus, Plus, Trash2, ShoppingBag, ChevronRight, Tag } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { setCart } = useCartStore();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get().then(r => r.data.data),
    enabled: isAuthenticated,
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      cartApi.updateItem(itemId, quantity),
    onSuccess: (res) => {
      setCart(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => toast.error('Không thể cập nhật'),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: number) => cartApi.removeItem(itemId),
    onSuccess: (res) => {
      setCart(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Đã xóa khỏi giỏ hàng');
    },
  });

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await cartApi.applyCoupon(couponCode, cart?.subtotal || 0);
      setAppliedCoupon(res.data.data);
      toast.success(`Đã áp dụng mã giảm giá! Tiết kiệm ${formatCurrency(res.data.data.discountAmount)}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Mã giảm giá không hợp lệ');
    } finally {
      setCouponLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container-shop py-20 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Vui lòng đăng nhập</h2>
        <p className="text-gray-500 mb-6">Đăng nhập để xem giỏ hàng của bạn</p>
        <Link href="/login" className="btn-primary">Đăng nhập</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container-shop py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 flex gap-4">
              <div className="w-24 h-24 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discount = appliedCoupon?.discountAmount || 0;
  const shipping = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal - discount + shipping;

  if (items.length === 0) {
    return (
      <div className="container-shop py-20 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Giỏ hàng trống</h2>
        <p className="text-gray-500 mb-6">Hãy thêm sản phẩm vào giỏ hàng của bạn</p>
        <Link href="/products" className="btn-primary">Tiếp tục mua sắm</Link>
      </div>
    );
  }

  return (
    <div className="container-shop py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Giỏ hàng ({items.length} sản phẩm)
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item: any) => (
            <div key={item.id} className="card p-4 flex gap-4">
              <Link href={`/products/${item.product.slug}`} className="flex-shrink-0">
                <img
                  src={item.product.primaryImage || '/placeholder.jpg'}
                  alt={item.product.name}
                  className="w-24 h-24 object-cover rounded-lg bg-gray-100"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.product.slug}`} className="hover:text-primary-600">
                  <h3 className="font-medium text-gray-800 text-sm line-clamp-2">{item.product.name}</h3>
                </Link>
                {item.variant && (
                  <p className="text-xs text-gray-500 mt-1">
                    Size: {item.variant.size} · Màu: {item.variant.color}
                  </p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-gray-200 rounded-lg">
                    <button
                      onClick={() => {
                        if (item.quantity <= 1) {
                          removeMutation.mutate(item.id);
                        } else {
                          updateMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 });
                        }
                      }}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 rounded-l-lg"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 rounded-r-lg"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-primary-600">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeMutation.mutate(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Link href="/products" className="flex items-center text-primary-600 text-sm hover:text-primary-700 mt-2">
            <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
            Tiếp tục mua sắm
          </Link>
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          {/* Coupon */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary-600" />
              Mã giảm giá
            </h3>
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-green-50 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-green-700">{appliedCoupon.code}</p>
                  <p className="text-xs text-green-600">Tiết kiệm {formatCurrency(appliedCoupon.discountAmount)}</p>
                </div>
                <button
                  onClick={() => setAppliedCoupon(null)}
                  className="text-red-400 hover:text-red-600 text-xs"
                >
                  Xóa
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã giảm giá"
                  className="input-field flex-1 text-sm"
                  onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                />
                <button
                  onClick={applyCoupon}
                  disabled={couponLoading}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Áp dụng
                </button>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-4">Tóm tắt đơn hàng</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính ({items.length} sản phẩm)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển</span>
                <span>
                  {shipping === 0 ? (
                    <span className="text-green-600 font-medium">Miễn phí</span>
                  ) : (
                    formatCurrency(shipping)
                  )}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-gray-400">
                  Mua thêm {formatCurrency(500000 - subtotal)} để miễn phí vận chuyển
                </p>
              )}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-800">
                <span>Tổng cộng</span>
                <span className="text-primary-600 text-lg">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={() => router.push(`/checkout${appliedCoupon ? `?coupon=${appliedCoupon.code}` : ''}`)}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              Tiến hành thanh toán
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
