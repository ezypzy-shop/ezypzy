// Type definitions for the app

export type Category = {
  id: string;
  name: string;
  emoji: string;
};

export type Business = {
  id: number;
  name: string;
  description: string;
  image: string;
  type: string;
  status: 'Open' | 'Closed';
  phone?: string;
  location?: string;
  delivery_time?: string;
  min_order?: string;
  rating?: number;
  tags?: string[];
};

export type Product = {
  id: number;
  business_id: number;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  image: string;
  category: string;
  in_stock: boolean;
};

export type Order = {
  id: number;
  order_number: string;
  user_id?: number;
  business_id: number;
  status: string;
  delivery_type: 'delivery' | 'pickup';
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address?: string;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  business_name?: string;
  business_image?: string;
  items?: OrderItem[];
};

export type OrderItem = {
  id: number;
  order_id: number;
  product_id?: number;
  product_name: string;
  quantity: number;
  price: number;
};

export type User = {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  login_method?: string;
};

export type Address = {
  id: number;
  user_id: number;
  title: string;
  address_line: string;
  city?: string;
  postal_code?: string;
  is_default: boolean;
};

export type Favorite = {
  id: number;
  user_id: number;
  business_id: number;
  created_at: string;
};

// Static categories list
export const categories: Category[] = [
  { id: '1', name: 'All', emoji: '🏪' },
  { id: '2', name: 'Grocery', emoji: '🛒' },
  { id: '3', name: 'Pharmacy', emoji: '💊' },
  { id: '4', name: 'Bakery', emoji: '🧁' },
  { id: '5', name: 'Restaurant', emoji: '🍽️' },
  { id: '6', name: 'Kitchen', emoji: '👨‍🍳' },
  { id: '7', name: 'Household', emoji: '🏠' },
  { id: '8', name: 'Toys', emoji: '🧸' },
  { id: '9', name: 'Other', emoji: '🌐' },
];
