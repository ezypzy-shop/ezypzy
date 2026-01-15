import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

// Helper function to send order status notification
async function notifyOrderStatusChange(order: any, business: any, newStatus: string, baseUrl: string) {
  try {
    // Send notification to customer
    if (order.user_id || order.customer_email || order.customer_phone) {
      const statusMessages: { [key: string]: { title: string; emoji: string } } = {
        'Confirmed': { title: 'Order Confirmed', emoji: '✅' },
        'Preparing': { title: 'Preparing Your Order', emoji: '👨‍🍳' },
        'Ready': { title: 'Order Ready', emoji: '🎉' },
        'Out for Delivery': { title: 'On the Way', emoji: '🚚' },
        'Delivered': { title: 'Order Delivered', emoji: '✅' },
        'Completed': { title: 'Order Completed', emoji: '🎊' },
        'Cancelled': { title: 'Order Cancelled', emoji: '❌' },
      };
      
      const statusInfo = statusMessages[newStatus] || { title: 'Order Update', emoji: '📦' };
      const message = `${statusInfo.emoji} Your order ${order.order_number} at ${business.name} is now ${newStatus}`;
      
      // Create in-app notification if user is logged in
      if (order.user_id) {
        await sql`
          INSERT INTO notifications (user_id, title, message, type, order_id, created_at)
          VALUES (${order.user_id}, ${statusInfo.title}, ${message}, ${'order_status'}, ${order.id}, NOW())
        `;
      }
      
      // Send email and SMS
      const notificationPayload: any = {
        user_id: order.user_id || null,
        business_id: business.id,
        order_id: order.id,
        type: 'order_status',
        title: statusInfo.title,
        message: message,
        notification_channels: ['app'],
      };
      
      if (order.customer_email) {
        notificationPayload.notification_channels.push('email');
        notificationPayload.recipient_email = order.customer_email;
      }
      
      if (order.customer_phone) {
        notificationPayload.notification_channels.push('sms');
        notificationPayload.recipient_phone = order.customer_phone;
      }
      
      // Call notification API
      await fetch(`${baseUrl}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationPayload),
      });
    }
  } catch (error) {
    console.error('Error sending order status notification:', error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const orderId = parseInt(id);
    
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }
    
    const orders = await sql`
      SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'product_name', oi.product_name,
              'quantity', oi.quantity,
              'price', oi.price
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) as items,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'description', co.description,
            'image_url', co.image_url,
            'delivery_preference', co.delivery_preference
          ))
          FROM custom_orders co
          WHERE co.order_id = o.id),
          '[]'
        ) as custom_orders,
        b.name as business_name,
        b.image as business_image,
        b.phone as business_phone,
        b.address as business_address
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN businesses b ON o.business_id = b.id
      WHERE o.id = ${orderId}
      GROUP BY o.id, b.name, b.image, b.phone, b.address
    `;
    
    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    return NextResponse.json(orders[0]);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const orderId = parseInt(id);
    
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }
    
    const body = await request.json();
    const { status } = body;
    
    console.log('=== PUT /api/orders/[id] ===');
    console.log('Order ID:', orderId);
    console.log('New Status:', status);
    
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }
    
    // Fetch current order
    const currentOrder = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
    if (!currentOrder || currentOrder.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Fetch business info
    const business = await sql`SELECT * FROM businesses WHERE id = ${currentOrder[0].business_id}`;
    if (!business || business.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    
    // Update order status
    const result = await sql`
      UPDATE orders 
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${orderId}
      RETURNING *
    `;
    
    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
    
    const updatedOrder = result[0];
    console.log('Order status updated successfully:', updatedOrder.status);
    
    // Get base URL for notifications
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.EXPO_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    
    // Send notification about status change
    await notifyOrderStatusChange(updatedOrder, business[0], status, baseUrl);
    
    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
