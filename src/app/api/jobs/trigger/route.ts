import { NextResponse } from 'next/server';
import { billingQueue, disbursementQueue } from '@/lib/bullmq/queues';

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

  return NextResponse.json({ success: true, data: { triggered: true } });
}
