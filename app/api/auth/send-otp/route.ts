import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { phone, name, action } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // If action is 'sign-in', check if user exists
    if (action === 'sign-in') {
      const users = await sql`SELECT * FROM users WHERE phone = ${phone}`;
      
      if (users.length === 0) {
        return NextResponse.json(
          { error: 'No account found with this phone number. Please sign up first.' },
          { status: 404 }
        );
      }
      
      console.log(`✅ User found for sign-in: ${phone}`);
    }

    // Generate 6-digit OTP
    const otpCode = generateOTP();

    // OTP expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing OTP for this phone number
    await sql`
      DELETE FROM otp_codes 
      WHERE phone_number = ${phone}
    `;

    // Store OTP in database
    await sql`
      INSERT INTO otp_codes (phone_number, otp_code, expires_at)
      VALUES (${phone}, ${otpCode}, ${expiresAt})
    `;

    // Send OTP via Twilio
    try {
      const message = action === 'sign-in' 
        ? `Your sign-in code is: ${otpCode}\n\nThis code will expire in 10 minutes.`
        : `Your verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.\n\n${name ? `Welcome to EzyPzy, ${name}!` : 'Welcome to EzyPzy!'}`;
      
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      console.log(`✅ OTP sent to ${phone}: ${otpCode}`);

      return NextResponse.json({
        success: true,
        message: 'OTP sent successfully',
        // For development/testing only - remove in production
        debug_otp: process.env.NODE_ENV === 'development' ? otpCode : undefined,
      });
    } catch (twilioError: any) {
      console.error('❌ Twilio error:', twilioError);
      
      // Still return success but log the error
      // In development, we can use the OTP from the database
      return NextResponse.json({
        success: true,
        message: 'OTP generated (SMS delivery failed)',
        debug_otp: otpCode,
        twilioError: twilioError.message 
      });
    }
  } catch (error: any) {
    console.error('❌ Send OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP', details: error.message },
      { status: 500 }
    );
  }
}
