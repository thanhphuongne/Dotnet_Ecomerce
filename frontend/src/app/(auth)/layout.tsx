import Header from '@/components/layout/Header';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-pink-50">
      <Header />
      <div className="py-12">{children}</div>
    </div>
  );
}
