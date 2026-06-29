'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCsrf, csrfHeaders } from '@/hooks/useCsrf';

interface SaveToggleProps {
  propertyId: string;
  initialSaved: boolean;
}

export function SaveToggle({ propertyId, initialSaved }: SaveToggleProps) {
  const csrf = useCsrf();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function toggleSave() {
    setLoading(true);
    try {
      if (saved) {
        await fetch(`/api/tenant/saved?property_id=${propertyId}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': csrf },
        });
      } else {
        await fetch('/api/tenant/saved', {
          method: 'POST',
          headers: csrfHeaders(csrf),
          body: JSON.stringify({ property_id: propertyId }),
        });
      }
      setSaved((v) => !v);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggleSave}
      disabled={loading}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50',
        saved
          ? 'bg-red-50 border-red-200 text-red-600'
          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
      )}
    >
      <Heart className={cn('w-4 h-4', saved && 'fill-current')} />
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
