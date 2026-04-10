import Link from 'next/link';
import { productsApi, categoriesApi } from '@/lib/api';
import ProductCard from '@/components/shop/ProductCard';
import { formatCurrency } from '@/lib/utils';
import { ChevronRight, TruckIcon, ShieldCheck, RefreshCw, Headphones } from 'lucide-react';

async function getFeaturedProducts() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/products/featured?count=8`,
      { next: { revalidate: 300 } }
    );
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

async function getCategories() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/categories`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

const FEATURES = [
  {
    icon: TruckIcon,
    title: 'Miễn phí vận chuyển',
    desc: 'Cho đơn từ 500.000đ',
  },
  {
    icon: ShieldCheck,
    title: 'Bảo đảm chất lượng',
    desc: 'Cam kết 100% hàng chính hãng',
  },
  {
    icon: RefreshCw,
    title: 'Đổi trả dễ dàng',
    desc: '30 ngày đổi trả miễn phí',
  },
  {
    icon: Headphones,
    title: 'Hỗ trợ 24/7',
    desc: 'Tư vấn tận tâm mọi lúc',
  },
];

export default async function HomePage() {
  const [featuredProducts, categories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ]);

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-r from-primary-900 via-primary-700 to-primary-500 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container-shop relative py-20 md:py-32">
          <div className="max-w-2xl">
            <p className="text-primary-200 font-medium mb-3 text-sm uppercase tracking-widest">
              Bộ sưu tập mới 2025
            </p>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Thời trang <br />
              <span className="text-primary-300">Phong cách</span> của bạn
            </h1>
            <p className="text-lg text-primary-100 mb-8 max-w-lg">
              Khám phá hàng nghìn mẫu quần áo chất lượng, giá tốt. Cập nhật xu hướng mỗi ngày.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/products"
                className="bg-white text-primary-700 font-semibold px-8 py-3 rounded-full hover:bg-primary-50 transition-colors"
              >
                Mua sắm ngay
              </Link>
              <Link
                href="/products?hasSale=true"
                className="border-2 border-white text-white font-semibold px-8 py-3 rounded-full hover:bg-white/10 transition-colors"
              >
                Xem khuyến mãi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-6">
        <div className="container-shop">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-center space-x-3 p-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{feature.title}</p>
                  <p className="text-gray-500 text-xs">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container-shop py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Danh mục nổi bật</h2>
            <Link href="/products" className="flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium">
              Xem tất cả <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {categories.slice(0, 6).map((cat: any) => (
              <Link
                key={cat.id}
                href={`/products?categoryId=${cat.id}`}
                className="group flex flex-col items-center p-4 bg-gray-50 hover:bg-primary-50 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm group-hover:bg-primary-100 transition-colors">
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <span className="text-2xl">👕</span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700 text-center">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="container-shop pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Sản phẩm nổi bật</h2>
            <p className="text-gray-500 text-sm mt-1">Được yêu thích nhất tháng này</p>
          </div>
          <Link href="/products?isFeatured=true" className="flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium">
            Xem tất cả <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {featuredProducts.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p>Không có sản phẩm nào</p>
          </div>
        )}
      </section>

      {/* Sale Banner */}
      <section className="bg-gradient-to-r from-red-500 to-pink-500 py-12 my-6">
        <div className="container-shop text-center text-white">
          <p className="text-sm font-medium uppercase tracking-widest mb-2">Flash Sale</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Giảm đến 50%</h2>
          <p className="text-pink-100 mb-6">Hàng trăm mẫu quần áo đang được giảm giá sốc!</p>
          <Link
            href="/products?hasSale=true"
            className="bg-white text-red-600 font-bold px-8 py-3 rounded-full hover:bg-red-50 transition-colors inline-block"
          >
            Xem ngay
          </Link>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="container-shop py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Hàng mới về</h2>
            <p className="text-gray-500 text-sm mt-1">Cập nhật xu hướng mới nhất</p>
          </div>
          <Link href="/products?sortBy=createdAt&sortOrder=desc" className="flex items-center text-primary-600 text-sm font-medium">
            Xem tất cả <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...featuredProducts].reverse().slice(0, 4).map((product: any) => (
              <ProductCard key={`new-${product.id}`} product={product} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
