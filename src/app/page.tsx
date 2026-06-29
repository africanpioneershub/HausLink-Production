'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Wallet, Wrench, Star } from 'lucide-react';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { PropertyCard, type PropertyCardData } from '@/components/public/PropertyCard';

interface PublicPropertyApiItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  district: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  rent_rwf: number;
  view_count: number;
  is_verified: boolean;
  featured: boolean;
  imageUrl: string | null;
  images?: string[];
}

function toCardData(item: PublicPropertyApiItem): PropertyCardData {
  return {
    id: item.id,
    title: item.title,
    district: item.district,
    price: item.rent_rwf,
    beds: item.bedrooms,
    baths: item.bathrooms,
    type: item.type,
    rating: 0,
    views: item.view_count,
    verified: item.is_verified,
    premium: item.featured,
    featured: item.featured,
    description: item.description ?? '',
    imageUrl: item.imageUrl,
    images: item.images,
  };
}

const FILTER_TABS = [
  'PREMIUM PROPERTIES',
  'NEW LISTINGS',
  'MOST VIEWED',
  'VERIFIED LANDLORDS',
  'AFFORDABLE RENTALS',
  'STUDENT HOUSING',
];

const LANDLORD_FEATURES = [
  {
    title: 'List Properties',
    description: 'Publish verified listings and reach thousands of tenants across Rwanda.',
    icon: Building2,
  },
  {
    title: 'Collect Rent',
    description: 'Accept secure online rent payments and track every transaction.',
    icon: Wallet,
  },
  {
    title: 'Track Maintenance',
    description: 'Manage maintenance requests and keep your properties in top shape.',
    icon: Wrench,
  },
];

const TESTIMONIALS = [
  {
    name: 'Uwimana Alice',
    initials: 'UA',
    role: 'Tenant',
    location: 'Kigali',
    quote:
      'I found my apartment in Kimihurura within a week. The whole application process was fast and transparent.',
    rating: 5,
  },
  {
    name: 'Habimana Jean',
    initials: 'HJ',
    role: 'Landlord',
    location: 'Kigali',
    quote:
      'HausLink helped me list my properties and collect rent online without any hassle. Highly recommended.',
    rating: 5,
  },
  {
    name: 'Mutesi Grace',
    initials: 'MG',
    role: 'Tenant',
    location: 'Gasabo',
    quote:
      'Verified landlords gave me peace of mind. I moved into my new home in Nyarutarama faster than expected.',
    rating: 4,
  },
];

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(FILTER_TABS[0]);
  const [search, setSearch] = useState('');
  const [featuredProperties, setFeaturedProperties] = useState<PropertyCardData[]>([]);
  const [catalogProperties, setCatalogProperties] = useState<PropertyCardData[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [stats, setStats] = useState([
    { value: '0', label: 'Active Listings' },
    { value: '0', label: 'Verified Landlords' },
    { value: '0', label: 'Happy Tenants' },
    { value: '30', label: 'Districts Covered' },
  ]);

  useEffect(() => {
    fetch('/api/public/properties?featured=true&pageSize=6')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setFeaturedProperties(json.data.data.map(toCardData));
      })
      .catch(() => {});

    fetch('/api/public/properties?pageSize=6')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setCatalogProperties(json.data.data.map(toCardData));
          setCatalogTotal(json.data.total);
        }
      })
      .catch(() => {});

    fetch('/api/public/stats')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const fmt = (n: number) => n > 0 ? `${n}+` : `${n}`;
          setStats([
            { value: fmt(json.data.activeListings), label: 'Active Listings' },
            { value: fmt(json.data.verifiedLandlords), label: 'Verified Landlords' },
            { value: fmt(json.data.happyTenants), label: 'Happy Tenants' },
            { value: `${json.data.districtsCovered}`, label: 'Districts Covered' },
          ]);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* Section 1 — Hero */}
        <section className="relative overflow-hidden bg-[#1A2B4A]">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
            <h1 className="text-5xl lg:text-7xl font-extrabold text-white tracking-tight">
              Find Homes. Manage Properties. <span className="text-[#00D4A0]">All-in-HausLink.</span>
            </h1>
            <p className="mt-6 text-lg text-white/80 max-w-2xl mx-auto">
              Connect with verified landlords. Apply online. Move in faster.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register?role=TENANT"
                className="bg-brand-teal text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                I&apos;m a Tenant
              </Link>
              <Link
                href="/register?role=LANDLORD"
                className="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors"
              >
                I&apos;m a Landlord
              </Link>
            </div>
          </div>
        </section>

        {/* Section 2 — Stats Bar */}
        <section className="bg-brand-teal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-extrabold text-white">{stat.value}</p>
                <p className="text-sm text-white/80 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3 — Featured Properties */}
        <section className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900">Featured Properties</h2>
              <p className="mt-3 text-gray-600">
                Explore our most popular and highly-rated listings
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs font-semibold uppercase tracking-wide px-4 py-2 rounded-full border transition-colors ${
                    activeTab === tab
                      ? 'bg-brand-teal text-white border-brand-teal'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-teal hover:text-brand-teal'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>

        {/* Section 4 — Available Rental Properties */}
        <section className="bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <p className="text-sm font-bold uppercase tracking-wide text-green-600 mb-2">
              Verified Catalogs
            </p>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Available Rental Properties</h2>
              <p className="text-gray-500 text-sm">({catalogTotal} Listings)</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 mb-10">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    router.push(`/properties?search=${encodeURIComponent(search.trim())}`);
                  }
                }}
                placeholder="Search by property name, features, city, or Kigali district..."
                className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/properties')}
                  className="border border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wide px-4 py-3 rounded-lg hover:border-brand-teal hover:text-brand-teal transition-colors"
                >
                  Advanced Filters
                </button>
                <button
                  onClick={() => setSearch('')}
                  className="border border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wide px-4 py-3 rounded-lg hover:border-brand-teal hover:text-brand-teal transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => router.push(`/properties?search=${encodeURIComponent(search.trim())}`)}
                  className="bg-brand-teal text-white text-xs font-semibold uppercase tracking-wide px-5 py-3 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Search Properties
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {catalogProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>

        {/* Section 6 — For Landlords */}
        <section className="bg-[#1A2B40]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-white mb-2">
              For Landlords
            </p>
            <h2 className="text-3xl font-bold text-white mb-12">Grow Your Rental Business</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
              {LANDLORD_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="bg-white/5 border border-white/10 rounded-xl p-6 text-left"
                  >
                    <Icon className="w-8 h-8 text-brand-teal mb-4" />
                    <h3 className="font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-white/70">{feature.description}</p>
                  </div>
                );
              })}
            </div>
            <Link
              href="/register"
              className="inline-block bg-brand-teal text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Start Listing Today
            </Link>
          </div>
        </section>

        {/* Section 7 — Testimonials */}
        <section id="testimonials" className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-teal text-center mb-2">
              Testimonials
            </p>
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              What Our Users Say
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {TESTIMONIALS.map((testimonial) => (
                <div
                  key={testimonial.name}
                  className="bg-white border border-gray-100 rounded-xl shadow-md p-6"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < testimonial.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-teal text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {testimonial.initials}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-brand-teal font-semibold">
                        {testimonial.role} · {testimonial.location}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
