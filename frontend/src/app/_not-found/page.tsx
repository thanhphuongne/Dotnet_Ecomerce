import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="container-shop py-20 text-center">
      <div className="max-w-4xl mx-auto flex items-center gap-8">
        <div className="flex-1">
          <img src="/images/404-illustration.png" alt="404" className="w-full rounded-lg" />
        </div>
        <div className="flex-1 text-left">
          <h1 className="text-4xl font-bold mb-4">Không tìm thấy trang</h1>
          <p className="text-gray-600 mb-6">Trang bạn đang truy cập không tồn tại hoặc đã được di chuyển. Hãy thử một trong các lựa chọn dưới đây.</p>

          <div className="flex gap-3">
            <Link href="/" className="btn-primary">Về trang chủ</Link>
            <Link href="/" className="btn-outline">Xem danh mục</Link>
          </div>

          <p className="mt-6 text-sm text-gray-400">Nếu bạn nghĩ đây là lỗi, vui lòng liên hệ bộ phận hỗ trợ.</p>
        </div>
      </div>
    </div>
  );
}
