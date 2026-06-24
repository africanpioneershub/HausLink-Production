import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

interface FinanceRow {
  year: number;
  month: number;
  gross_income_rwf: number;
  total_expenses_rwf: number;
  net_profit_rwf: number;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const GET = withAuth(['LANDLORD'])(
  async (request, _context, user) => {
    const url = new URL(request.url);
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const selectedMonth = url.searchParams.get('month') ?? defaultMonth;
    const [selectedYearStr, selectedMonthStr] = selectedMonth.split('-');
    const selectedYear = Number(selectedYearStr);
    const selectedMonthNum = Number(selectedMonthStr);

    const rows = await prisma.$queryRaw<FinanceRow[]>`
      SELECT year, month, gross_income_rwf, total_expenses_rwf, net_profit_rwf
      FROM mv_landlord_finance_monthly
      WHERE landlord_id = ${user.id} AND year = ${selectedYear}
      ORDER BY month ASC
    `;

    const ytd = rows.reduce(
      (acc, row) => ({
        income: acc.income + Number(row.gross_income_rwf),
        expenses: acc.expenses + Number(row.total_expenses_rwf),
        profit: acc.profit + Number(row.net_profit_rwf),
      }),
      { income: 0, expenses: 0, profit: 0 }
    );

    const selectedRow = rows.find((row) => row.month === selectedMonthNum);

    return NextResponse.json({
      success: true,
      data: {
        chart: rows.map((row) => ({
          month: MONTH_NAMES[row.month - 1],
          income: Number(row.gross_income_rwf),
          expenses: Number(row.total_expenses_rwf),
        })),
        ytd,
        selectedMonth,
        selected: selectedRow
          ? {
              income: Number(selectedRow.gross_income_rwf),
              expenses: Number(selectedRow.total_expenses_rwf),
              profit: Number(selectedRow.net_profit_rwf),
            }
          : { income: 0, expenses: 0, profit: 0 },
      },
    });
  }
);
