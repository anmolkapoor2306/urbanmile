import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCurrentAdminAuth } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/authPermissions';
import { getPricingConfig, updatePricingConfig } from '@/lib/pricingConfig';

export const dynamic = 'force-dynamic';

const pricingConfigSchema = z.object({
  fuelPricePerLiter: z.number().positive().optional(),
  maintenanceCostPerKm: z.number().min(0).optional(),
  platformCharges: z.number().min(0).optional(),
  profitMarginPercent: z.number().min(0).optional(),
  driverMonthlySalary: z.number().min(0).optional(),
  carMonthlyEmi: z.number().min(0).optional(),
  annualPermitCost: z.number().min(0).optional(),
  annualInsuranceCost: z.number().min(0).optional(),
  monthlyOperationalKm: z.number().positive().optional(),
  annualOperationalKm: z.number().positive().optional(),
  defaultOneWayTollCost: z.number().min(0).optional(),
  defaultRoundTripTollCost: z.number().min(0).nullable().optional(),
  fuelEconomyKmpl: z
    .object({
      SEDAN: z.number().positive().optional(),
      SUV: z.number().positive().optional(),
      PREMIUM: z.number().positive().optional(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireCurrentAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'pricing:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    return NextResponse.json({ success: true, data: await getPricingConfig() });
  } catch (error) {
    console.error('[Pricing Config API] read error', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load pricing configuration.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireCurrentAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'pricing:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = pricingConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid pricing configuration.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: await updatePricingConfig(result.data),
    });
  } catch (error) {
    console.error('[Pricing Config API] save error', error);
    return NextResponse.json(
      { success: false, error: 'Unable to save pricing configuration.' },
      { status: 500 }
    );
  }
}
