'use client';

import { useEffect, useState } from 'react';
import { cn, formatDate } from '@/lib/utils';

interface AuditLogEntry {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), category: categoryFilter });
    fetch(`/api/admin/audit-log?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setLogs(json.data.logs);
          setCategories(json.data.categories);
          setTotalLogs(json.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [page, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(totalLogs / 20));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500">{totalLogs} entries</p>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500 p-6">No audit log entries.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{log.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {log.entity_type}
                    {log.entity_id ? ` · ${log.entity_id}` : ''}
                    {log.admin_id ? ` · Admin: ${log.admin_id}` : ''}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-4">{formatDate(log.created_at)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                'w-8 h-8 rounded-lg text-sm font-medium',
                p === page ? 'bg-brand-teal text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
