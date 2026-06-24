import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

interface RevenueRow {
  year: number;
  month: number;
  revenue: number;
  transactions: number;
}

interface UserGrowthRow {
  year: number;
  week: number;
  role: string;
  new_users: number;
}

interface PropertyDemandRow {
  city: string;
  active_listings: number;
  occupied_listings: number;
  application_count: number;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const GET = withAuth(['ADMIN'])(
  async () => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const revenueCutoffKey = sixMonthsAgo.getFullYear() * 12 + (sixMonthsAgo.getMonth() + 1);

    const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
    const weekCutoffKey = twelveWeeksAgo.getFullYear() * 53 + getIsoWeek(twelveWeeksAgo);

    const [revenueRows, userGrowthRows, propertyDemandRows, recentActivity] = await Promise.all([
      prisma.$queryRaw<RevenueRow[]>`
        SELECT year, month, SUM(total_rwf)::float AS revenue, SUM(transaction_count)::int AS transactions
        FROM mv_platform_revenue_monthly
        WHERE (year * 12 + month) >= ${revenueCutoffKey}
        GROUP BY year, month
        ORDER BY year, month
      `,
      prisma.$queryRaw<UserGrowthRow[]>`
        SELECT year, week, role, SUM(new_users)::int AS new_users
        FROM mv_user_growth_weekly
        WHERE (year * 53 + week) >= ${weekCutoffKey}
        GROUP BY year, week, role
        ORDER BY year, week
      `,
      prisma.$queryRaw<PropertyDemandRow[]>`
        SELECT city,
          SUM(active_listings)::int AS active_listings,
          SUM(occupied_listings)::int AS occupied_listings,
          SUM(application_count)::int AS application_count
        FROM mv_property_demand_by_city
        GROUP BY city
        ORDER BY application_count DESC
      `,
      prisma.auditLog.findMany({ orderBy: { created_at: 'desc' }, take: 20 }),
    ]);

    const [subscriptionPayments, maintenanceRequests, processedApplications] = await Promise.all([
      prisma.payment.findMany({
        where: {
          status: 'COMPLETED',
          paid_at: { gte: sixMonthsAgo },
          type: { in: ['SUBSCRIPTION', 'REGISTRATION', 'FEATURED_LISTING'] },
        },
        select: { type: true, paid_at: true },
      }),
      prisma.maintenanceRequest.findMany({
        where: { created_at: { gte: sixMonthsAgo } },
        select: { created_at: true, resolved_at: true },
      }),
      prisma.application.findMany({
        where: { applied_at: { gte: sixMonthsAgo }, status: { in: ['APPROVED', 'REJECTED'] } },
        select: { applied_at: true },
      }),
    ]);

    const monthKeys: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
      monthKeys.push(`${d.getFullYear()}-${d.getMonth()}`);
    }
    const monthLabel = (key: string) => MONTH_NAMES[Number(key.split('-')[1])];

    const subscriptionsByMonth = new Map(monthKeys.map((k) => [k, { tenantSubscriptions: 0, landlordRegistrations: 0, featuredListings: 0 }]));
    for (const p of subscriptionPayments) {
      if (!p.paid_at) continue;
      const key = `${p.paid_at.getFullYear()}-${p.paid_at.getMonth()}`;
      const bucket = subscriptionsByMonth.get(key);
      if (!bucket) continue;
      if (p.type === 'SUBSCRIPTION') bucket.tenantSubscriptions += 1;
      else if (p.type === 'REGISTRATION') bucket.landlordRegistrations += 1;
      else if (p.type === 'FEATURED_LISTING') bucket.featuredListings += 1;
    }

    const operationsByMonth = new Map(
      monthKeys.map((k) => [k, { maintenanceRequests: 0, resolutionDaysSum: 0, resolvedCount: 0, applicationsProcessed: 0 }])
    );
    for (const m of maintenanceRequests) {
      const key = `${m.created_at.getFullYear()}-${m.created_at.getMonth()}`;
      const bucket = operationsByMonth.get(key);
      if (!bucket) continue;
      bucket.maintenanceRequests += 1;
      if (m.resolved_at) {
        bucket.resolutionDaysSum += (m.resolved_at.getTime() - m.created_at.getTime()) / (1000 * 60 * 60 * 24);
        bucket.resolvedCount += 1;
      }
    }
    for (const a of processedApplications) {
      const key = `${a.applied_at.getFullYear()}-${a.applied_at.getMonth()}`;
      const bucket = operationsByMonth.get(key);
      if (bucket) bucket.applicationsProcessed += 1;
    }

    const userGrowthByWeek = new Map<string, { tenants: number; landlords: number; admins: number }>();
    for (const row of userGrowthRows) {
      const key = `${row.year}-${row.week}`;
      const bucket = userGrowthByWeek.get(key) ?? { tenants: 0, landlords: 0, admins: 0 };
      if (row.role === 'TENANT') bucket.tenants += Number(row.new_users);
      else if (row.role === 'LANDLORD') bucket.landlords += Number(row.new_users);
      else if (row.role === 'ADMIN') bucket.admins += Number(row.new_users);
      userGrowthByWeek.set(key, bucket);
    }

    return NextResponse.json({
      success: true,
      data: {
        revenue: revenueRows.map((r) => ({
          month: MONTH_NAMES[r.month - 1],
          revenue: Number(r.revenue),
          transactions: Number(r.transactions),
        })),
        userGrowth: Array.from(userGrowthByWeek.entries()).map(([key, counts]) => ({
          week: `Wk ${key.split('-')[1]}`,
          ...counts,
        })),
        propertyAnalytics: propertyDemandRows.map((r) => ({
          city: r.city,
          active: Number(r.active_listings),
          occupied: Number(r.occupied_listings),
          applications: Number(r.application_count),
        })),
        subscriptions: monthKeys.map((key) => ({
          month: monthLabel(key),
          ...subscriptionsByMonth.get(key)!,
        })),
        operations: monthKeys.map((key) => {
          const bucket = operationsByMonth.get(key)!;
          return {
            month: monthLabel(key),
            maintenanceRequests: bucket.maintenanceRequests,
            avgResolutionDays: bucket.resolvedCount > 0 ? bucket.resolutionDaysSum / bucket.resolvedCount : 0,
            applicationsProcessed: bucket.applicationsProcessed,
          };
        }),
        recentActivity,
      },
    });
  }
);

function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
