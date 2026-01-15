import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');

    let query;
    const params = [];

    if (businessId) {
      // Get orders for a specific business
      if (status) {
        query = `
          SELECT o.*, u.full_name as user_name, u.email as user_email, u.phone as user_phone
          FROM orders o
          LEFT JOIN users u ON o.user_id = u.id
          WHERE o.business_id = $1 AND o.status = $2
          ORDER BY o.created_at DESC
        `;
        params.push(businessId, status);
      } else {
        query = `
          SELECT o.*, u.full_name as user_name, u.email as user_email, u.phone as user_phone
          FROM orders o
          LEFT JOIN users u ON o.user_id = u.id
          WHERE o.business_id = $1
          ORDER BY o.created_at DESC
        `;
        params.push(businessId);
      }
      const result = await sql.query(query, params);
      return NextResponse.json(result.rows);
    } else if (userId) {
      // Get orders for a specific user
      const result = await sql`
        SELECT o.*, b.name as business_name, b.logo_url as business_logo
        FROM orders o
        LEFT JOIN businesses b ON o.business_id = b.id
        WHERE o.user_id = ${userId}
        ORDER BY o.created_at DESC
      `;
      return NextResponse.json(result);
    } else {
      // Get all orders (admin view)
      const result = await sql`
        SELECT o.*, b.name as business_name, u.full_name as user_name
        FROM orders o
        LEFT JOIN businesses b ON o.business_id = b.id
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `;
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      business_id,
      items,
      subtotal,
      tax,
      shipping_fee,
      total,
      shipping_address,
      payment_method,
      payment_status = 'pending',
      status = 'pending'
    } = body;

    // Validate required fields
    if (!user_id || !items || items.length === 0 || !total) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate order number
    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Create order
    const result = await sql`
      INSERT INTO orders (
        order_number,
        user_id,
        business_id,
        items,
        subtotal,
        tax,
        shipping_fee,
        total,
        shipping_address,
        payment_method,
        payment_status,
        status,
        created_at
      )
      VALUES (
        ${orderNumber},
        ${user_id},
        ${business_id || null},
        ${JSON.stringify(items)},
        ${subtotal},
        ${tax || 0},
        ${shipping_fee || 0},
        ${total},
        ${JSON.stringify(shipping_address)},
        ${payment_method || 'cod'},
        ${payment_status},
        ${status},
        NOW()
      )
      RETURNING *
    `;

    const order = result[0];

    // Get user details
    const userResult = await sql`
      SELECT email, full_name, phone FROM users WHERE id = ${user_id}
    `;
    const user = userResult[0];

    // Send order confirmation email if SendGrid is configured
    if (SENDGRID_API_KEY && user && user.email) {
      try {
        const itemsHtml = items.map((item: any) => `
          <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>₹${item.price}</td>
            <td>₹${(item.quantity * item.price).toFixed(2)}</td>
          </tr>
        `).join('');

        await sgMail.send({
          to: user.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@ezypzy.shop',
          subject: `Order Confirmation - ${orderNumber}`,
          html: `
            <h2>Thank you for your order!</h2>
            <p>Hi ${user.full_name || 'Customer'},</p>
            <p>Your order has been received and is being processed.</p>
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Total:</strong> ₹${total}</p>
            <table border="1" cellpadding="10" cellspacing="0">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <p><strong>Shipping Address:</strong></p>
            <p>${shipping_address.address}, ${shipping_address.city}, ${shipping_address.state} ${shipping_address.pincode}</p>
            <p>Track your order: <a href="${process.env.EXPO_PUBLIC_APP_URL}/track-order">Click here</a></p>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send order confirmation email:', emailError);
      }
    }

    // Notify business owner if business_id exists
    if (business_id && SENDGRID_API_KEY) {
      try {
        const businessResult = await sql`
          SELECT u.email, b.name as business_name
          FROM businesses b
          JOIN users u ON b.user_id = u.id
          WHERE b.id = ${business_id}
        `;
        
        if (businessResult[0] && businessResult[0].email) {
          const itemsHtml = items.map((item: any) => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>₹${item.price}</td>
              <td>₹${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          `).join('');

          await sgMail.send({
            to: businessResult[0].email,
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@ezypzy.shop',
            subject: `New Order Received - ${orderNumber}`,
            html: `
              <h2>New Order Received</h2>
              <p>Hi ${businessResult[0].business_name},</p>
              <p>You have received a new order!</p>
              <h3>Order Details</h3>
              <p><strong>Order Number:</strong> ${orderNumber}</p>
              <p><strong>Total:</strong> ₹${total}</p>
              <p><strong>Customer:</strong> ${user.full_name || 'Customer'}</p>
              <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
              <table border="1" cellpadding="10" cellspacing="0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              <p><strong>Shipping Address:</strong></p>
              <p>${shipping_address.address}, ${shipping_address.city}, ${shipping_address.state} ${shipping_address.pincode}</p>
            `,
          });
        }
      } catch (error) {
        console.error('Failed to send business notification:', error);
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
