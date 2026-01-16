import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function POST(request: NextRequest) {
  try {
    const { phone, otp, name, email, is_business_user, action } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // Find the OTP record
    const otpRecords = await sql`
      SELECT * FROM otp_codes 
      WHERE phone_number = ${phone}
      AND otp_code = ${otp}
      AND is_verified = false
      AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (otpRecords.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    const otpRecord = otpRecords[0];

    // Mark OTP as verified
    await sql`
      UPDATE otp_codes 
      SET is_verified = true
      WHERE id = ${otpRecord.id}
    `;

    // Clean up old OTP records for this phone number
    await sql`
      DELETE FROM otp_codes 
      WHERE phone_number = ${phone}
      AND id != ${otpRecord.id}
    `;

    console.log(`✅ OTP verified for ${phone}`);

    // If action is 'sign-in', retrieve existing user
    if (action === 'sign-in') {
      const users = await sql`SELECT * FROM users WHERE phone = ${phone}`;
      
      if (users.length === 0) {
        return NextResponse.json(
          { error: 'User account not found' },
          { status: 404 }
        );
      }

      const user = users[0];
      console.log(`✅ User signed in: ${user.phone}`);

      return NextResponse.json({
        success: true,
        message: 'Sign in successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          login_method: user.login_method,
          is_business_user: user.is_business_user,
        },
      });
    }

    // If action is 'sign-up', create new user (default behavior)
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required for sign-up' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUsers = await sql`
      SELECT * FROM users WHERE phone = ${phone}
    `;

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'User already exists with this phone number' },
        { status: 400 }
      );
    }

    console.log('💾 Creating user in database...');

    // Create user in database
    const newUsers = await sql`
      INSERT INTO users (name, email, phone, login_method, is_business_user)
      VALUES (
        ${name},
        ${email || null},
        ${phone},
        'phone',
        ${is_business_user || false}
      )
      RETURNING *
    `;

    if (newUsers.length === 0) {
      console.error('❌ Failed to create user - no rows returned');
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    const newUser = newUsers[0];
    console.log(`✅ User created in database: ${newUser.id}`);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        login_method: newUser.login_method,
        is_business_user: newUser.is_business_user,
      },
    });
  } catch (error: any) {
    console.error('❌ Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP', details: error.message },
      { status: 500 }
    );
  }
}
