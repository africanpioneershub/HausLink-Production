import {
  Search,
  ShieldCheck,
  FileText,
  CreditCard,
  Wrench,
  BarChart3,
  Wallet,
  MessageSquare,
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

const FEATURES = [
  {
    title: 'Smart Search',
    description: 'Find properties by district, type, price',
    icon: Search,
  },
  {
    title: 'Verified Listings',
    description: 'All landlords KYC-verified',
    icon: ShieldCheck,
  },
  {
    title: 'Online Applications',
    description: 'Apply with documents online',
    icon: FileText,
  },
  {
    title: 'Secure Payments',
    description: 'MTN MoMo, Airtel, Stripe',
    icon: CreditCard,
  },
  {
    title: 'Maintenance Tracking',
    description: 'Submit and track requests',
    icon: Wrench,
  },
  {
    title: 'Transparent Finance',
    description: 'Landlords track income/expenses',
    icon: BarChart3,
  },
];

export default function HowItWorksPage() {
  return (
    <div className="bg-white">
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-teal mb-2">
              Features
            </p>
            <h2 className="text-3xl font-bold text-gray-900">
              Everything you need in one platform
            </h2>
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

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900">How HausLink Works</h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Everything you need to find, apply for, and manage a home in Rwanda — in one platform.
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-16">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          const reversed = index % 2 === 1;
          return (
            <div
              key={feature.title}
              className={`flex flex-col md:flex-row items-center gap-10 ${
                reversed ? 'md:flex-row-reverse' : ''
              }`}
            >
              <div className="w-full md:w-1/2 flex items-center justify-center">
                <div className="w-32 h-32 rounded-2xl bg-brand-teal/10 flex items-center justify-center">
                  <Icon className="w-14 h-14 text-brand-teal" />
                </div>
              </div>
              <div className="w-full md:w-1/2 text-center md:text-left">
                <p className="text-sm font-bold uppercase tracking-widest text-brand-teal mb-2">
                  Step {index + 1}
                </p>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h2>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
