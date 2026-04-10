'use client';

import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils';
import { TrendingUp, ShoppingBag, Users, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import Link from 'next/link';

const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

export default function AdminDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => ordersApi.getDashboardStats().then(r => r.data.data),
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => ordersApi.getAll({ page: 1, pageSize: 5 }).then(r => r.data.data),
  });

  const statCards = [
    {
      title: 'Doanh thu tháng này',
      value: formatCurrency(stats?.monthlyRevenue || 0),
      change: stats?.revenueGrowth || 0,
      icon: TrendingUp,
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Đơn hàng mới',
      value: stats?.monthlyOrders || 0,
      change: stats?.ordersGrowth || 0,
      icon: ShoppingBag,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'Khách hàng mới',
      value: stats?.newCustomers || 0,
      change: stats?.customersGrowth || 0,
      icon: Users,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      title: 'Sản phẩm',
      value: stats?.totalProducts || 0,
      change: null,
      icon: Package,
      color: 'text-pink-600 bg-pink-100',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tổng quan</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              {stat.change !== null && (
                <div className={`flex items-center text-xs font-medium ${stat.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {stat.change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {Math.abs(stat.change)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.title}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Doanh thu 30 ngày gần đây</h3>
          {stats?.revenueChart ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(value), 'Doanh thu']}
                  labelFormatter={label => `Ngày ${label}`}
                />
                <Line type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-300">Đang tải...</div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Sản phẩm bán chạy</h3>
          {stats?.topProducts ? (
            <div className="space-y-3">
              {stats.topProducts.slice(0, 5).map((product: any, i: number) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{product.name}</p>
                    <div className="flex items-center gap-1">
                      <div
                        className="h-1.5 bg-primary-400 rounded-full"
                        style={{ width: `${(product.sold / (stats.topProducts[0]?.sold || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary-600 flex-shrink-0">
                    {product.sold} bán
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-300">Đang tải...</div>
          )}
        </div>
      </div>

      {/* Order Status Summary + Recent Orders */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Trạng thái đơn hàng</h3>
          {stats?.ordersByStatus ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={stats.ordersByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="count"
                  nameKey="status"
                >
                  {stats.ordersByStatus.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v} đơn`, 'Số lượng']} />
              </PieChart>
            </ResponsiveContainer>
          ) : null}
          <div className="grid grid-cols-2 gap-1 mt-2">
            {stats?.ordersByStatus?.map((s: any, i: number) => (
              <div key={s.status} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-gray-500 truncate">
                  {ORDER_STATUS_LABELS[s.status as keyof typeof ORDER_STATUS_LABELS]} ({s.count})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="xl:col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Đơn hàng gần đây</h3>
            <Link href="/admin/orders" className="text-sm text-primary-600 hover:text-primary-700">
              Xem tất cả →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                  <th className="pb-2 font-medium">Mã đơn</th>
                  <th className="pb-2 font-medium">Khách hàng</th>
                  <th className="pb-2 font-medium">Tổng tiền</th>
                  <th className="pb-2 font-medium">Trạng thái</th>
                  <th className="pb-2 font-medium">Ngày đặt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders?.items?.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5">
                      <Link href={`/admin/orders/${order.id}`} className="text-primary-600 hover:underline font-medium">
                        #{order.orderCode}
                      </Link>
                    </td>
                    <td className="py-2.5 text-gray-700">{order.customerName}</td>
                    <td className="py-2.5 font-medium">{formatCurrency(order.totalAmount)}</td>
                    <td className="py-2.5">
                      <span className={`badge text-xs ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}`}>
                        {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-400">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
