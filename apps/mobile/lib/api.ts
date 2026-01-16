const API_URL = process.env.EXPO_PUBLIC_APP_URL || 'https://iln5j3edlw2ui526pwytq.web.appgen.com';

// Upload file function
export async function uploadFile(file: any) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return response.json();
}

// Contact form submission
export async function submitContactForm(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const response = await fetch(`${API_URL}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to submit contact form');
  }

  return response.json();
}

// Fetch commission rate
export async function fetchCommissionRate() {
  const response = await fetch(`${API_URL}/api/commission`);
  if (!response.ok) {
    throw new Error('Failed to fetch commission rate');
  }
  return response.json();
}

// Update commission rate (admin only)
export async function updateCommissionRate(rate: number) {
  const response = await fetch(`${API_URL}/api/commission`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rate }),
  });
  if (!response.ok) {
    throw new Error('Failed to update commission rate');
  }
  return response.json();
}

// Orders API
export async function createOrder(orderData: any) {
  console.log('Creating order with data:', orderData);
  const response = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create order');
  }

  return response.json();
}

export async function fetchOrders(userId?: number, businessIds?: number[]) {
  const params = new URLSearchParams();
  
  if (userId) {
    params.append('user_id', userId.toString());
  }
  
  if (businessIds && businessIds.length > 0) {
    params.append('business_ids', businessIds.join(','));
  }

  const response = await fetch(`${API_URL}/api/orders?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch orders');
  }

  return response.json();
}

export async function updateOrderStatus(orderId: number, status: string, trackingUrl?: string) {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, status, trackingUrl }),
  });

  if (!response.ok) {
    throw new Error('Failed to update order status');
  }

  return response.json();
}

export async function fetchOrderById(orderId: number) {
  const response = await fetch(`${API_URL}/api/orders/${orderId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch order');
  }

  return response.json();
}

// Alias for fetchOrderById (used in track-order screen)
export const fetchOrder = fetchOrderById;

export async function trackOrder(orderNumber: string) {
  const response = await fetch(`${API_URL}/api/orders/track?orderNumber=${orderNumber}`);
  
  if (!response.ok) {
    throw new Error('Failed to track order');
  }

  return response.json();
}

// Alias for trackOrder (used in track-order screen)
export const trackOrderByNumber = trackOrder;

// Businesses API
export async function fetchBusinesses() {
  const response = await fetch(`${API_URL}/api/businesses`);
  if (!response.ok) {
    throw new Error('Failed to fetch businesses');
  }
  return response.json();
}

export async function fetchBusinessById(id: number) {
  const response = await fetch(`${API_URL}/api/businesses/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch business');
  }
  return response.json();
}

// Alias for fetchBusinessById
export const fetchBusiness = fetchBusinessById;

export async function createBusiness(businessData: any) {
  const response = await fetch(`${API_URL}/api/businesses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(businessData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create business');
  }

  return response.json();
}

export async function updateBusiness(id: number, businessData: any) {
  const response = await fetch(`${API_URL}/api/businesses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(businessData),
  });

  if (!response.ok) {
    throw new Error('Failed to update business');
  }

  return response.json();
}

export async function fetchUserBusinesses(userId: number) {
  const response = await fetch(`${API_URL}/api/businesses?user_id=${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user businesses');
  }
  const data = await response.json();
  return data.businesses || [];
}

// Favorites API
export async function fetchFavorites(userId: number) {
  const response = await fetch(`${API_URL}/api/favorites?user_id=${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch favorites');
  }
  return response.json();
}

export async function addFavorite(userId: number, businessId: number) {
  const response = await fetch(`${API_URL}/api/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, business_id: businessId }),
  });

  if (!response.ok) {
    throw new Error('Failed to add favorite');
  }

  return response.json();
}

export async function removeFavorite(userId: number, businessId: number) {
  const response = await fetch(`${API_URL}/api/favorites`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, business_id: businessId }),
  });

  if (!response.ok) {
    throw new Error('Failed to remove favorite');
  }

  return response.json();
}

// Products API
export async function fetchProducts(businessId?: number) {
  const url = businessId 
    ? `${API_URL}/api/products?business_id=${businessId}` 
    : `${API_URL}/api/products`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  return response.json();
}

export async function createProduct(productData: any) {
  const response = await fetch(`${API_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create product');
  }

  return response.json();
}

export async function updateProduct(id: number, productData: any) {
  const response = await fetch(`${API_URL}/api/products?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    throw new Error('Failed to update product');
  }

  return response.json();
}

export async function deleteProduct(id: number) {
  const response = await fetch(`${API_URL}/api/products?id=${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete product');
  }

  return response.json();
}

// Ads API
export async function fetchAds() {
  const response = await fetch(`${API_URL}/api/ads`);
  if (!response.ok) {
    throw new Error('Failed to fetch ads');
  }
  return response.json();
}

export async function fetchAdById(id: number) {
  const response = await fetch(`${API_URL}/api/ads/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch ad');
  }
  return response.json();
}

export async function createAd(adData: any) {
  const response = await fetch(`${API_URL}/api/ads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(adData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create ad');
  }

  return response.json();
}

export async function updateAd(id: number, adData: any) {
  const response = await fetch(`${API_URL}/api/ads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(adData),
  });

  if (!response.ok) {
    throw new Error('Failed to update ad');
  }

  return response.json();
}

export async function deleteAd(id: number) {
  const response = await fetch(`${API_URL}/api/ads/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete ad');
  }

  return response.json();
}

export async function recordAdView(adId: number) {
  const response = await fetch(`${API_URL}/api/ads/${adId}/view`, {
    method: 'POST',
  });
  if (!response.ok) {
    console.error('Failed to record ad view');
  }
  return response.json();
}

export async function recordAdClick(adId: number) {
  const response = await fetch(`${API_URL}/api/ads/${adId}/click`, {
    method: 'POST',
  });
  if (!response.ok) {
    console.error('Failed to record ad click');
  }
  return response.json();
}

// Notifications API
export async function fetchNotifications(userId?: number, businessId?: number) {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId.toString());
  if (businessId) params.append('businessId', businessId.toString());
  
  const response = await fetch(`${API_URL}/api/notifications?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return response.json();
}

export async function markNotificationRead(notificationId: number) {
  const response = await fetch(`${API_URL}/api/notifications?id=${notificationId}`, {
    method: 'PUT',
  });
  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
  return response.json();
}

export async function markAllNotificationsRead(userId?: number, businessId?: number) {
  const params = new URLSearchParams();
  params.append('markAll', 'true');
  if (userId) params.append('userId', userId.toString());
  if (businessId) params.append('businessId', businessId.toString());
  
  const response = await fetch(`${API_URL}/api/notifications?${params.toString()}`, {
    method: 'PUT',
  });
  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }
  return response.json();
}

// Users API
export async function fetchUsers() {
  const response = await fetch(`${API_URL}/api/users`);
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
}

export async function createUser(userData: any) {
  const response = await fetch(`${API_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create user');
  }

  return response.json();
}

export async function updateUser(userId: number, userData: any) {
  const response = await fetch(`${API_URL}/api/users?id=${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    throw new Error('Failed to update user');
  }

  return response.json();
}

export async function savePushToken(userId: number, pushToken: string) {
  const response = await fetch(`${API_URL}/api/users/push-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, pushToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to save push token');
  }

  return response.json();
}

// Auth API
export async function resetPassword(email: string) {
  const response = await fetch(`${API_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send reset code');
  }

  return response.json();
}

export async function verifyResetCode(email: string, code: string) {
  const response = await fetch(`${API_URL}/api/auth/verify-reset-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Invalid code');
  }

  return response.json();
}

export async function updatePassword(email: string, code: string, newPassword: string) {
  const response = await fetch(`${API_URL}/api/auth/update-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update password');
  }

  return response.json();
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  return response.json();
}

// OTP API
export async function sendOTP(phone: string) {
  const response = await fetch(`${API_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send OTP');
  }

  return response.json();
}

export async function verifyOTP(phone: string, otp: string) {
  const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Invalid OTP');
  }

  return response.json();
}

// Social auth
export async function socialAuth(provider: string, token: string) {
  const response = await fetch(`${API_URL}/api/auth/social`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, token }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Social auth failed');
  }

  return response.json();
}

// Referrals API
export async function fetchReferrals(userId: number) {
  const response = await fetch(`${API_URL}/api/referrals?userId=${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch referrals');
  }
  return response.json();
}

export async function createReferralCode(userId: number) {
  const response = await fetch(`${API_URL}/api/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create referral code');
  }

  return response.json();
}

export async function shareReferralCode(code: string, method: string) {
  const response = await fetch(`${API_URL}/api/referrals/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, method }),
  });

  if (!response.ok) {
    throw new Error('Failed to track share');
  }

  return response.json();
}

export async function markReferralUsed(code: string) {
  const response = await fetch(`${API_URL}/api/referrals/mark-used`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error('Failed to mark referral as used');
  }

  return response.json();
}

// Spin codes API
export async function fetchSpinCodes(businessId: number) {
  const response = await fetch(`${API_URL}/api/spin-codes?businessId=${businessId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch spin codes');
  }
  return response.json();
}

export async function validateSpinCode(businessId: number, code: string) {
  const response = await fetch(`${API_URL}/api/spin-codes/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId, code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Invalid code');
  }

  return response.json();
}

// Spin wheel API
export async function fetchSpinWheelConfig(businessId: number) {
  const response = await fetch(`${API_URL}/api/spin-wheel?businessId=${businessId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch spin wheel config');
  }
  return response.json();
}

export async function spinWheel(businessId: number, userId?: number, deviceId?: string) {
  const response = await fetch(`${API_URL}/api/spin-wheel/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId, userId, deviceId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to spin');
  }

  return response.json();
}

export async function checkSpinCooldown(businessId: number, userId?: number, deviceId?: string) {
  const params = new URLSearchParams({
    businessId: businessId.toString(),
  });
  
  if (userId) params.append('userId', userId.toString());
  if (deviceId) params.append('deviceId', deviceId);
  
  const response = await fetch(`${API_URL}/api/spin-wheel/cooldown?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to check cooldown');
  }
  return response.json();
}
