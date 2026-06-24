import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorScheme?: 'teal' | 'navy' | 'gold' | 'red' | 'green';
  trend?: number;
}

const colorMap = {
  teal: {
    bg: 'bg-teal-50',
    icon: 'text-teal-600',
    iconBg: 'bg-teal-100',
  },
  navy: {
    bg: 'bg-blue-50',
    icon: 'text-blue-800',
    iconBg: 'bg-blue-100',
  },
  gold: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    iconBg: 'bg-red-100',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    iconBg: 'bg-green-100',
  },
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  colorScheme = 'teal',
  trend,
}: KpiCardProps) {
  const colors = colorMap[colorScheme];

  return (
    <div className={cn('rounded-xl p-5 border border-gray-100 shadow-sm bg-white')}>
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', colors.iconBg)}>
          <Icon className={cn('w-5 h-5', colors.icon)} />
        </div>
        {trend !== undefined && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              trend >= 0
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            )}
          >
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}