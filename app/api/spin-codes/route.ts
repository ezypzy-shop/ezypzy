import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get all codes for user
    const result = await sql`
      SELECT * FROM spin_wheel_history
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching spin codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spin codes' },
      { status: 500 }
    );
  }
}
