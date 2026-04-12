'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentCancelPage() {
  const search = useSearchParams();
  const orderCode = search.get('orderCode') || '';
  const code = search.get('code') || '';
  const id = search.get('id') || '';
  const status = search.get('status') || '';
  const cancel = search.get('cancel') || '';

  const title = status === 'CANCELLED' ? 'Thanh toán thất bại' : 'Thanh toán bị hủy';

  return (
    <div className="container-shop py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <p className="text-gray-600 mb-4">
        Thanh toán cho đơn hàng <strong>{orderCode || '—'}</strong> không hoàn thành.
      </p>

      <div className="text-sm text-gray-500 mb-6 space-y-1">
        <div>Mã (code): <strong>{code || '—'}</strong></div>
        <div>Trạng thái: <strong>{status || (cancel ? 'CANCELLED' : '—')}</strong></div>
        <div>Giao dịch (id): <strong>{id || '—'}</strong></div>
      </div>

      <div className="flex justify-center gap-3">
        {orderCode ? (
          <Link href={`/orders/${orderCode}`} className="btn-outline">Xem đơn hàng</Link>
        ) : null}
        <Link href="/checkout" className="btn-primary">Thanh toán lại</Link>
      </div>

      <p className="mt-6 text-sm text-gray-400">Nếu cần trợ giúp, liên hệ hỗ trợ khách hàng kèm mã lỗi bên trên.</p>
    </div>
  );
}
