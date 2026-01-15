import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

async function sendBusinessApprovalEmail(email: string, businessName: string, ownerName: string) {
  const fromEmail = process.env.FROM_EMAIL || 'ashokmittal919@gmail.com';
  
  const msg = {
    to: email,
    from: fromEmail,
    subject: `🎉 Your Business "${businessName}" is Live!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Business Approved</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">🎉 Congratulations!</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 600;">Hi ${ownerName},</h2>
                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Great news! Your business <strong>"${businessName}"</strong> has been approved and is now live on EzyPzy Shop! 🚀
                    </p>
                    
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin: 30px 0;">
                      <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: 600;">What's Next?</h3>
                      <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 15px; line-height: 1.8;">
                        <li>Add your products to your business catalog</li>
                        <li>Set up your payment methods and delivery options</li>
                        <li>Start receiving orders from customers</li>
                        <li>Track your sales in the Business Dashboard</li>
                      </ul>
                    </div>
                    
                    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; margin: 20px 0;">
                      <p style="margin: 0; color: #065f46; font-size: 14px;">
                        💡 <strong>Pro Tip:</strong> Add high-quality photos and detailed descriptions to attract more customers!
                      </p>
                    </div>
                    
                    <p style="margin: 30px 0 0 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                      If you have any questions or need assistance, our support team is here to help.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                      Happy selling! 🛍️
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      © ${new Date().getFullYear()} EzyPzy Shop. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Business approval email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending business approval email:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const userId = searchParams.get('user_id');

    let result;

    if (userId) {
      // Fetch businesses owned by this user
      result = await sql`SELECT * FROM businesses WHERE user_id = ${userId} ORDER BY created_at DESC`;
    } else if (search) {
      // Global search
      const searchTerm = `%${search}%`;
      result = await sql`
        SELECT * FROM businesses 
        WHERE name ILIKE ${searchTerm} OR description ILIKE ${searchTerm}
        ORDER BY created_at DESC
      `;
    } else if (category && category !== 'All') {
      // Filter by category - use @> operator to check if category is in the array
      result = await sql`
        SELECT * FROM businesses 
        WHERE categories @> ARRAY[${category}]::text[]
        ORDER BY created_at DESC
      `;
    } else {
      // Fetch all active businesses
      result = await sql`SELECT * FROM businesses ORDER BY created_at DESC`;
    }

    // Ensure result is an array
    const businesses = Array.isArray(result) ? result : [];
    
    // Return with 200 status
    return NextResponse.json({ businesses }, { status: 200 });
  } catch (error: any) {
    console.error('[GET /api/businesses] Error:', error);
    // CRITICAL: Always return valid JSON with 200 status to prevent HTML error pages
    return NextResponse.json(
      { businesses: [], error: 'Failed to fetch businesses', details: error.message },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[POST /api/businesses] Request body:', JSON.stringify(body, null, 2));
    
    const {
      user_id,
      name,
      description,
      image,
      type,
      status = 'Open',
      phone,
      email,
      address,
      location,
      categories = [],
      payment_methods = [],
      delivery_fee = 0,
      min_order,
      delivery_time,
      order_mode = 'both',
    } = body;

    // Validate required fields
    if (!user_id || !name || !type || !phone || !address) {
      console.error('[POST /api/businesses] Validation failed:', {
        user_id, name, type, phone, address
      });
      return NextResponse.json(
        { error: 'Missing required fields: user_id, name, type, phone, address' },
        { status: 400 }
      );
    }

    // ✅ CHECK 1: Verify user doesn't already have a business
    const existingUserBusiness = await sql`
      SELECT id, name FROM businesses WHERE user_id = ${user_id} LIMIT 1
    `;
    
    if (existingUserBusiness.length > 0) {
      console.error('[POST /api/businesses] User already has a business:', existingUserBusiness[0]);
      return NextResponse.json(
        { error: `You already have a business: "${existingUserBusiness[0].name}". Each user can only create one business.` },
        { status: 400 }
      );
    }

    // ✅ CHECK 2: Verify business name is unique (case-insensitive)
    const existingBusinessName = await sql`
      SELECT id, name FROM businesses WHERE LOWER(name) = LOWER(${name}) LIMIT 1
    `;
    
    if (existingBusinessName.length > 0) {
      console.error('[POST /api/businesses] Business name already exists:', existingBusinessName[0]);
      return NextResponse.json(
        { error: `Business name "${name}" is already taken. Please choose a different name.` },
        { status: 400 }
      );
    }

    console.log('[POST /api/businesses] Creating business with order_mode:', order_mode);

    const result = await sql`
      INSERT INTO businesses (
        user_id, name, description, image, type, status, phone, email, address, location,
        categories, payment_methods, delivery_fee, min_order, delivery_time, order_mode
      )
      VALUES (
        ${user_id}, ${name}, ${description || ''}, ${image || ''}, ${type}, ${status},
        ${phone}, ${email || ''}, ${address}, ${location || ''}, ${categories},
        ${payment_methods}, ${delivery_fee}, ${min_order || ''},
        ${delivery_time || '25-35 min'}, ${order_mode}
      )
      RETURNING *
    `;

    console.log('[POST /api/businesses] Business created successfully:', result[0].id);
    
    // Get user info for email
    if (email && result[0]) {
      try {
        const users = await sql`SELECT * FROM users WHERE id = ${user_id}`;
        const ownerName = users[0]?.full_name || users[0]?.name || 'Business Owner';
        await sendBusinessApprovalEmail(email, name, ownerName);
      } catch (emailError) {
        console.error('Failed to send business approval email:', emailError);
      }
    }
    
    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/businesses] Error creating business:', error);
    console.error('[POST /api/businesses] Error details:', error.message);
    console.error('[POST /api/businesses] Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to create business', details: error.message },
      { status: 500 }
    );
  }
}
