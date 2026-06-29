export const revalidate = 3600;

import {
  Search,
  ShieldCheck,
  FileText,
  CreditCard,
  Wrench,
  BarChart3,
  Wallet,
  MessageSquare,
  UserPlus,
  Home,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';

const FEATURES_GRID = [
  {
    title: 'Smart Property Search',
    description: 'Filter listings by district, price, and type.',
    icon: Search,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    title: 'Secure Rent Payments',
    description: 'Pay via MTN MoMo, Airtel Money, or card.',
    icon: Wallet,
    color: 'text-green-600 bg-green-50',
  },
  {
    title: 'Maintenance Tracking',
    description: 'Log and track maintenance requests with photos.',
    icon: Wrench,
    color: 'text-orange-600 bg-orange-50',
  },
  {
    title: 'Direct Messaging',
    description: 'Chat directly with tenants or landlords.',
    icon: MessageSquare,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    title: 'Online Applications',
    description: 'Apply for properties and track status online.',
    icon: FileText,
    color: 'text-red-600 bg-red-50',
  },
  {
    title: 'Finance & Reports',
    description: 'Track income, expenses and monthly reports.',
    icon: BarChart3,
    color: 'text-teal-600 bg-teal-50',
  },
];

const TENANT_STEPS = [
  {
    label: 'Register',
    description: 'Create a free tenant account and complete KYC verification in minutes.',
    icon: UserPlus,
  },
  {
    label: 'Browse',
    description: 'Search verified listings by district, price, type, and number of rooms.',
    icon: Search,
  },
  {
    label: 'Apply',
    description: 'Submit your application online with documents — no paperwork, no queues.',
    icon: FileText,
  },
  {
    label: 'Move In',
    description: 'Get approved, sign digitally, and move into your new home.',
    icon: Home,
  },
];

const LANDLORD_STEPS = [
  {
    label: 'Register',
    description: 'Sign up as a landlord and complete identity verification.',
    icon: UserPlus,
  },
  {
    label: 'List',
    description: 'Add your properties with photos, pricing, and availability.',
    icon: ShieldCheck,
  },
  {
    label: 'Verify',
    description: 'HausLink reviews and verifies your listing before it goes live.',
    icon: CheckCircle,
  },
  {
    label: 'Earn',
    description: 'Collect rent online via MoMo or card and track every payment.',
    icon: TrendingUp,
  },
];

const PLATFORM_FEATURES = [
  { title: 'Smart Search',          description: 'Find properties by district, type, price',  icon: Search },
  { title: 'Verified Listings',     description: 'All landlords KYC-verified',                 icon: ShieldCheck },
  { title: 'Online Applications',   description: 'Apply with documents online',                icon: FileText },
  { title: 'Secure Payments',       description: 'MTN MoMo, Airtel, Stripe',                  icon: CreditCard },
  { title: 'Maintenance Tracking',  description: 'Submit and track requests',                  icon: Wrench },
  { title: 'Transparent Finance',   description: 'Landlords track income/expenses',            icon: BarChart3 },
];

function StepFlow({ steps }: { steps: typeof TENANT_STEPS }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <div key={step.label} className="relative flex flex-col items-center text-center">
            {/* connector line between steps */}
            {i < steps.length - 1 && (
              <div className="hidden lg:block absolute top-6 left-1/2 w-full h-0.5 bg-brand-teal/20" />
            )}
            <div className="relative z-10 w-12 h-12 rounded-full bg-brand-teal flex items-center justify-center mb-3 shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-brand-teal mb-1">
              Step {i + 1}
            </span>
            <h3 className="font-bold text-gray-900 mb-2">{step.label}</h3>
            <p className="text-sm text-gray-600">{step.description}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="bg-white">
      {/* Platform Features */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-teal mb-2">
              Features
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              Everything you need in one platform
            </h1>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
              From property search to rent collection, HausLink handles it all.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES_GRID.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white border border-gray-100 rounded-xl shadow-sm p-6"
                >
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${feature.color}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What makes HausLink special */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-teal mb-2">
              Why HausLink
            </p>
            <h2 className="text-2xl font-bold text-gray-900">What makes us different</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {PLATFORM_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                  <Icon className="w-6 h-6 text-brand-teal mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-900 mb-1">{f.title}</p>
                  <p className="text-xs text-gray-500">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works — Tenants */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-teal mb-2">
              For Tenants
            </p>
            <h2 className="text-3xl font-bold text-gray-900">Find your home in 4 steps</h2>
          </div>
          <StepFlow steps={TENANT_STEPS} />
        </div>
      </section>

      {/* How It Works — Landlords */}
      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-teal mb-2">
              For Landlords
            </p>
            <h2 className="text-3xl font-bold text-gray-900">Start earning in 4 steps</h2>
          </div>
          <StepFlow steps={LANDLORD_STEPS} />
        </div>
      </section>
    </div>
  );
}
