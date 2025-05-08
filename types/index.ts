// Core data models
export interface User {
  id: number
  email: string
  password?: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  whatsapp: string | null
  gender: string | null
  address: string | null
  is_admin: boolean
  google_id: string | null
  profile_complete: boolean
  created_at: string | Date
  updated_at: string | Date
}

export interface Category {
  id: number
  name: string
  description: string | null
  created_at: string | Date
  updated_at: string | Date
}

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  category_id: number | null
  stock_quantity: number
  created_at: string | Date
  updated_at: string | Date
  category?: Category
  images?: ProductImage[]
  sizes?: ProductSize[]
  category_name?: string
}

export interface ProductImage {
  id: number
  product_id: number
  image_url: string
  is_primary: boolean
  width: number | null
  height: number | null
  alt_text: string | null
  created_at: string | Date
}

export interface ProductSize {
  id: number
  product_id: number
  size: string
  stock_quantity: number
  created_at?: string | Date
}

export interface Cart {
  id: number
  user_id: number
  created_at: string | Date
  updated_at: string | Date
  items?: CartItem[]
  user?: User
  total?: number
}

export interface CartItem {
  id: number
  cart_id: number
  product_id: number
  size: string | null
  quantity: number
  created_at: string | Date
  updated_at: string | Date
  product?: Product | any
}

export interface Order {
  id: number
  order_number: string
  user_id: number | null
  total_amount: number
  currency_code: string | null
  currency_rate: number | null
  status: string
  shipping_address: string
  shipping_method: string | null
  payment_method: string | null
  payment_reference: string | null
  payment_status: string | null
  payment_date: string | Date | null
  created_at: string | Date
  updated_at: string | Date
  user?: User
  items?: OrderItem[]
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  product_name?: string
  quantity: number
  price: number
  size: string | null
  created_at: string | Date
  updated_at?: string | Date
  product?: Product
}

export interface Token {
  id?: number
  user_id?: number
  token: string
  expires_at: string | Date
  created_at?: string | Date
  updated_at?: string | Date
}

export interface VerificationCode {
  id: number
  user_id: number
  code: string
  type: 'password_reset' | 'email_verification' | 'phone_verification' | string
  expires_at: string | Date
  attempts: number
  verified: boolean
  created_at: string | Date
}

export interface PaymentVerificationToken {
  id: number
  order_id: number
  order_number: string
  token: string
  expires_at: string | Date
  created_at: string | Date
  used: boolean
  usage_count: number
}

export interface PasswordResetToken {
  id: number
  user_id: number
  token: string
  expires_at: string | Date
  used: boolean
  created_at: string | Date
}

export interface Transaction {
  id: number
  reference: string
  order_id: number
  amount: number
  currency: string
  payment_method: string
  status: string
  created_at: string | Date
  user?: User
}

// API request/response types
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
}

export interface RegisterRequest {
  email: string
  password: string
  first_name?: string
  last_name?: string
  phone?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  per_page: number
  current_page: number
  last_page: number
  from: number
  to: number
}

// Controller types
export interface UserCreateData {
  email: string
  password?: string
  first_name?: string
  last_name?: string
  phone?: string
  whatsapp?: string
  gender?: string
  address?: string
  is_admin?: boolean
  google_id?: string
}

export interface UserUpdateData {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  whatsapp?: string
  gender?: string
  address?: string
  is_admin?: boolean
  profile_complete?: boolean
  google_id?: string
}

export interface UserInput {
  email: string
  password?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  whatsapp?: string | null
  gender?: string | null
  address?: string | null
  is_admin?: boolean
  google_id?: string | null
  profile_complete?: boolean
}

export interface ProductCreateData {
  name: string
  description?: string
  price: number
  category_id?: number
  stock_quantity?: number
  sizes?: Array<{
    size: string
    stock_quantity: number
  }>
  images?: Array<{
    image_url: string
    is_primary?: boolean
    width?: number
    height?: number
    alt_text?: string
  }>
}

export interface ProductUpdateData {
  name?: string
  description?: string
  price?: number
  category_id?: number
  stock_quantity?: number
}

export interface ProductInput {
  name: string
  description?: string
  price: number
  category_id?: number
  stock_quantity?: number
}

export interface CategoryCreateData {
  name: string
  description?: string
}

export interface CategoryUpdateData {
  name?: string
  description?: string
}

export interface CategoryInput {
  name: string
  description?: string
}

export interface OrderCreateData {
  user_id?: number
  total_amount: number
  currency_code?: string
  currency_rate?: number
  status?: string
  shipping_address: string
  shipping_method?: string
  payment_method?: string
  payment_reference?: string
  payment_status?: string
  items: Array<{
    product_id: number
    product_name: string
    quantity: number
    price: number
    size?: string
  }>
}

export interface OrderUpdateData {
  status?: string
  payment_status?: string
  payment_reference?: string
  payment_date?: string
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
}

export interface ProductWithDetails extends Product {
  category_name?: string
  images: ProductImage[]
  sizes: ProductSize[]
}

// Settings types
export interface GeneralSettings {
  site_name: string
  contact_email: string
  support_phone: string
  currency: string
  tax_rate: number
  shipping_fee: number
  free_shipping_threshold: number
}

export interface EmailSettings {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_password: string
  from_email: string
  from_name: string
}

export interface PaymentSettings {
  payment_gateway: string
  paystack_public_key: string
  paystack_secret_key: string
  enable_cod: boolean
}

// Authentication related interfaces
export interface DecodedToken {
  userId: number
  email: string
  isAdmin: boolean
  iat?: number
  exp?: number
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number
    email: string
    is_admin: boolean
  }
}

export interface ExtendedNextApiRequest extends Request {
  user?: {
    id: number
    email: string
    first_name: string
    last_name: string
    phone?: string
    whatsapp?: string
  }
}

// Analytics types
export interface DashboardStats {
  total_orders: number
  total_revenue: number
  total_customers: number
  total_products: number
  recent_orders: Order[]
  sales_by_date: {
    date: string
    sales: number
  }[]
}

export interface SalesReport {
  total_sales: number
  total_orders: number
  average_order_value: number
  sales_by_date: Array<{
    date: string
    sales: number
    orders: number
  }>
}

// Filter types
export interface UserFilters {
  is_admin?: boolean
  profile_complete?: boolean
  search?: string
  page?: number
  limit?: number
}

export interface ProductFilters {
  category_id?: number
  min_price?: number
  max_price?: number
  search?: string
  page?: number
  limit?: number
}

export interface OrderFilters {
  status?: string
  payment_status?: string
  payment_method?: string
  start_date?: string
  end_date?: string
  user_id?: number
  page?: number
  limit?: number
}

export interface DateRangeParams {
  start_date?: string
  end_date?: string
  period?: 'day' | 'week' | 'month' | 'year'
}

export interface CreateOrderFromCartData {
  user_id: number
  shipping_address: string
  shipping_method: string
  payment_method: string
  currency_code?: string
  currency_rate?: number
}


// For sales by period data
export interface SalesByPeriodItem {
  date: string;
  sales: string;
}

// For recent order data with user info
export interface RecentOrderWithUser {
  id: number;
  user_id: number;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  shipping_address: string;
  total: number;
  created_at: string;
  updated_at: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

// For top product data
export interface TopProductItem {
  id: number;
  name: string;
  price: number;
  order_count: string;
  total_quantity: string;
}

// Complete dashboard stats response
export interface DashboardStatsResponse {
  totalUsers: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  salesByDay: SalesByPeriodItem[];
  recentOrders: RecentOrderWithUser[];
  topProducts: TopProductItem[];
}

// Database row types for internal use
export interface SalesByPeriodRow {
  date: string;
  sales: string;
}

export interface RecentOrderRow {
  id: number;
  user_id: number;
  order_number: string;
  total_amount: string;
  status: string;
  payment_status: string;
  payment_method: string;
  shipping_address: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface TopProductRow {
  id: number;
  name: string;
  price: string;
  order_count: string;
  total_quantity: string;
}

export interface OrderStatusRow {
  status: string;
  count: string;
}
// Paystack related interfaces
export interface  PaystackPaymentResponse {
  status: boolean
  message?: string
  data?: {
    authorization_url?: string
    access_code?: string
    reference?: string
  }
  usedCurrency?: string
  originalCurrency?: string
}

export interface PaystackVerificationResponse {
  status: boolean;
  message?: string;
  data?: {
    id?: number;
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    transaction_date?: string;
    gateway_response?: string;
    channel?: string;
    metadata?: {
      order_id?: string;
      customer_name?: string;
      customer_phone?: string;
      original_currency?: string;
      original_amount?: number;
      exchange_rate?: number;
      fallback_to_ngn?: boolean;
      custom_fields?: Array<{
        display_name: string;
        variable_name: string;
        value: string;
      }>;
      [key: string]: any;
    };
    customer?: {
      id?: number;
      email?: string;
      name?: string;
      phone?: string;
    };
  };
}

export interface Transaction {
  reference: string;
  order_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  // Add other Transaction fields as needed
}

// Interface for InitializePayment function parameters
export interface InitializePaymentParams {
  orderId: string;
  amount: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  callbackUrl: string;
  currencyCode?: string;  // Default to NGN in implementation
  exchangeRate?: number;  // Default to 1 in implementation
  additionalMetadata?: Record<string, any>;
}

// Interface for Paystack payment payload
export interface PaystackPaymentPayload {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callback_url: string;
  metadata: {
    order_id: string;
    customer_name: string;
    customer_phone: string;
    original_currency: string;
    original_amount: number;
    exchange_rate: number;
    custom_fields: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
    [key: string]: any;
  };
}
