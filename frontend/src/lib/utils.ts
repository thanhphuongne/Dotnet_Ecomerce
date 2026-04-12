import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export function formatDateShort(dateString: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString));
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  Pending: 'Chờ xác nhận',
  Confirmed: 'Đã xác nhận',
  Processing: 'Đang xử lý',
  Shipped: 'Đang giao hàng',
  Delivered: 'Đã giao hàng',
  Cancelled: 'Đã hủy',
  Refunded: 'Đã hoàn tiền',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Processing: 'bg-purple-100 text-purple-800',
  Shipped: 'bg-indigo-100 text-indigo-800',
  Delivered: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
  Refunded: 'bg-gray-100 text-gray-800',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  Pending: 'Chưa thanh toán',
  Paid: 'Đã thanh toán',
  Failed: 'Thanh toán thất bại',
  Refunded: 'Đã hoàn tiền',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng',
  BankTransfer: 'Chuyển khoản ngân hàng',
  Momo: 'Ví MoMo',
  VNPay: 'VNPay',
  CreditCard: 'Thanh toán qua PayOS',
};

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export function getApiErrorMessage(error: any): string {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function generateStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}
