'use client';

import { useEffect, useState } from 'react';
import { Bell, DollarSign, History, Lock, SlidersHorizontal } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

type TabKey = 'GENERAL' | 'PRICING' | 'NOTIFICATIONS' | 'SECURITY' | 'AUDIT_LOG';

const TABS: { key: TabKey; label: string; icon: typeof SlidersHorizontal }[] = [
  { key: 'GENERAL', label: 'General', icon: SlidersHorizontal },
  { key: 'PRICING', label: 'Pricing & Fees', icon: DollarSign },
  { key: 'NOTIFICATIONS', label: 'Notifications', icon: Bell },
  { key: 'SECURITY', label: 'Security', icon: Lock },
  { key: 'AUDIT_LOG', label: 'Audit Log', icon: History },
];

interface PlatformConfigData {
  platform_name: string;
  support_email: string;
  support_whatsapp: string;
  is_live: boolean;
  allow_registrations: boolean;
  require_listing_approval: boolean;
  tenant_monthly_rwf: number;
  landlord_registration_rwf: number;
  transaction_fee_pct: number;
  featured_listing_monthly_rwf: number;
  featured_listing_weekly_rwf: number;
  notification_settings: { email_enabled?: boolean; whatsapp_enabled?: boolean; sms_enabled?: boolean };
  security_settings: { require_2fa_admins?: boolean; session_timeout_minutes?: number };
}

interface AuditLogEntry {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<TabKey>('GENERAL');
  const [config, setConfig] = useState<PlatformConfigData | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setConfig(json.data);
      });
  }, []);

  useEffect(() => {
    if (tab !== 'AUDIT_LOG') return;
    const params = new URLSearchParams({ page: String(page), category: categoryFilter });
    fetch(`/api/admin/audit-log?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setLogs(json.data.logs);
          setCategories(json.data.categories);
          setTotalLogs(json.data.total);
        }
      });
  }, [tab, page, categoryFilter]);

  async function saveConfig(patch: Partial<PlatformConfigData>) {
    if (!config) return;
    setSaving(true);
    setSavedMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (json.success) {
        setConfig(json.data);
        setSavedMessage('Settings saved.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return <p className="text-sm text-gray-500">Loading settings…</p>;
  }

  const totalPages = Math.max(1, Math.ceil(totalLogs / 20));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === key ? 'bg-brand-teal text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {savedMessage && tab !== 'AUDIT_LOG' && <p className="text-sm text-green-600">{savedMessage}</p>}

      {tab === 'GENERAL' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platform Name</label>
            <input
              defaultValue={config.platform_name}
              onBlur={(e) => saveConfig({ platform_name: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
            <input
              defaultValue={config.support_email}
              onBlur={(e) => saveConfig({ support_email: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Support WhatsApp</label>
            <input
              defaultValue={config.support_whatsapp}
              onBlur={(e) => saveConfig({ support_whatsapp: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          {(
            [
              ['is_live', 'Platform Live'],
              ['allow_registrations', 'Allow New Registrations'],
              ['require_listing_approval', 'Require Listing Approval'],
            ] as const
          ).map(([field, label]) => (
            <div key={field} className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">{label}</p>
              <input
                type="checkbox"
                checked={config[field]}
                onChange={(e) => saveConfig({ [field]: e.target.checked })}
                disabled={saving}
                className="w-4 h-4 accent-brand-teal"
              />
            </div>
          ))}
        </div>
      )}

      {tab === 'PRICING' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-lg">
          {(
            [
              ['tenant_monthly_rwf', 'Tenant Monthly Subscription (RWF)'],
              ['landlord_registration_rwf', 'Landlord Registration Fee (RWF)'],
              ['featured_listing_monthly_rwf', 'Featured Listing — Monthly (RWF)'],
              ['featured_listing_weekly_rwf', 'Featured Listing — Weekly (RWF)'],
            ] as const
          ).map(([field, label]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="number"
                defaultValue={config[field]}
                onBlur={(e) => saveConfig({ [field]: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Fee (0–1, e.g. 0.02 = 2%)
            </label>
            <input
              type="number"
              step="0.001"
              defaultValue={config.transaction_fee_pct}
              onBlur={(e) => saveConfig({ transaction_fee_pct: Number(e.target.value) })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {tab === 'NOTIFICATIONS' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-lg">
          {(
            [
              ['email_enabled', 'Email Notifications'],
              ['whatsapp_enabled', 'WhatsApp Notifications'],
              ['sms_enabled', 'SMS Notifications'],
            ] as const
          ).map(([field, label]) => (
            <div key={field} className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">{label}</p>
              <input
                type="checkbox"
                checked={!!config.notification_settings[field]}
                onChange={(e) =>
                  saveConfig({
                    notification_settings: { ...config.notification_settings, [field]: e.target.checked },
                  })
                }
                disabled={saving}
                className="w-4 h-4 accent-brand-teal"
              />
            </div>
          ))}
        </div>
      )}

      {tab === 'SECURITY' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Require 2FA for Admins</p>
            <input
              type="checkbox"
              checked={!!config.security_settings.require_2fa_admins}
              onChange={(e) =>
                saveConfig({
                  security_settings: {
                    ...config.security_settings,
                    require_2fa_admins: e.target.checked,
                  },
                })
              }
              disabled={saving}
              className="w-4 h-4 accent-brand-teal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              defaultValue={config.security_settings.session_timeout_minutes ?? 60}
              onBlur={(e) =>
                saveConfig({
                  security_settings: {
                    ...config.security_settings,
                    session_timeout_minutes: Number(e.target.value),
                  },
                })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {tab === 'AUDIT_LOG' && (
        <div className="space-y-4">
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

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500 p-6">No audit log entries.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">
                      {log.entity_type}
                      {log.entity_id ? ` · ${log.entity_id}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                </div>
              ))
            )}
          </div>

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
      )}
    </div>
  );
}
