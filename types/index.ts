declare module "jsonwebtoken" {
  export interface JwtPayload {
    userId: number;
    email: string;
    isAdmin: boolean;
  }
}
// Add these types to your existing types file or create a new one

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface UserFilters {
  search?: string
  is_admin?: boolean
  profile_completed?: boolean
  page?: number
  limit?: number
}

export interface ProductFilters {
  search?: string
  category_id?: number
  is_featured?: boolean
  is_active?: boolean
  min_price?: number
  max_price?: number
  page?: number
  limit?: number
}

export interface OrderFilters {
  search?: string
  status?: string
  payment_status?: string
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}

export interface TransactionFilters {
  search?: string
  status?: string
  payment_method?: string
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}

export interface DateRangeParams {
  startDate?: string
  endDate?: string
}

export interface DashboardStats {
  userCount: number
  productCount: number
  orderCount: number
  totalRevenue: number
  recentOrders: Order[]
  salesByDate: {
    date: string
    order_count: number
    revenue: number
  }[]
  topProducts: {
    id: number
    name: string
    base_price: number
    order_count: number
    total_quantity: number
  }[]
}

export interface SalesReport {
  dailySales: {
    date: string
    order_count: number
    revenue: number
  }[]
  salesByPaymentMethod: {
    payment_method: string
    order_count: number
    revenue: number
  }[]
  salesByCategory: {
    category: string
    order_count: number
    total_quantity: number
    revenue: number
  }[]
  totals: {
    total_orders: number
    total_revenue: number
    average_order_value: number
  }
}

export interface ProductPerformance {
  id: number
  name: string
  total_orders: number
  total_quantity: number
  total_revenue: number
  average_rating: number
}

export interface UserStats {
  registrations: {
    date: string
    count: number
  }[]
  totalUsers: number
  activeUsers: number
  adminUsers: number
  incompleteProfiles: number
}

export interface StoreSettings {
  store_name: string
  store_email: string
  store_phone: string
  store_address: string
  currency: string
  logo_url: string
  favicon_url: string
  meta_title: string
  meta_description: string
  social_links: {
    facebook?: string
    twitter?: string
    instagram?: string
    youtube?: string
  }
}

export interface EmailSettings {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_password: string
  from_email: string
  from_name: string
  enable_order_confirmation: boolean
  enable_shipping_updates: boolean
  enable_marketing_emails: boolean
}

export interface PaymentSettings {
  paystack_public_key: string
  paystack_secret_key: string
  paystack_enabled: boolean
  cash_on_delivery_enabled: boolean
  bank_transfer_enabled: boolean
  bank_details: string
}

export interface ShippingMethod {
  id: number
  name: string
  description: string
  price: number
  is_active: boolean
  estimated_days: string
}

export interface TaxRate {
  id: number
  name: string
  rate: number
  is_default: boolean
  country: string
  state?: string
}

export interface UserCreateData {
  email: string
  password: string
  first_name: string
  last_name: string
  is_admin?: boolean
  phone?: string
  whatsapp?: string
}

export interface UserUpdateData {
  email?: string
  first_name?: string
  last_name?: string
  is_admin?: boolean
  phone?: string
  whatsapp?: string
  profile_complete?: boolean
}

export interface ProductCreateData {
  name: string
  description: string
  base_price: number
  category_id?: number
  is_featured?: boolean
  is_active?: boolean
  meta_title?: string
  meta_description?: string
}

export interface ProductUpdateData {
  name?: string
  description?: string
  base_price?: number
  category_id?: number
  is_featured?: boolean
  is_active?: boolean
  meta_title?: string
  meta_description?: string
}

export interface CategoryCreateData {
  name: string
  description?: string
  slug?: string
}

export interface CategoryUpdateData {
  name?: string
  description?: string
  slug?: string
}

export interface OrderUpdateData {
  status?: string
  payment_status?: string
  shipping_address?: string
  tracking_number?: string
  notes?: string
}

export interface Order {
  id: number
  customer_id: number
  order_date: string
  total_amount: number
  status: string
  payment_status: string
  shipping_address: string
  tracking_number: string
  notes: string
  created_at: string
  updated_at: string
}
