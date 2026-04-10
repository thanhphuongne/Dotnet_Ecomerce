'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, addressesApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { User, MapPin, KeyRound, Plus, Edit, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, setAuth, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile form
  const [profile, setProfile] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const { data: addresses, isLoading: loadingAddresses } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () => addressesApi.getAll().then(r => r.data.data),
    enabled: isAuthenticated && activeTab === 'addresses',
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => authApi.updateProfile(data),
    onSuccess: (res) => {
      toast.success('Đã cập nhật hồ sơ');
      // Update auth store with new user data
      const updatedUser = res.data.data;
      setAuth(updatedUser, undefined as any, undefined as any);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Cập nhật thất bại'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: any) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Đã đổi mật khẩu thành công');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Đổi mật khẩu thất bại'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => addressesApi.setDefault(id),
    onSuccess: () => {
      toast.success('Đã đặt làm địa chỉ mặc định');
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: number) => addressesApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa địa chỉ');
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
    },
  });

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    changePasswordMutation.mutate(passwordForm);
  };

  if (!isAuthenticated) {
    return (
      <div className="container-shop py-20 text-center">
        <p className="text-gray-500 mb-4">Vui lòng đăng nhập</p>
        <Link href="/login" className="btn-primary">Đăng nhập</Link>
      </div>
    );
  }

  const TABS = [
    { id: 'profile', label: 'Thông tin cá nhân', icon: User },
    { id: 'addresses', label: 'Địa chỉ', icon: MapPin },
    { id: 'password', label: 'Đổi mật khẩu', icon: KeyRound },
  ];

  return (
    <div className="container-shop py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Tài khoản của tôi</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full md:w-56 flex-shrink-0">
          <div className="card p-4">
            <div className="flex flex-col items-center mb-4 pb-4 border-b border-gray-100">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-2">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} className="w-16 h-16 rounded-full object-cover" alt="" />
                ) : (
                  <span className="text-2xl font-bold text-primary-600">{user?.fullName?.charAt(0)}</span>
                )}
              </div>
              <p className="font-semibold text-gray-800 text-sm">{user?.fullName}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>

            <nav className="space-y-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}

              <hr className="my-2 border-gray-100" />

              <Link href="/orders" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                📦 Đơn hàng của tôi
              </Link>
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Thông tin cá nhân</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Họ và tên</label>
                  <input
                    value={profile.fullName}
                    onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Email</label>
                  <input value={user?.email || ''} className="input-field bg-gray-50" disabled />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Số điện thoại</label>
                  <input
                    value={profile.phone}
                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Ngày sinh</label>
                  <input
                    type="date"
                    value={profile.dateOfBirth}
                    onChange={e => setProfile({ ...profile, dateOfBirth: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Giới tính</label>
                  <select
                    value={profile.gender}
                    onChange={e => setProfile({ ...profile, gender: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Chưa xác định</option>
                    <option value="Male">Nam</option>
                    <option value="Female">Nữ</option>
                    <option value="Other">Khác</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => updateProfileMutation.mutate(profile)}
                disabled={updateProfileMutation.isPending}
                className="btn-primary mt-5"
              >
                {updateProfileMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Địa chỉ của tôi</h2>
                <Link href="/checkout" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Thêm địa chỉ
                </Link>
              </div>

              {loadingAddresses ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
              ) : addresses?.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Chưa có địa chỉ nào</p>
              ) : (
                <div className="space-y-3">
                  {addresses?.map((addr: any) => (
                    <div key={addr.id} className={`p-4 border rounded-lg ${addr.isDefault ? 'border-primary-300 bg-primary-50' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800">{addr.fullName}</span>
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-500 text-sm">{addr.phone}</span>
                            {addr.isDefault && (
                              <span className="badge bg-primary-100 text-primary-700 text-xs">Mặc định</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {addr.streetAddress}, {addr.ward}, {addr.district}, {addr.province}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!addr.isDefault && (
                            <button
                              onClick={() => setDefaultMutation.mutate(addr.id)}
                              className="text-xs text-primary-600 hover:text-primary-700"
                            >
                              Đặt mặc định
                            </button>
                          )}
                          <button
                            onClick={() => { if (confirm('Xóa địa chỉ này?')) deleteAddressMutation.mutate(addr.id); }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'password' && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Đổi mật khẩu</h2>
              <div className="max-w-sm space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="input-field"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={changePasswordMutation.isPending}
                  className="btn-primary"
                >
                  {changePasswordMutation.isPending ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
