'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { KpiCard } from '@/components/shared/KpiCard';
import { formatRwf } from '@/lib/utils';

interface ChartPoint {
  month: string;
  income: number;
  expenses: number;
}

interface FinanceData {
  chart: ChartPoint[];
  ytd: { income: number; expenses: number; profit: number };
  selectedMonth: string;
  selected: { income: number; expenses: number; profit: number };
}

function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function LandlordFinancePage() {
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/landlord/finance?month=${month}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Finance &amp; Reports</h1>

      <div className="flex items-center justify-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-3 w-fit">
        <button
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="p-1.5 rounded-lg hover:bg-gray-100"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-sm font-medium text-gray-900 w-28 text-center">
          {new Date(`${month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {loading && !data && <p className="text-sm text-gray-500">Loading…</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="YTD Income"
              value={formatRwf(data.ytd.income)}
              icon={TrendingUp}
              colorScheme="green"
            />
            <KpiCard
              label="YTD Expenses"
              value={formatRwf(data.ytd.expenses)}
              icon={TrendingDown}
              colorScheme="red"
            />
            <KpiCard
              label="YTD Profit"
              value={formatRwf(data.ytd.profit)}
              icon={Wallet}
              colorScheme="teal"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Income vs Expenses</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => `RWF ${Number(value).toLocaleString('en-US')}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#0D7C6E"
                  strokeWidth={2}
                  dot={false}
                  name="Income"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#C9900C"
                  strokeWidth={2}
                  dot={false}
                  name="Expenses"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Selected Month Income</p>
              <p className="font-semibold text-gray-900">{formatRwf(data.selected.income)}</p>
            </div>
            <div>
              <p className="text-gray-500">Selected Month Expenses</p>
              <p className="font-semibold text-gray-900">{formatRwf(data.selected.expenses)}</p>
            </div>
            <div>
              <p className="text-gray-500">Selected Month Profit</p>
              <p className="font-semibold text-gray-900">{formatRwf(data.selected.profit)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
