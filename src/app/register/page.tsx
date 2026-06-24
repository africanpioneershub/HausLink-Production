'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Check, Home, Building2, Upload, FileText, X, Mail } from 'lucide-react';
import { CountrySelect } from '@/components/auth/CountrySelect';
import { DEFAULT_COUNTRY, type Country } from '@/lib/countries';
import { RWANDA_DISTRICTS } from '@/lib/rwanda-districts';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import type { UserRole } from '@/types';

type Role = Extract<UserRole, 'TENANT' | 'LANDLORD'>;
type DocumentType = 'NATIONAL_ID' | 'PASSPORT';

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role | null;
  phoneCountry: Country;
  phone: string;
  whatsappSame: boolean;
  whatsappCountry: Country;
  whatsapp: string;
  district: string;
  city: string;
  documentType: DocumentType;
  file: File | null;
  propertyNote: string;
}

const INITIAL_STATE: FormState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: null,
  phoneCountry: DEFAULT_COUNTRY,
  phone: '',
  whatsappSame: true,
  whatsappCountry: DEFAULT_COUNTRY,
  whatsapp: '',
  district: '',
  city: '',
  documentType: 'NATIONAL_ID',
  file: null,
  propertyNote: '',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'TENANT' || roleParam === 'LANDLORD') {
      update('role', roleParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep1(): string | null {
    if (!form.name.trim()) return 'Full name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Enter a valid email address';
    if (form.password.length < 8) return 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    if (!form.role) return 'Please select an account type';
    return null;
  }

  function validateStep2(): string | null {
    if (!/^\d+$/.test(form.phone)) return 'Phone number must contain digits only';
    if (!form.whatsappSame && !/^\d+$/.test(form.whatsapp)) {
      return 'WhatsApp number must contain digits only';
    }
    if (!form.district.trim()) return 'District is required';
    return null;
  }

  function validateStep3(): string | null {
    if (!form.file) return 'Please upload your ID or passport';
    return null;
  }

  function goNext() {
    const err = step === 1 ? validateStep1() : validateStep2();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep((s) => (s === 1 ? 2 : 3) as 1 | 2 | 3);
  }

  function goBack() {
    setError('');
    setStep((s) => (s === 3 ? 2 : 1) as 1 | 2 | 3);
  }

  function handleFileChange(file: File | null) {
    if (!file) {
      update('file', null);
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError('File must be a JPG, PNG, or PDF');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File must be 5MB or smaller');
      return;
    }
    setError('');
    update('file', file);
  }

  async function handleSubmit() {
    const err = validateStep3();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const whatsappCountry = form.whatsappSame ? form.phoneCountry : form.whatsappCountry;
      const whatsapp = form.whatsappSame ? form.phone : form.whatsapp;

      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          phone: form.phone,
          whatsapp,
          district: form.district,
          city: form.city,
          countryCode: form.phoneCountry.dial,
          whatsappCountryCode: whatsappCountry.dial,
        }),
      });
      const registerData = await registerRes.json();
      if (!registerRes.ok || !registerData.success) {
        setError(registerData.error ?? 'Failed to create account');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResent(false);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.resend({ type: 'signup', email: form.email });
    setResending(false);
    setResent(true);
  }

  if (success) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-brand-teal/10 flex items-center justify-center mb-4">
            <Mail className="w-7 h-7 text-brand-teal" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Check Your Email!</h1>
          <p className="text-gray-600 mb-6">
            We sent a verification link to{' '}
            <span className="font-medium text-gray-900">{form.email}</span>. Click the link to
            verify your account, then our team will review your documents{' '}
            {form.role === 'LANDLORD' ? 'and activate your account ' : ''}within 24-48 hours.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Go to Login
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="w-full mt-3 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            {resending ? 'Resending…' : 'Resend verification email'}
          </button>
          {resent && (
            <p className="mt-3 text-sm text-green-600">Email resent! Check your inbox.</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center mb-8">
        <Image src="/logo.png" alt="HausLink" width={180} height={52} className="object-contain mx-auto" />
      </div>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <StepDots step={step} />

        {step === 1 && <StepOne form={form} update={update} />}
        {step === 2 && <StepTwo form={form} update={update} />}
        {step === 3 && (
          <StepThree form={form} update={update} onFileChange={handleFileChange} />
        )}

        {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}

        <div className="mt-6 flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>
          )}
        </div>

        {step === 1 && (
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-teal font-medium hover:underline">
              Sign In
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  const labels = ['Step 1', 'Step 2', 'Step 3'];
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {labels.map((label, i) => {
        const n = i + 1;
        const isActive = n === step;
        const isDone = n < step;
        return (
          <div key={label} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  isDone
                    ? 'bg-brand-teal text-white'
                    : isActive
                      ? 'bg-brand-teal text-white'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : n}
              </div>
              <span className={`text-xs ${isActive ? 'text-brand-teal font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {n < 3 && <div className={`w-10 h-0.5 ${n < step ? 'bg-brand-teal' : 'bg-gray-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

function StepOne({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Personal Information</h1>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
          Full Name
        </label>
        <input
          id="name"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
          placeholder="Jane Doe"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
            placeholder="Min. 8 characters"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
          Confirm Password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            value={form.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
            placeholder="Re-enter your password"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">I am a…</label>
        <div className="grid grid-cols-2 gap-3">
          <RoleCard
            icon={Home}
            label="TENANT"
            description="Looking for a home"
            selected={form.role === 'TENANT'}
            onClick={() => update('role', 'TENANT')}
          />
          <RoleCard
            icon={Building2}
            label="LANDLORD"
            description="I have properties to rent"
            selected={form.role === 'LANDLORD'}
            onClick={() => update('role', 'LANDLORD')}
          />
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  icon: Icon,
  label,
  description,
  selected,
  onClick,
}: {
  icon: typeof Home;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-colors ${
        selected ? 'border-brand-teal bg-brand-teal/5' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <Icon className={`w-6 h-6 ${selected ? 'text-brand-teal' : 'text-gray-400'}`} />
      <span className={`text-sm font-semibold ${selected ? 'text-brand-teal' : 'text-gray-700'}`}>
        {label}
      </span>
      <span className="text-xs text-gray-500">{description}</span>
    </button>
  );
}

function StepTwo({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Contact Details</h1>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
        <div className="flex">
          <CountrySelect value={form.phoneCountry} onChange={(c) => update('phoneCountry', c)} />
          <input
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value.replace(/\D/g, ''))}
            className="flex-1 px-4 py-2.5 border border-l-0 border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
            placeholder="788123456"
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
          <input
            type="checkbox"
            checked={form.whatsappSame}
            onChange={(e) => update('whatsappSame', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
          />
          ✓ My WhatsApp number is the same as my phone number
        </label>

        <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Number</label>
        <div className="flex">
          <CountrySelect
            value={form.whatsappSame ? form.phoneCountry : form.whatsappCountry}
            onChange={(c) => update('whatsappCountry', c)}
            disabled={form.whatsappSame}
          />
          <input
            inputMode="numeric"
            disabled={form.whatsappSame}
            value={form.whatsappSame ? form.phone : form.whatsapp}
            onChange={(e) => update('whatsapp', e.target.value.replace(/\D/g, ''))}
            className="flex-1 px-4 py-2.5 border border-l-0 border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="788123456"
          />
        </div>
      </div>

      <div>
        <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1.5">
          District
        </label>
        <select
          id="district"
          value={form.district}
          onChange={(e) => update('district', e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-teal bg-white"
        >
          <option value="">Select your district</option>
          {RWANDA_DISTRICTS.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">
          City / Sector
        </label>
        <input
          id="city"
          type="text"
          value={form.city}
          onChange={(e) => update('city', e.target.value)}
          placeholder="e.g. Kimihurura, Remera, Nyarutarama"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">
          Enter your neighborhood or sector (optional)
        </p>
      </div>
    </div>
  );
}

function StepThree({
  form,
  update,
  onFileChange,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = form.file && form.file.type.startsWith('image/');
  const previewUrl = isImage && form.file ? URL.createObjectURL(form.file) : null;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Verification Documents</h1>

      <p className="text-sm text-gray-600 bg-brand-teal/5 border border-brand-teal/20 rounded-lg p-3">
        {form.role === 'LANDLORD'
          ? 'As a landlord, you must upload a valid ID for verification. Your account will be activated after admin review.'
          : 'Your account will be reviewed by our team before you can access the platform.'}
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
        <div className="flex gap-3">
          {(['NATIONAL_ID', 'PASSPORT'] as DocumentType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => update('documentType', type)}
              className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                form.documentType === type
                  ? 'border-brand-teal bg-brand-teal/5 text-brand-teal'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {type === 'NATIONAL_ID' ? 'National ID' : 'Passport'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload {form.documentType === 'NATIONAL_ID' ? 'National ID' : 'Passport'}
        </label>

        {!form.file ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-brand-teal transition-colors"
          >
            <Upload className="w-6 h-6 text-gray-400" />
            <span className="text-sm text-gray-600">Click to upload JPG, PNG, or PDF (max 5MB)</span>
          </button>
        ) : (
          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
            {previewUrl ? (
              <img src={previewUrl} alt="Document preview" className="w-14 h-14 object-cover rounded-md" />
            ) : (
              <FileText className="w-10 h-10 text-brand-teal" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{form.file.name}</p>
              <p className="text-xs text-gray-500">{(form.file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              type="button"
              onClick={() => onFileChange(null)}
              className="text-gray-400 hover:text-red-600"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      </div>

      {form.role === 'LANDLORD' && (
        <div>
          <label htmlFor="propertyNote" className="block text-sm font-medium text-gray-700 mb-1.5">
            Property Ownership Note <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            id="propertyNote"
            value={form.propertyNote}
            onChange={(e) => update('propertyNote', e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
            placeholder="Tell us about the properties you own or manage"
          />
        </div>
      )}
    </div>
  );
}
