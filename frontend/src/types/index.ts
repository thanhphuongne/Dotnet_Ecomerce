// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'Customer' | 'Staff' | 'Admin';

export interface User {
  id: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  user: User;
}

// ─── Category ─────────────────────────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: number;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
}

// ─── Product ──────────────────────────────────────────────────────────────────
export interface ProductImage {
  id: number;
  url: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: number;
  size: string;
  color: string;
  colorHex?: string;
  sku?: string;
  stock: number;
  priceAdjustment?: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface ColorOption {
  name: string;
  hex?: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  basePrice: number;
  salePrice?: number;
  displayPrice: number;
  discountPercent?: number;
  primaryImage?: string;
  categoryId: number;
  categoryName: string;
  brand?: string;
  material?: string;
  careInstructions?: string;
  tags?: string;
  averageRating: number;
  totalReviews: number;
  totalStock: number;
  isFeatured: boolean;
  soldCount: number;
  isActive?: boolean;
  createdAt: string;
  images?: ProductImage[];
  variants?: ProductVariant[];
  availableSizes?: string[];
  availableColors?: ColorOption[];
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
export interface CartItem {
  id: number;
  productId: number;
  productName: string;
  productImage?: string;
  productSlug?: string;
  variantId?: number;
  size?: string;
  color?: string;
  colorHex?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  stockAvailable: number;
  isAvailable: boolean;
}

export interface CartSummary {
  items: CartItem[];
  totalItems: number;
  subTotal: number;
  shippingFee: number;
  total: number;
}

// ─── Order ────────────────────────────────────────────────────────────────────
export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Refunded';
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';
export type PaymentMethod = 'COD' | 'BankTransfer' | 'Momo' | 'VNPay' | 'CreditCard';

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productImage?: string;
  size?: string;
  color?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderStatusHistory {
  id: number;
  status: OrderStatus;
  note?: string;
  createdAt: string;
}

export interface Order {
  id: number;
  orderCode: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  itemCount: number;
  firstItemImage?: string;
  firstItemName?: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;

  // Detail fields
  shippingFullName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingDistrict?: string;
  shippingWard?: string;
  subTotal?: number;
  shippingFee?: number;
  discountAmount?: number;
  couponCode?: string;
  note?: string;
  trackingNumber?: string;
  cancelReason?: string;
  updatedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  items?: OrderItem[];
  statusHistories?: OrderStatusHistory[];
}

// ─── Address ──────────────────────────────────────────────────────────────────
export interface Address {
  id: number;
  userId: number;
  fullName: string;
  phoneNumber: string;
  addressLine: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
  createdAt: string;
}

// ─── Review ───────────────────────────────────────────────────────────────────
export interface Review {
  id: number;
  rating: number;
  title?: string;
  content?: string;
  images?: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  user: {
    fullName: string;
    avatarUrl?: string;
  };
}

// ─── Coupon ───────────────────────────────────────────────────────────────────
export interface Coupon {
  id: number;
  code: string;
  description?: string;
  type: 'Percentage' | 'FixedAmount' | 'FreeShipping';
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface CouponValidateResult {
  isValid: boolean;
  message?: string;
  discountAmount: number;
  couponType?: string;
  couponValue: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  todayRevenue: number;
  monthRevenue: number;
  totalRevenue: number;
  todayOrders: number;
  monthOrders: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  pendingOrders: number;
  lowStockProducts: number;
  revenueChart: RevenueChartData[];
  topProducts: TopProduct[];
  recentOrders: Order[];
}

export interface RevenueChartData {
  label: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  image?: string;
  soldCount: number;
  revenue: number;
}

// ─── Paginated Response ───────────────────────────────────────────────────────
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ─── API Response wrapper ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── Query Params ─────────────────────────────────────────────────────────────
export interface ProductQueryParams {
  search?: string;
  categoryId?: number;
  brand?: string;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  hasSale?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface OrderQueryParams {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
