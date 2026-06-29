export const revalidate = 3600;

import Link from 'next/link';
import { Star } from 'lucide-react';

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

export default function TestimonialsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#1A2B4A] py-20 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-teal mb-3">
            Testimonials
          </p>
          <h1 className="text-4xl font-extrabold text-white">
            What Our Users Say
          </h1>
          <p className="mt-4 text-lg text-white/70">
            Real stories from tenants and landlords across Rwanda.
          </p>
        </div>
      </section>

      {/* Testimonial cards */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

      {/* CTA */}
      <section className="bg-brand-teal py-16 text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to join them?
          </h2>
          <p className="text-white/80 mb-8">
            Find your next home or list your property on HausLink today.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-brand-teal font-semibold px-8 py-3 rounded-lg hover:bg-white/90 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </>
  );
}
