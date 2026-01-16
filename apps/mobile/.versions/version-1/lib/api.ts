// Ensure API_URL always has a value - prioritize BACKEND_URL over APP_URL
const getApiUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_APP_URL || '';
  return url;
};

// Simple fetch with retry for transient errors (502, 503, 504)
const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3): Promise<Response> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Retry on server errors (502, 503, 504)
      if (response.status >= 502 && response.status <= 504 && attempt < retries) {
        console.log(`Retry ${attempt + 1}/${retries} for ${url} (status ${response.status})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        continue;
      }
      
      return response;
    } catch (error: any) {
      lastError = error;
      console.log(`Retry ${attempt + 1}/${retries} for ${url} (error: ${error?.message})`);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries');
};

// Simple fetch - no timeout to avoid AbortError issues
const simpleFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  return fetch(url, options);
};

// Auth API
export async function loginUser(email: string, password: string) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    return await response.json();
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
}

export async function socialLogin(email: string, name: string, loginMethod: 'google' | 'facebook', avatarUrl?: string) {
  try {
    // First create or update user
    await createOrUpdateUser({
      name,
      email,
      login_method: loginMethod,
      avatar_url: avatarUrl,
    });
    
    const API_URL = getApiUrl();
    // Then login
    const response = await simpleFetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, login_method: loginMethod }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    return await response.json();
  } catch (error) {
    console.error('Error with social login:', error);
    throw error;
  }
}

export async function registerUser(name: string, email: string, password: string, isBusinessUser?: boolean) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        email, 
        password,
        login_method: 'email',
        is_business_user: isBusinessUser || false,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    return await response.json();
  } catch (error) {
    console.error('Error registering:', error);
    throw error;
  }
}

// Business API
export async function fetchBusinesses(category?: string, search?: string) {
  try {
    const API_URL = getApiUrl();
    if (!API_URL) {
      console.warn('API URL not configured, returning empty businesses');
      return [];
    }
    
    let url = `${API_URL}/api/businesses`;
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (search) params.append('search', search);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await fetchWithRetry(url);
    if (!response.ok) throw new Error('Failed to fetch businesses');
    return await response.json();
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return [];
  }
}

export async function fetchUserBusinesses(userId: number) {
  try {
    const API_URL = getApiUrl();
    if (!API_URL) return [];
    
    const url = `${API_URL}/api/businesses?user_id=${userId}`;
    console.log('Fetching user businesses from:', url);
    
    const response = await fetchWithRetry(url);
    if (!response.ok) {
      console.error('Failed to fetch user businesses, status:', response.status);
      return [];
    }
    const data = await response.json();
    console.log('User businesses response:', data);
    return data || [];
  } catch (error) {
    console.error('Error fetching user businesses:', error);
    return [];
  }
}

export async function fetchBusiness(id: number) {
  try {
    // Validate ID before making request
    if (!id || isNaN(id) || id <= 0) {
      console.warn('Invalid business ID provided:', id);
      return null;
    }
    
    const API_URL = getApiUrl();
    if (!API_URL) return null;
    
    const url = `${API_URL}/api/businesses/${id}`;
    
    // Use fetchWithRetry for transient errors
    const response = await fetchWithRetry(url, {}, 3);
    
    if (response.status === 404) {
      console.warn('Business not found with ID:', id);
      return null;
    }
    
    if (response.status === 400) {
      console.warn('Invalid business ID:', id);
      return null;
    }
    
    if (!response.ok) {
      // Don't log 502/503/504 as errors since we already retried
      if (response.status < 502 || response.status > 504) {
        console.error('Failed to fetch business, status:', response.status);
      }
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    // Silently handle AbortError - likely due to component unmount
    if (error?.name === 'AbortError') {
      return null;
    }
    // Don't spam console for transient network errors
    if (error?.message?.includes('fetch')) {
      return null;
    }
    console.error('Error fetching business:', error);
    return null;
  }
}

export async function createBusiness(businessData: {
  user_id: number;
  name: string;
  description: string;
  image?: string;
  type: string;
  phone: string;
  email?: string;
  address: string;
  location?: string;
  categories: string[];
  payment_methods: string[];
  delivery_options?: string;
  delivery_fee?: number;
  min_order?: string;
  delivery_time?: string;
  order_mode?: 'catalog' | 'custom' | 'both';
}) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/businesses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...businessData, status: 'Open' }),
    });
    if (!response.ok) throw new Error('Failed to create business');
    return await response.json();
  } catch (error) {
    console.error('Error creating business:', error);
    throw error;
  }
}

export async function updateBusiness(id: number, businessData: {
  user_id: number;
  name: string;
  description: string;
  image?: string;
  type: string;
  status?: string;
  phone: string;
  email?: string;
  address: string;
  location?: string;
  categories: string[];
  payment_methods: string[];
  delivery_options?: string;
  delivery_fee?: number;
  min_order?: string;
  delivery_time?: string;
  order_mode?: 'catalog' | 'custom' | 'both';
}) {
  try {
    const API_URL = getApiUrl();
    console.log('=== Updating business ===');
    console.log('Business ID:', id);
    console.log('Business data:', JSON.stringify(businessData, null, 2));
    
    // Call the correct endpoint: /api/businesses/{id}
    const response = await simpleFetch(`${API_URL}/api/businesses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(businessData),
    });
    
    console.log('Update response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Update failed:', errorData);
      throw new Error(errorData.error || 'Failed to update business');
    }
    
    const result = await response.json();
    console.log('Update successful:', result);
    return result;
  } catch (error) {
    console.error('Error updating business:', error);
    throw error;
  }
}

export async function deleteBusiness(id: number) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/businesses/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete business');
    return await response.json();
  } catch (error) {
    console.error('Error deleting business:', error);
    throw error;
  }
}

// Products API
export async function fetchProducts(businessId: number, category?: string, search?: string) {
  try {
    const API_URL = getApiUrl();
    if (!API_URL) return [];
    
    let url = `${API_URL}/api/products?business_id=${businessId}`;
    if (category && category !== 'All') url += `&category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    const response = await fetchWithRetry(url);
    if (!response.ok) throw new Error('Failed to fetch products');
    return await response.json();
  } catch (error: any) {
    // Silently handle AbortError
    if (error?.name === 'AbortError') {
      return [];
    }
    console.error('Error fetching products:', error);
    return [];
  }
}

// Global product search across all businesses
export async function searchProductsGlobally(searchTerm: string) {
  try {
    const API_URL = getApiUrl();
    if (!API_URL || !searchTerm.trim()) return [];
    
    const url = `${API_URL}/api/products?global_search=${encodeURIComponent(searchTerm)}`;
    const response = await fetchWithRetry(url);
    if (!response.ok) throw new Error('Failed to search products');
    return await response.json();
  } catch (error) {
    console.error('Error searching products globally:', error);
    return [];
  }
}

export async function createProduct(productData: {
  business_id: number;
  name: string;
  description?: string;
  price: number;
  original_price?: number | null;
  image?: string;
  images?: string[];
  video?: string;
  category?: string;
  in_stock?: boolean;
}) {
  try {
    const API_URL = getApiUrl();
    console.log('[createProduct] Sending request to:', `${API_URL}/api/products`);
    console.log('[createProduct] Product data:', JSON.stringify(productData, null, 2));
    
    const response = await simpleFetch(`${API_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    
    console.log('[createProduct] Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[createProduct] Error response:', errorData);
      throw new Error(errorData.error || errorData.details || 'Failed to create product');
    }
    
    const result = await response.json();
    console.log('[createProduct] Success:', result);
    return result;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

export async function updateProduct(productData: {
  id: number;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  image?: string;
  images?: string[];
  video?: string;
  category?: string;
  in_stock?: boolean;
}) {
  try {
    const API_URL = getApiUrl();
    console.log('[updateProduct] Sending request to:', `${API_URL}/api/products`);
    console.log('[updateProduct] Product data:', JSON.stringify(productData, null, 2));
    
    const response = await simpleFetch(`${API_URL}/api/products`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    
    console.log('[updateProduct] Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[updateProduct] Error response:', errorData);
      throw new Error(errorData.error || errorData.details || 'Failed to update product');
    }
    
    const result = await response.json();
    console.log('[updateProduct] Success:', result);
    return result;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

export async function deleteProduct(id: number) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/products?id=${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete product');
    return await response.json();
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

// Ads API - FIXED: Use fetchWithRetry to handle network issues
export async function fetchActiveAds() {
  try {
    const API_URL = getApiUrl();
    if (!API_URL) {
      console.warn('API URL not configured, returning empty ads');
      return [];
    }
    
    const url = `${API_URL}/api/ads`;
    console.log('[fetchActiveAds] Fetching from:', url);
    
    // Use fetchWithRetry to handle transient network errors
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    console.log('[fetchActiveAds] Response status:', response.status);
    console.log('[fetchActiveAds] Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetchActiveAds] Error response:', errorText);
      throw new Error('Failed to fetch ads');
    }
    
    const data = await response.json();
    console.log('[fetchActiveAds] Success! Received', data?.length || 0, 'ads');
    return data;
  } catch (error: any) {
    // Silently handle common network errors
    if (error?.name === 'AbortError' || error?.message?.includes('fetch')) {
      console.log('[fetchActiveAds] Network error (silently handled):', error?.message);
      return [];
    }
    console.error('[fetchActiveAds] Error:', error);
    return [];
  }
}

export async function fetchBusinessAds(businessId: number) {
  try {
    const API_URL = getApiUrl();
    if (!API_URL) return [];
    
    const url = `${API_URL}/api/ads?business_id=${businessId}`;
    console.log('[fetchBusinessAds] Fetching from:', url);
    
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    console.log('[fetchBusinessAds] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetchBusinessAds] Error response:', errorText);
      throw new Error('Failed to fetch business ads');
    }
    
    const data = await response.json();
    console.log('[fetchBusinessAds] Success! Received', data?.length || 0, 'ads');
    return data;
  } catch (error: any) {
    // Silently handle common network errors
    if (error?.name === 'AbortError' || error?.message?.includes('fetch')) {
      console.log('[fetchBusinessAds] Network error (silently handled):', error?.message);
      return [];
    }
    console.error('[fetchBusinessAds] Error:', error);
    return [];
  }
}

export async function createAd(adData: {
  business_id: number;
  product_ids: number[];
  title: string;
  description?: string;
  image?: string;
  discount_text?: string;
  original_price?: number;
  discounted_price?: number;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
}) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create ad');
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating ad:', error);
    throw error;
  }
}

export async function updateAd(adData: {
  id: number;
  product_ids: number[];
  title: string;
  description?: string;
  image?: string;
  discount_text?: string;
  original_price?: number;
  discounted_price?: number;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
}) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/ads`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update ad');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating ad:', error);
    throw error;
  }
}

export async function deleteAd(id: number) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/ads?id=${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete ad');
    return await response.json();
  } catch (error) {
    console.error('Error deleting ad:', error);
    throw error;
  }
}

// Orders API
// CRITICAL FIX: Remove email and deviceId from fetchOrders - only support userId
export async function fetchOrders(userId: number) {
  try {
    const API_URL = getApiUrl();
    if (!API_URL || !userId) return [];
    
    const url = `${API_URL}/api/orders?user_id=${userId}`;
    
    console.log('Fetching customer orders from:', url);
    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Failed to fetch orders. Status:', response.status, 'Response:', errorText);
      return [];
    }
    
    const data = await response.json();
    const orders = Array.isArray(data) ? data : [];
    console.log('Customer orders received:', orders.length);
    return orders;
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

export async function fetchBusinessOrders(businessId: number) {
  try {
    const API_URL = getApiUrl();
    if (!API_URL) return [];
    
    const url = `${API_URL}/api/orders?business_id=${businessId}`;
    console.log('=== Fetching business orders ===');
    console.log('URL:', url);
    console.log('Business ID:', businessId);
    
    const response = await fetchWithRetry(url);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Failed to fetch business orders. Status:', response.status, 'Response:', errorText);
      return [];
    }
    
    const data = await response.json();
    const orders = Array.isArray(data) ? data : [];
    console.log('Business orders received:', orders.length, 'orders');
    if (orders.length > 0) {
      console.log('First order ID:', orders[0].id);
      console.log('Order IDs:', orders.map((o: any) => o.id));
    }
    return orders;
  } catch (error: any) {
    console.error('Error fetching business orders:', error);
    return [];
  }
}

// Fetch all orders for a business owner (customer orders + business orders combined)
export async function fetchAllOrdersForBusinessOwner(userId: number, businessIds: number[]) {
  try {
    console.log('=== Fetching all orders for business owner ===');
    console.log('User ID:', userId, 'Business IDs:', businessIds);
    
    // Fetch customer orders (orders placed by this user)
    const customerOrdersPromise = fetchOrders(userId);
    
    // Fetch business orders (orders received by user's businesses) for all businesses
    const businessOrdersPromises = businessIds.map(id => fetchBusinessOrders(id));
    
    const [customerOrders, ...businessOrdersArrays] = await Promise.all([
      customerOrdersPromise,
      ...businessOrdersPromises
    ]);
    
    console.log('Customer orders count:', customerOrders?.length || 0);
    
    // Flatten all business orders and mark them
    const allBusinessOrders = businessOrdersArrays.flat();
    console.log('Total business orders count:', allBusinessOrders?.length || 0);
    
    const safeCustomerOrders = Array.isArray(customerOrders) ? customerOrders : [];
    const safeBusinessOrders = Array.isArray(allBusinessOrders) ? allBusinessOrders : [];
    
    // Mark orders with their type
    const markedCustomerOrders = safeCustomerOrders.map((order: any) => ({
      ...order,
      order_type: 'customer' as const,
    }));
    
    const markedBusinessOrders = safeBusinessOrders.map((order: any) => ({
      ...order,
      order_type: 'business' as const,
    }));
    
    // Combine and remove duplicates
    const orderMap = new Map();
    
    // Add business orders first
    markedBusinessOrders.forEach((order: any) => {
      orderMap.set(order.id, order);
    });
    
    // Add customer orders
    markedCustomerOrders.forEach((order: any) => {
      if (!orderMap.has(order.id)) {
        orderMap.set(order.id, order);
      } else {
        const existing = orderMap.get(order.id);
        orderMap.set(order.id, { ...existing, order_type: 'both' });
      }
    });
    
    // Convert back to array and sort by date
    const combinedOrders = Array.from(orderMap.values()).sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
    
    console.log('Combined orders count:', combinedOrders.length);
    return combinedOrders;
  } catch (error) {
    console.error('Error fetching all orders for business owner:', error);
    return [];
  }
}

export async function fetchOrder(id: number) {
  try {
    const API_URL = getApiUrl();
    const response = await fetchWithRetry(`${API_URL}/api/orders/${id}`);
    if (!response.ok) throw new Error('Failed to fetch order');
    return await response.json();
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
}

export async function trackOrderByNumber(orderNumber: string) {
  try {
    const API_URL = getApiUrl();
    const response = await fetchWithRetry(`${API_URL}/api/orders/track?order_number=${encodeURIComponent(orderNumber)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to track order');
    }
    return await response.json();
  } catch (error) {
    console.error('Error tracking order:', error);
    throw error;
  }
}

export async function createOrder(orderData: {
  user_id?: number;
  device_id?: string;
  business_id: number;
  delivery_type: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address?: string;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes?: string;
  special_instructions?: string;
  items: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    price: number;
  }>;
}) {
  try {
    const API_URL = getApiUrl();
    console.log('=== Creating order ===');
    console.log('API URL:', `${API_URL}/api/orders`);
    console.log('Order data:', JSON.stringify(orderData, null, 2));
    
    const response = await simpleFetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to create order:', errorData);
      throw new Error(errorData.error || errorData.details || 'Failed to create order');
    }
    
    const result = await response.json();
    console.log('Order created successfully:', result);
    return result;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

export async function updateOrderStatus(orderId: number, status: string): Promise<{ success: boolean; error?: string; order?: any }> {
  try {
    const API_URL = getApiUrl();
    console.log('=== Calling updateOrderStatus ===');
    console.log('Order ID:', orderId);
    console.log('New Status:', status);
    console.log('API URL:', `${API_URL}/api/orders/${orderId}`);
    
    const response = await simpleFetch(`${API_URL}/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Update failed:', errorData);
      return { success: false, error: errorData.error || 'Failed to update order status' };
    }
    
    const data = await response.json();
    console.log('Update successful, new status:', data?.status);
    return { success: true, order: data };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: String(error) };
  }
}

// Custom Order Requests API
export async function fetchCustomOrders(userId?: number, businessId?: number) {
  try {
    const API_URL = getApiUrl();
    if (!API_URL) return [];
    
    let url = `${API_URL}/api/custom-orders?`;
    if (userId) url += `user_id=${userId}`;
    else if (businessId) url += `business_id=${businessId}`;
    else return [];
    
    const response = await fetchWithRetry(url);
    if (!response.ok) throw new Error('Failed to fetch custom orders');
    return await response.json();
  } catch (error) {
    console.error('Error fetching custom orders:', error);
    return [];
  }
}

export async function fetchCustomOrder(id: number) {
  try {
    const API_URL = getApiUrl();
    const response = await fetchWithRetry(`${API_URL}/api/custom-orders?id=${id}`);
    if (!response.ok) throw new Error('Failed to fetch custom order');
    return await response.json();
  } catch (error) {
    console.error('Error fetching custom order:', error);
    throw error;
  }
}

export async function createCustomOrder(data: {
  user_id?: number;
  business_id: number;
  description: string;
  image_url?: string;
  delivery_preference: 'delivery' | 'pickup';
}) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/custom-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create custom order');
    return await response.json();
  } catch (error) {
    console.error('Error creating custom order:', error);
    throw error;
  }
}

export async function updateCustomOrder(data: {
  id: number;
  status?: string;
  quote_amount?: number;
  quote_note?: string;
}) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/custom-orders`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update custom order');
    return await response.json();
  } catch (error) {
    console.error('Error updating custom order:', error);
    throw error;
  }
}

export async function deleteCustomOrder(id: number) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/custom-orders?id=${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete custom order');
    return await response.json();
  } catch (error) {
    console.error('Error deleting custom order:', error);
    throw error;
  }
}

// Notifications API
export async function fetchNotifications(userId?: number, businessId?: number, unreadOnly?: boolean) {
  try {
    const API_URL = getApiUrl();
    if (!API_URL) return [];
    
    let url = `${API_URL}/api/notifications?`;
    if (userId) url += `user_id=${userId}`;
    else if (businessId) url += `business_id=${businessId}`;
    if (unreadOnly) url += '&unread=true';
    
    const response = await fetchWithRetry(url);
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return await response.json();
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markNotificationRead(notificationId: number) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/notifications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_id: notificationId }),
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
    return await response.json();
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsRead(userId?: number, businessId?: number) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/notifications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all: true, user_id: userId, business_id: businessId }),
    });
    if (!response.ok) throw new Error('Failed to mark all notifications as read');
    return await response.json();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

// Favorites API
export async function fetchFavorites(userId: number) {
  try {
    const API_URL = getApiUrl();
    if (!API_URL) return [];
    
    const response = await fetchWithRetry(`${API_URL}/api/favorites?user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch favorites');
    return await response.json();
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }
}

export async function addFavorite(userId: number, businessId: number) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, business_id: businessId }),
    });
    if (!response.ok) throw new Error('Failed to add favorite');
    return await response.json();
  } catch (error) {
    console.error('Error adding favorite:', error);
    throw error;
  }
}

export async function removeFavorite(userId: number, businessId: number) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/favorites?user_id=${userId}&business_id=${businessId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove favorite');
    return await response.json();
  } catch (error) {
    console.error('Error removing favorite:', error);
    throw error;
  }
}

// User API
export async function fetchUser(email: string) {
  try {
    const API_URL = getApiUrl();
    if (!API_URL) return null;
    
    const response = await fetchWithRetry(`${API_URL}/api/users?email=${encodeURIComponent(email)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch user');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

export async function createOrUpdateUser(userData: {
  name: string;
  email: string;
  phone?: string;
  password_hash?: string;
  avatar_url?: string;
  login_method?: string;
  is_business_user?: boolean;
}) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to create/update user');
    return await response.json();
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
}

export async function updateUser(email: string, userData: { name?: string; phone?: string; avatar_url?: string; is_business_user?: boolean }) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/users`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ...userData }),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return await response.json();
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

// Addresses API
export async function fetchAddresses(userId: number) {
  try {
    const API_URL = getApiUrl();
    if (!API_URL) return [];
    
    const response = await fetchWithRetry(`${API_URL}/api/addresses?user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch addresses');
    return await response.json();
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return [];
  }
}

export async function createAddress(addressData: {
  user_id: number;
  title: string;
  address_line: string;
  city?: string;
  postal_code?: string;
  is_default?: boolean;
}) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addressData),
    });
    if (!response.ok) throw new Error('Failed to create address');
    return await response.json();
  } catch (error) {
    console.error('Error creating address:', error);
    throw error;
  }
}

export async function deleteAddress(id: number) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/addresses?id=${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete address');
    return await response.json();
  } catch (error) {
    console.error('Error deleting address:', error);
    throw error;
  }
}

// Contact API
export async function sendContactMessage(data: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}) {
  try {
    const API_URL = getApiUrl();
    const response = await simpleFetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to send message');
    return await response.json();
  } catch (error) {
    console.error('Error sending contact message:', error);
    throw error;
  }
}
