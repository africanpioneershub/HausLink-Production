import { NextResponse } from 'next/server';
import { billingQueue, disbursementQueue } from '@/lib/bullmq/queues';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  await billingQueue.add('GENERATE_MONTHLY_INVOICES', {
    trigger: 'GENERATE_MONTHLY_INVOICES',
  });
  await disbursementQueue.add('PROCESS_PENDING_DISBURSEMENTS', {});

  await Promise.all([
    prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_platform_revenue_monthly`,
    prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_growth_weekly`,
    prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_property_demand_by_city`,
    prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_landlord_finance_monthly`,
  ]);

  return NextResponse.json({ success: true, data: { triggered: true } });
}
