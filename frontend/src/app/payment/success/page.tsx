'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const search = useSearchParams();
  const orderCode = search.get('orderCode') || '';

  return (
    <div className="container-shop py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">Thanh toán thành công</h1>
      <p className="text-gray-600 mb-4">Cảm ơn bạn đã thanh toán. Mã đơn hàng: <strong>{orderCode}</strong></p>
      <Link href="/orders" className="btn-primary">Xem đơn hàng</Link>
    </div>
  );
}
