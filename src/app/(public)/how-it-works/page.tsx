import { Search, ShieldCheck, FileText, CreditCard, Wrench, BarChart3 } from 'lucide-react';

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
