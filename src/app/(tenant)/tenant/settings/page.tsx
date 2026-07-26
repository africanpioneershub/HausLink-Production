'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { useCsrf, csrfHeaders } from '@/hooks/useCsrf';

type TabKey = 'PROFILE' | 'SECURITY' | 'VERIFICATION' | 'NOTIFICATIONS';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'PROFILE', label: 'Profile' },
  { key: 'SECURITY', label: 'Security' },
  { key: 'VERIFICATION', label: 'Verification' },
  { key: 'NOTIFICATIONS', label: 'Notification Preferences' },
];

const KYC_BADGE: Record<string, string> = {
  NOT_SUBMITTED: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const KYC_MESSAGE: Record<string, string> = {
  NOT_SUBMITTED: 'You have not submitted your KYC documents yet.',
  PENDING: 'Your KYC documents are under review by our team.',
  APPROVED: 'Your identity has been verified.',
  REJECTED: 'Your KYC submission was rejected. Please resubmit your documents.',
};

interface ProfileData {
  id: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  district: string | null;
  kyc_status: string;
}

interface PreferencesData {
  notification_email: boolean;
  notification_whatsapp: boolean;
  payout_momo_number: string | null;
  theme: string;
  language: string;
}

export default function TenantSettingsPage() {
  return (
    <Suspense fallback={null}>
      <TenantSettingsContent />
    </Suspense>
  );
}

function TenantSettingsContent() {
  const csrf = useCsrf();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>('PROFILE');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [preferences, setPreferences] = useState<PreferencesData | null>(null);

  useEffect(() => {
    if (searchParams.get('tab') === 'verification') {
      setActiveTab('VERIFICATION');
    }
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setProfile(json.data);
        }
      });

    fetch('/api/user/preferences')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setPreferences(json.data);
      });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === key ? 'bg-brand-teal text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'PROFILE' && (
        <ProfileForm profile={profile} csrf={csrf} onSave={setProfile} />
      )}

      {activeTab === 'SECURITY' && (
        <SecurityForm csrf={csrf} />
      )}

      {activeTab === 'VERIFICATION' && profile && (
        <VerificationForm
          profile={profile}
          csrf={csrf}
          onSubmitSuccess={() => setProfile((prev) => (prev ? { ...prev, kyc_status: 'PENDING' } : prev))}
        />
      )}

      {activeTab === 'NOTIFICATIONS' && preferences && (
        <NotificationForm
          preferences={preferences}
          csrf={csrf}
          onPreferencesChange={setPreferences}
        />
      )}
    </div>
  );
}

interface ProfileFormProps {
  profile: ProfileData | null;
  csrf: string;
  onSave: (updated: ProfileData) => void;
}

function ProfileForm({ profile, csrf, onSave }: ProfileFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setPhone(profile.phone ?? '');
      setCity(profile.city ?? '');
      setDistrict(profile.district ?? '');
    }
  }, [profile]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: csrfHeaders(csrf),
        body: JSON.stringify({ name, phone, city, district }),
      });
      const json = await res.json();
      if (json.success) onSave(json.data);
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <form
      onSubmit={handleProfileSave}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-lg"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={savingProfile}
        className="bg-brand-teal text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {savingProfile ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
}

interface SecurityFormProps {
  csrf: string;
}

function SecurityForm({ csrf }: SecurityFormProps) {
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMessage(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setPasswordMessage(error ? error.message : 'Password updated successfully.');
      if (!error) setNewPassword('');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <form
      onSubmit={handlePasswordChange}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-lg"
    >
      {passwordMessage && <p className="text-sm text-gray-600">{passwordMessage}</p>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={savingPassword}
        className="bg-brand-teal text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {savingPassword ? 'Updating…' : 'Update Password'}
      </button>
    </form>
  );
}

interface VerificationFormProps {
  profile: ProfileData;
  csrf: string;
  onSubmitSuccess: () => void;
}

function VerificationForm({ profile, csrf, onSubmitSuccess }: VerificationFormProps) {
  const [documentType, setDocumentType] = useState<'NATIONAL_ID' | 'PASSPORT'>('NATIONAL_ID');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleKycSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a file to upload');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'x-csrf-token': csrf },
        body: formData,
      });
      const json = await res.json();
      if (!json.success) {
        setUploadError(json.error ?? 'Failed to upload document');
        return;
      }
      setFile(null);
      onSubmitSuccess();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-lg">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">KYC Status</h2>
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
            KYC_BADGE[profile.kyc_status]
          )}
        >
          {profile.kyc_status.replace('_', ' ')}
        </span>
      </div>
      <p className="text-sm text-gray-600">{KYC_MESSAGE[profile.kyc_status]}</p>

      {profile.kyc_status === 'NOT_SUBMITTED' || profile.kyc_status === 'REJECTED' ? (
        <form onSubmit={handleKycSubmit} className="mt-5 space-y-4">
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type
            </label>
            <div className="flex gap-3">
              {(['NATIONAL_ID', 'PASSPORT'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDocumentType(type)}
                  className={cn(
                    'flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors',
                    documentType === type
                      ? 'border-brand-teal bg-brand-teal/5 text-brand-teal'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  {type === 'NATIONAL_ID' ? 'National ID' : 'Passport'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Document
            </label>
            <label className="flex flex-col items-center gap-2 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-brand-teal transition-colors cursor-pointer">
              <Upload className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-600">
                {file ? file.name : 'Click to upload JPG, PNG, or PDF (max 5MB)'}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="bg-brand-teal text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Submit Documents'}
          </button>
        </form>
      ) : profile.kyc_status === 'PENDING' ? (
        <p className="mt-4 text-sm text-gray-500">Documents under review.</p>
      ) : null}
    </div>
  );
}

interface NotificationFormProps {
  preferences: PreferencesData;
  csrf: string;
  onPreferencesChange: (updated: PreferencesData) => void;
}

function NotificationForm({ preferences, csrf, onPreferencesChange }: NotificationFormProps) {
  const [savingPreferences, setSavingPreferences] = useState(false);

  async function handlePreferenceToggle(key: 'notification_email' | 'notification_whatsapp') {
    const updated = { ...preferences, [key]: !preferences[key] };
    onPreferencesChange(updated);
    setSavingPreferences(true);
    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: csrfHeaders(csrf),
        body: JSON.stringify({ [key]: updated[key] }),
      });
    } finally {
      setSavingPreferences(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Email Notifications</p>
          <p className="text-xs text-gray-500">Receive updates via email.</p>
        </div>
        <input
          type="checkbox"
          checked={preferences.notification_email}
          onChange={() => handlePreferenceToggle('notification_email')}
          disabled={savingPreferences}
          className="w-4 h-4 accent-brand-teal"
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">WhatsApp Notifications</p>
          <p className="text-xs text-gray-500">Receive updates via WhatsApp.</p>
        </div>
        <input
          type="checkbox"
          checked={preferences.notification_whatsapp}
          onChange={() => handlePreferenceToggle('notification_whatsapp')}
          disabled={savingPreferences}
          className="w-4 h-4 accent-brand-teal"
        />
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-900">Language</p>
          <p className="text-xs text-gray-500">Multi-language support is coming in Phase 2.</p>
        </div>
        <select
          disabled
          value={preferences.language}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-gray-50 text-gray-400"
        >
          <option value="EN">English</option>
          <option value="RW">Kinyarwanda</option>
        </select>
      </div>
    </div>
  );
}
