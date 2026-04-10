'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '@/lib/utils';
import { CheckCircle, Package, Truck, Home, RotateCcw, X } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';

const STATUS_STEPS = [
  { key: 'Pending', label: 'Chờ xác nhận', icon: Package },
  { key: 'Confirmed', label: 'Đã xác nhận', icon: CheckCircle },
  { key: 'Shipping', label: 'Đang giao', icon: Truck },
  { key: 'Delivered', label: 'Đã nhận', icon: Home },
];

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('success') === '1';

  const { data: orderData, isLoading, refetch } = useQuery({
    queryKey: ['order', params.id],
    queryFn: () => ordersApi.getById(parseInt(params.id)).then(r => r.data.data),
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel(parseInt(params.id)),
    onSuccess: () => {
      toast.success('Đã hủy đơn hàng');
      refetch();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Không thể hủy đơn hàng'),
  });

  if (isLoading) {
    return (
      <div className="container-shop py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
        <div className="card h-48 bg-gray-100" />
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="container-shop py-20 text-center">
        <p className="text-gray-500">Không tìm thấy đơn hàng</p>
        <Link href="/orders" className="btn-primary mt-4 inline-block">Quay lại</Link>
      </div>
    );
  }

  const order = orderData;
  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order.status);
  const canCancel = ['Pending', 'Confirmed'].includes(order.status);

  return (
    <div className="container-shop py-8">
      {isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Đặt hàng thành công!</p>
            <p className="text-sm text-green-600">Cảm ơn bạn đã mua hàng. Chúng tôi sẽ xử lý đơn hàng sớm nhất.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Đơn hàng #{order.orderCode}</h1>
          <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}`}>
            {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
          </span>
          {canCancel && (
            <button
              onClick={() => {
                if (confirm('Bạn chắc chắn muốn hủy đơn hàng này?')) {
                  cancelMutation.mutate();
                }
              }}
              className="flex items-center gap-1 text-red-500 hover:text-red-600 text-sm border border-red-200 px-3 py-1.5 rounded-lg"
            >
              <X className="w-4 h-4" />
              Hủy đơn
            </button>
          )}
        </div>
      </div>

      {/* Status steps */}
      {order.status !== 'Cancelled' && order.status !== 'Returned' && (
        <div className="card p-5 mb-5">
          <div className="flex items-center">
            {STATUS_STEPS.map((step, i) => {
              const isDone = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step.key} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDone ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'} ${isCurrent ? 'ring-4 ring-primary-100' : ''}`}>
                      <step.icon className="w-5 h-5" />
                    </div>
                    <p className={`text-xs mt-1 text-center ${isDone ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded ${i < currentStepIndex ? 'bg-primary-600' : 'bg-gray-100'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Sản phẩm đã đặt</h3>
            <div className="space-y-3">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex gap-3">
                  <img
                    src={item.productImage || '/placeholder.jpg'}
                    alt={item.productName}
                    className="w-16 h-16 object-cover rounded-lg bg-gray-100 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-800">{item.productName}</p>
                    {(item.size || item.color) && (
                      <p className="text-xs text-gray-500">{item.size} {item.color && `/ ${item.color}`}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-500">x{item.quantity}</span>
                      <span className="font-semibold text-primary-600">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status History */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Lịch sử trạng thái</h3>
              <div className="space-y-3">
                {order.statusHistory.map((h: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 bg-primary-400 rounded-full mt-1" />
                      {i < order.statusHistory.length - 1 && (
                        <div className="w-px h-8 bg-gray-200 mt-1" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {ORDER_STATUS_LABELS[h.status as keyof typeof ORDER_STATUS_LABELS]}
                      </p>
                      {h.note && <p className="text-xs text-gray-500">{h.note}</p>}
                      <p className="text-xs text-gray-400">{formatDate(h.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Address */}
          {order.address && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Địa chỉ giao hàng</h3>
              <p className="font-medium text-sm">{order.address.fullName}</p>
              <p className="text-sm text-gray-500">{order.address.phone}</p>
              <p className="text-sm text-gray-500">
                {order.address.streetAddress}, {order.address.ward}, {order.address.district}, {order.address.province}
              </p>
            </div>
          )}

          {/* Order summary */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Tóm tắt thanh toán</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Vận chuyển</span>
                <span>
                  {order.shippingFee === 0
                    ? <span className="text-green-600">Miễn phí</span>
                    : formatCurrency(order.shippingFee)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-gray-800 pt-2 border-t border-gray-100">
                <span>Tổng cộng</span>
                <span className="text-primary-600">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
              <p>Thanh toán: {PAYMENT_METHOD_LABELS[order.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS]}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
