'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { cartApi, ordersApi, addressesApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { MapPin, CreditCard, Truck, Check, Plus } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';

const PAYMENT_METHODS = [
  { value: 'CashOnDelivery', label: 'Thanh toán khi nhận hàng (COD)', icon: Truck },
  { value: 'BankTransfer', label: 'Chuyển khoản ngân hàng', icon: CreditCard },
  { value: 'MoMo', label: 'Ví MoMo', icon: CreditCard },
];

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponCode = searchParams.get('coupon') || '';
  const { isAuthenticated, user } = useAuthStore();

  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CashOnDelivery');
  const [note, setNote] = useState('');
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    province: '',
    district: '',
    ward: '',
    streetAddress: '',
  });

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get().then(r => r.data.data),
    enabled: isAuthenticated,
  });

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressesApi.getAll().then(r => r.data.data),
    enabled: isAuthenticated,
    onSuccess: (data: any) => {
      const defaultAddr = data?.find((a: any) => a.isDefault);
      if (defaultAddr && !selectedAddressId) {
        setSelectedAddressId(defaultAddr.id);
      }
    },
  });

  const createAddressMutation = useMutation({
    mutationFn: (data: any) => addressesApi.create(data),
    onSuccess: (res) => {
      setSelectedAddressId(res.data.data.id);
      setShowNewAddress(false);
      toast.success('Đã thêm địa chỉ mới');
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: any) => ordersApi.create(data),
    onSuccess: (res) => {
      toast.success('Đặt hàng thành công!');
      router.push(`/orders/${res.data.data.id}?success=1`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Đặt hàng thất bại');
    },
  });

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const shipping = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal + shipping;

  const selectedAddress = addresses?.find((a: any) => a.id === selectedAddressId);

  const handlePlaceOrder = () => {
    if (!selectedAddressId && !showNewAddress) {
      toast.error('Vui lòng chọn địa chỉ giao hàng');
      return;
    }
    if (items.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }

    createOrderMutation.mutate({
      addressId: selectedAddressId,
      paymentMethod,
      couponCode: couponCode || undefined,
      note,
      items: items.map((item: any) => ({
        productId: item.product.id,
        variantId: item.variant?.id,
        quantity: item.quantity,
        price: item.price,
      })),
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="container-shop py-20 text-center">
        <p className="text-gray-500 mb-4">Vui lòng đăng nhập để thanh toán</p>
        <Link href="/login?redirect=/checkout" className="btn-primary">Đăng nhập</Link>
      </div>
    );
  }

  return (
    <div className="container-shop py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Thanh toán</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Shipping Address */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-600" />
              Địa chỉ giao hàng
            </h2>

            {addresses && addresses.length > 0 && (
              <div className="space-y-3 mb-4">
                {addresses.map((addr: any) => (
                  <label
                    key={addr.id}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedAddressId === addr.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={selectedAddressId === addr.id}
                      onChange={() => { setSelectedAddressId(addr.id); setShowNewAddress(false); }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-800">{addr.fullName}</span>
                        <span className="text-sm text-gray-500">· {addr.phone}</span>
                        {addr.isDefault && (
                          <span className="badge bg-primary-100 text-primary-700 text-xs">Mặc định</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {addr.streetAddress}, {addr.ward}, {addr.district}, {addr.province}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowNewAddress(!showNewAddress)}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-4 h-4" />
              Thêm địa chỉ mới
            </button>

            {showNewAddress && (
              <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Họ tên</label>
                    <input
                      type="text"
                      value={newAddress.fullName}
                      onChange={e => setNewAddress({ ...newAddress, fullName: e.target.value })}
                      className="input-field"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Số điện thoại</label>
                    <input
                      type="tel"
                      value={newAddress.phone}
                      onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })}
                      className="input-field"
                      placeholder="0901234567"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Địa chỉ chi tiết</label>
                  <input
                    type="text"
                    value={newAddress.streetAddress}
                    onChange={e => setNewAddress({ ...newAddress, streetAddress: e.target.value })}
                    className="input-field"
                    placeholder="Số nhà, tên đường, phường/xã"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Tỉnh/Thành phố</label>
                    <input
                      type="text"
                      value={newAddress.province}
                      onChange={e => setNewAddress({ ...newAddress, province: e.target.value })}
                      className="input-field"
                      placeholder="TP.HCM"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Quận/Huyện</label>
                    <input
                      type="text"
                      value={newAddress.district}
                      onChange={e => setNewAddress({ ...newAddress, district: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Phường/Xã</label>
                    <input
                      type="text"
                      value={newAddress.ward}
                      onChange={e => setNewAddress({ ...newAddress, ward: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
                <button
                  onClick={() => createAddressMutation.mutate(newAddress)}
                  className="btn-primary text-sm"
                >
                  Lưu địa chỉ
                </button>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-600" />
              Phương thức thanh toán
            </h2>
            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.value}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${paymentMethod === method.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method.value}
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)}
                  />
                  <method.icon className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Ghi chú (tùy chọn)</h2>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ghi chú về đơn hàng, ví dụ: thời gian hay chỉ dẫn địa điểm giao hàng chi tiết hơn"
              rows={3}
              className="input-field text-sm resize-none"
            />
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-4">Đơn hàng ({items.length} sản phẩm)</h3>
            <div className="space-y-3 mb-4">
              {items.map((item: any) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative">
                    <img
                      src={item.product.primaryImage || '/placeholder.jpg'}
                      alt={item.product.name}
                      className="w-14 h-14 object-cover rounded-lg bg-gray-100"
                    />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-700 text-white text-xs rounded-full flex items-center justify-center">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 line-clamp-1">{item.product.name}</p>
                    {item.variant && (
                      <p className="text-xs text-gray-400">{item.variant.size} / {item.variant.color}</p>
                    )}
                    <p className="text-sm font-semibold text-primary-600">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {couponCode && (
                <div className="flex justify-between text-green-600">
                  <span>Mã giảm giá</span>
                  <span>{couponCode}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Vận chuyển</span>
                <span>{shipping === 0 ? <span className="text-green-600">Miễn phí</span> : formatCurrency(shipping)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-800 pt-2 border-t border-gray-100">
                <span>Tổng cộng</span>
                <span className="text-primary-600 text-lg">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={createOrderMutation.isPending}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              {createOrderMutation.isPending ? 'Đang xử lý...' : (
                <>
                  <Check className="w-4 h-4" />
                  Đặt hàng
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center mt-2">
              Bằng cách đặt hàng, bạn đồng ý với điều khoản dịch vụ của chúng tôi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
