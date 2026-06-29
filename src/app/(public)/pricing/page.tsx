export const revalidate = 3600;

import { Check } from 'lucide-react';

const TENANT_FEATURES = [
  'Apply online',
  'Track applications',
  'Pay rent',
  'Maintenance requests',
  'Messages',
];

const LANDLORD_FEATURES = [
  'List properties',
  'Screen tenants',
  'Collect rent via MoMo/Airtel/Stripe',
  'Finance reports',
  'KYC verification',
];

export default function PricingPage() {
  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-12">
          Simple, Transparent Pricing
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tenant Card */}
          <div className="border-2 border-brand-teal rounded-xl p-8 bg-white">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-teal mb-2">
              Tenant
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">For Tenants</h2>

            <div className="mb-6 pb-6 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-500 mb-1">Free tier</p>
              <p className="text-gray-900 font-bold">Browse &amp; Save</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">
                RWF 0<span className="text-base font-medium text-gray-500">/month</span>
              </p>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-500 mb-1">Professional</p>
              <p className="text-gray-900 font-bold">Full Platform Access</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">
                RWF 5,000<span className="text-base font-medium text-gray-500">/month</span>
              </p>
            </div>

            <ul className="space-y-3">
              {TENANT_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-brand-teal flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Landlord Card */}
          <div className="border-2 border-[#1A2B40] rounded-xl p-8 bg-white">
            <p className="text-xs font-bold uppercase tracking-widest text-[#1A2B40] mb-2">
              Landlord
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">For Landlords</h2>

            <div className="mb-4 pb-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-500 mb-1">Registration Fee</p>
              <p className="text-2xl font-extrabold text-gray-900">
                RWF 10,000<span className="text-base font-medium text-gray-500"> one time</span>
              </p>
            </div>

            <div className="mb-4 pb-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-500 mb-1">Transaction Fee</p>
              <p className="text-2xl font-extrabold text-gray-900">2% per rent payment</p>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-500 mb-1">Featured Listing</p>
              <p className="text-2xl font-extrabold text-gray-900">RWF 25,000/month</p>
              <p className="text-sm text-gray-500">or RWF 10,000/week</p>
            </div>

            <ul className="space-y-3">
              {LANDLORD_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-[#1A2B40] flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-10">
          Pricing powered by live platform config
        </p>
      </div>
    </div>
  );
}
