import { NextResponse } from 'next/server';
import { getCurrentCustomer, serializeCustomer } from '@/lib/customerAccountAuth';

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ success: false, customer: null }, { status: 401 });
  }

  return NextResponse.json({ success: true, customer: serializeCustomer(customer) });
}

export const dynamic = 'force-dynamic';
