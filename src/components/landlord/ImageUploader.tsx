'use client';

import { useEffect, useRef, useState } from 'react';
import { Star, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCsrf } from '@/hooks/useCsrf';

interface PropertyImage {
  id: string;
  cdn_url: string | null;
  storage_path: string;
  is_primary: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 10;

export function ImageUploader({ propertyId }: { propertyId: string }) {
  const csrf = useCsrf();
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function loadImages() {
    fetch(`/api/landlord/properties/${propertyId}/images`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setImages(json.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  async function uploadFile(file: File) {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, or WebP images are allowed');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Each image must be 5MB or smaller');
      return;
    }
    if (images.length >= MAX_IMAGES) {
      setError(`Maximum of ${MAX_IMAGES} images allowed`);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/landlord/properties/${propertyId}/images`);
        xhr.setRequestHeader('x-csrf-token', csrf);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            const json = JSON.parse(xhr.responseText || '{}');
            reject(new Error(json.error ?? 'Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });

      loadImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  }

  async function handleDelete(imageId: string) {
    await fetch(`/api/landlord/properties/${propertyId}/images/${imageId}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': csrf },
    });
    loadImages();
  }

  async function handleSetPrimary(imageId: string) {
    await fetch(`/api/landlord/properties/${propertyId}/images/${imageId}`, {
      method: 'PATCH',
      headers: { 'x-csrf-token': csrf },
    });
    loadImages();
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          dragActive ? 'border-brand-teal bg-brand-teal/5' : 'border-gray-200 hover:border-brand-teal'
        )}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">
          Drag and drop an image here, or click to browse
        </p>
        <p className="text-xs text-gray-400 mt-1">
          JPEG, PNG, or WebP — max 5MB — up to {MAX_IMAGES} images
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {uploading && (
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-brand-teal h-2 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading images…</p>
      ) : images.length === 0 ? (
        <p className="text-sm text-gray-500">No images uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((image) => (
            <div key={image.id} className="relative rounded-lg overflow-hidden border border-gray-100 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.cdn_url ?? image.storage_path}
                alt=""
                className="w-full h-28 object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-between p-1.5 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => handleSetPrimary(image.id)}
                  className="bg-white/90 rounded p-1.5 hover:bg-white"
                  title="Set as primary"
                >
                  <Star
                    className={cn(
                      'w-3.5 h-3.5',
                      image.is_primary ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
                    )}
                  />
                </button>
                <button
                  onClick={() => handleDelete(image.id)}
                  className="bg-white/90 rounded p-1.5 hover:bg-white"
                  title="Delete image"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </button>
              </div>
              {image.is_primary && (
                <span className="absolute top-1.5 left-1.5 bg-brand-teal text-white text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
