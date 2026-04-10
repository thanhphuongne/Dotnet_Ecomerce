import Link from 'next/link';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container-shop py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-1 mb-4">
              <span className="text-xl font-bold text-primary-400">Ecom</span>
              <span className="text-xl font-bold text-white">Shop</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              Thời trang chất lượng cao, giá cả hợp lý. Hàng ngàn mẫu mã đa dạng, phù hợp mọi phong cách.
            </p>
            <div className="flex space-x-3 mt-4">
              <a href="#" className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-500 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-sky-500 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Danh mục</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href: '/products?category=ao-thun', label: 'Áo thun' },
                { href: '/products?category=ao-so-mi', label: 'Áo sơ mi' },
                { href: '/products?category=quan-jeans', label: 'Quần jeans' },
                { href: '/products?category=quan-short', label: 'Quần short' },
                { href: '/products?category=vay-dam', label: 'Váy & Đầm' },
                { href: '/products?category=ao-khoac', label: 'Áo khoác' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Hỗ trợ</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href: '/about', label: 'Về chúng tôi' },
                { href: '/contact', label: 'Liên hệ' },
                { href: '/faq', label: 'FAQ' },
                { href: '/returns', label: 'Chính sách đổi trả' },
                { href: '/shipping', label: 'Chính sách giao hàng' },
                { href: '/privacy', label: 'Chính sách bảo mật' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Liên hệ</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 mt-0.5 text-primary-400 flex-shrink-0" />
                <span>123 Đường ABC, Quận 1, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span>0901 234 567</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span>support@ecomshop.com</span>
              </li>
            </ul>

            <div className="mt-4">
              <h4 className="text-white text-sm font-medium mb-2">Đăng ký nhận ưu đãi</h4>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Email của bạn"
                  className="flex-1 bg-gray-800 text-sm px-3 py-2 rounded-l-lg focus:outline-none border border-gray-700 text-gray-300"
                />
                <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-r-lg text-sm transition-colors">
                  Đăng ký
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
          <p>© 2025 EcomShop. Tất cả quyền được bảo lưu.</p>
          <div className="flex items-center space-x-4 mt-3 md:mt-0">
            <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="h-5 opacity-60" />
          </div>
        </div>
      </div>
    </footer>
  );
}
