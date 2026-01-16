import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

// POST /api/spin-codes/validate - Validate and get discount code details
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, business_id } = body;

    if (!code || !business_id) {
      return NextResponse.json({ error: 'Code and business_id are required' }, { status: 400 });
    }

    // Fetch the code and validate it
    const codes = await sql`
      SELECT 
        sc.*,
        b.name as business_name
      FROM spin_codes sc
      JOIN businesses b ON sc.business_id = b.id
      WHERE sc.code = ${code.trim().toUpperCase()}
      AND sc.business_id = ${business_id}
      AND sc.used = false
      AND sc.expires_at > NOW()
    `;

    if (codes.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid or expired code',
        valid: false 
      }, { status: 400 });
    }

    const codeData = codes[0];

    return NextResponse.json({
      valid: true,
      code: codeData.code,
      discount_type: codeData.discount_type,
      discount_amount: codeData.discount_amount,
      business_id: codeData.business_id,
      business_name: codeData.business_name,
    });
  } catch (error: any) {
    console.error('Error validating spin code:', error);
    return NextResponse.json({ error: error.message || 'Failed to validate code' }, { status: 500 });
  }
}
