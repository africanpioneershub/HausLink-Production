'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Upload, X } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import type { MaintenanceCategory, MaintenancePriority, MaintenanceStatus } from '@/types';

interface MaintenanceRequestItem {
  id: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  photo_urls: string[];
  created_at: string;
  property: { title: string };
}

const PRIORITY_BADGE: Record<MaintenancePriority, string> = {
  EMERGENCY: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-gray-100 text-gray-700',
};

const CATEGORIES: MaintenanceCategory[] = [
  'PLUMBING',
  'ELECTRICAL',
  'HVAC',
  'STRUCTURAL',
  'APPLIANCE',
  'CLEANING',
  'SECURITY',
  'OTHER',
];
const PRIORITIES: MaintenancePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'];

export default function TenantMaintenancePage() {
  const [hasTenancy, setHasTenancy] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('OTHER');
  const [priority, setPriority] = useState<MaintenancePriority>('MEDIUM');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/tenant/tenancy').then((res) => res.json()),
      fetch('/api/tenant/maintenance').then((res) => res.json()),
    ])
      .then(([tenancyJson, requestsJson]) => {
        setHasTenancy(!!tenancyJson.data);
        if (requestsJson.success) setRequests(requestsJson.data);
      })
      .finally(() => setLoading(false));
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3 - photos.length);
    setPhotos((prev) => [...prev, ...files].slice(0, 3));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const requestId = crypto.randomUUID();
      const photoUrls: string[] = [];

      for (const file of photos) {
        const path = `${user.id}/${requestId}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('maintenance-photos')
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage
          .from('maintenance-photos')
          .getPublicUrl(path);
        photoUrls.push(publicUrlData.publicUrl);
      }

      const res = await fetch('/api/tenant/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, priority, description, photo_urls: photoUrls }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to submit request');

      setRequests((prev) => [json.data, ...prev]);
      setShowForm(false);
      setTitle('');
      setDescription('');
      setCategory('OTHER');
      setPriority('MEDIUM');
      setPhotos([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
        {hasTenancy && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-brand-teal text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {showForm ? 'Cancel' : 'New Request'}
          </button>
        )}
      </div>

      {hasTenancy === false && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>You need an active tenancy to submit maintenance requests.</p>
        </div>
      )}

      {showForm && hasTenancy && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4"
        >
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photos ({photos.length}/3)
            </label>
            <div className="flex flex-wrap gap-3">
              {photos.map((file, i) => (
                <div
                  key={i}
                  className="relative w-20 h-20 rounded-lg border border-gray-200 overflow-hidden"
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400"
                >
                  <Upload className="w-5 h-5" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-brand-teal text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading requests…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-gray-500">No maintenance requests yet.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{req.title}</p>
                  <p className="text-sm text-gray-500">{req.property.title}</p>
                </div>
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
                    PRIORITY_BADGE[req.priority]
                  )}
                >
                  {req.priority}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{req.description}</p>
              <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                <span>{formatDate(req.created_at)}</span>
                <span className="font-medium text-gray-600">{req.status.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
