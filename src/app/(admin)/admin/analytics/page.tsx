'use client';

import { useEffect, useState } from 'react';
import { Activity, Building2, CreditCard, TrendingUp, Users, Wrench } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { formatDate } from '@/lib/utils';

interface RevenuePoint {
  month: string;
  revenue: number;
  transactions: number;
}

interface UserGrowthPoint {
  week: string;
  tenants: number;
  landlords: number;
  admins: number;
}

interface PropertyAnalyticsRow {
  city: string;
  active: number;
  occupied: number;
  applications: number;
}

interface SubscriptionPoint {
  month: string;
  tenantSubscriptions: number;
  landlordRegistrations: number;
  featuredListings: number;
}

interface OperationsPoint {
  month: string;
  maintenanceRequests: number;
  avgResolutionDays: number;
  applicationsProcessed: number;
}

interface ActivityEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}

interface AnalyticsData {
  revenue: RevenuePoint[];
  userGrowth: UserGrowthPoint[];
  propertyAnalytics: PropertyAnalyticsRow[];
  subscriptions: SubscriptionPoint[];
  operations: OperationsPoint[];
  recentActivity: ActivityEntry[];
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveActivity, setLiveActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
          setLiveActivity(json.data.recentActivity);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel('admin-activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_log' },
        (payload: { new: ActivityEntry }) => {
          setLiveActivity((prev) => [payload.new, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading || !data) {
    return <p className="text-sm text-gray-500">Loading analytics…</p>;
  }

  const latestOperations = data.operations[data.operations.length - 1];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <TrendingUp className="w-5 h-5 text-brand-teal" />
          Revenue
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.revenue}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => `RWF ${Number(value).toLocaleString('en-US')}`} />
            <Bar dataKey="revenue" fill="#0D7C6E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <Users className="w-5 h-5 text-brand-navy" />
          User Growth
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data.userGrowth}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="tenants" stroke="#0D7C6E" strokeWidth={2} dot={false} name="Tenants" />
            <Line type="monotone" dataKey="landlords" stroke="#C9900C" strokeWidth={2} dot={false} name="Landlords" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <Building2 className="w-5 h-5 text-brand-navy" />
          Property Analytics
        </h2>
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left py-2">City</th>
              <th className="text-left py-2">Active Listings</th>
              <th className="text-left py-2">Occupied</th>
              <th className="text-left py-2">Applications</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.propertyAnalytics.map((row) => (
              <tr key={row.city}>
                <td className="py-2 text-gray-900 font-medium">{row.city}</td>
                <td className="py-2 text-gray-700">{row.active}</td>
                <td className="py-2 text-gray-700">{row.occupied}</td>
                <td className="py-2 text-gray-700">{row.applications}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <CreditCard className="w-5 h-5 text-brand-gold" />
          Subscriptions
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.subscriptions}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="tenantSubscriptions" fill="#0D7C6E" name="Tenant Subscriptions" radius={[4, 4, 0, 0]} />
            <Bar dataKey="landlordRegistrations" fill="#C9900C" name="Landlord Registrations" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <Wrench className="w-5 h-5 text-brand-navy" />
          Operations
        </h2>
        {latestOperations ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Maintenance Requests</p>
              <p className="text-xl font-semibold text-gray-900">
                {latestOperations.maintenanceRequests}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Avg Resolution Time</p>
              <p className="text-xl font-semibold text-gray-900">
                {latestOperations.avgResolutionDays.toFixed(1)} days
              </p>
            </div>
            <div>
              <p className="text-gray-500">Applications Processed</p>
              <p className="text-xl font-semibold text-gray-900">
                {latestOperations.applicationsProcessed}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No operations data yet.</p>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <Activity className="w-5 h-5 text-brand-teal" />
          Live Activity Feed
        </h2>
        {liveActivity.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity.</p>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {liveActivity.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-900">
                  {entry.action.replace(/_/g, ' ')} · {entry.entity_type}
                </span>
                <span className="text-xs text-gray-400">{formatDate(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
