import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function POST(request: NextRequest) {
  try {
    const { userId, userType, pushToken } = await request.json();

    if (!userId || !userType || !pushToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update push token in the correct table
    if (userType === 'customer') {
      await sql`
        UPDATE users 
        SET push_token = ${pushToken}
        WHERE id = ${userId}
      `;
    } else if (userType === 'business') {
      await sql`
        UPDATE businesses 
        SET push_token = ${pushToken}
        WHERE id = ${userId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push token:', error);
    return NextResponse.json(
      { error: 'Failed to save push token' },
      { status: 500 }
    );
  }
}
