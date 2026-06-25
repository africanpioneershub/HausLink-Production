import Image from 'next/image';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

const TEAM = [
  {
    name: 'Joshua HERI',
    initials: 'JH',
    title: 'CEO & Founder',
    company: 'AfriPrime Holdings Group Ltd',
    photo: '/team/joshua.jpg',
    bio: 'CEO & Founder of AfriPrime Holdings Group Ltd. Visionary entrepreneur and educator driving technology innovation across East Africa.',
  },
  {
    name: 'Jocelyne IRAGUHA',
    initials: 'JI',
    title: 'Head of Product & Operations',
    photo: '/team/jocelyne.jpg',
    bio: "Leading HausLink's product strategy and ensuring exceptional user experiences for landlords and tenants.",
  },
  {
    name: 'Josue HABIYAREMYE',
    initials: 'JH',
    title: 'Lead Developer',
    photo: '/team/josue.jpg',
    bio: "Architecting HausLink's full-stack infrastructure with expertise in modern web technologies and African payment systems.",
  },
  {
    name: 'Fabrice ISHIMWE',
    initials: 'FI',
    title: 'Project & Marketing Manager',
    photo: '/team/fabrice.jpg',
    bio: "Driving HausLink's growth strategy and brand presence across the Rwandan market.",
  },
  {
    name: 'Marius Kevin IKUZWE',
    initials: 'MK',
    title: 'Finance Manager',
    photo: '/team/marius.jpg',
    bio: "Overseeing AfriPrime's financial operations and ensuring sustainable growth across all subsidiaries.",
  },
];


function teamPhotoExists(filename: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), 'public', filename));
  } catch {
    return false;
  }
}

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <p className="text-sm font-semibold text-brand-teal uppercase tracking-widest mb-4">
          AfriPrime Holdings Group Ltd
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6">
          Building Rwanda&apos;s Property Future
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
          HausLink is Rwanda&apos;s first all-in-one property management platform, connecting
          landlords and tenants across all 30 districts. Built by Africans, for Africa.
        </p>
      </section>

      {/* Mission & Vision */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Our Mission &amp; Vision
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mission */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-teal-100">
              <div className="w-12 h-12 rounded-full bg-brand-teal/10 flex items-center justify-center mb-5">
                <svg
                  className="w-6 h-6 text-brand-teal"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                  <line x1="12" y1="2" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="22" y2="12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Mission</h3>
              <p className="text-gray-600 leading-relaxed">
                To simplify property management across Rwanda and East Africa by providing a trusted,
                transparent, and technology-driven platform that empowers both landlords and tenants.
              </p>
            </div>
            {/* Vision */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-blue-100">
              <div className="w-12 h-12 rounded-full bg-[#0f2d5e]/10 flex items-center justify-center mb-5">
                <svg
                  className="w-6 h-6 text-[#0f2d5e]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Vision</h3>
              <p className="text-gray-600 leading-relaxed">
                To become the leading PropTech platform across pan-Africa, making quality housing
                accessible and management effortless for everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Meet Our Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {TEAM.map((member) => {
              const hasPhoto = teamPhotoExists(member.photo);
              return (
                <div
                  key={member.name}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-md transition-shadow duration-200"
                >
                  {hasPhoto ? (
                    <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden relative">
                      <Image
                        src={member.photo}
                        alt={member.name}
                        fill
                        className="object-cover object-top"
                        sizes="80px"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                      {member.initials}
                    </div>
                  )}
                  <p className="font-bold text-gray-900">{member.name}</p>
                  <p className="text-sm text-brand-teal font-medium mt-1">{member.title}</p>
                  {member.company && (
                    <p className="text-xs text-gray-500 mt-0.5">{member.company}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-2">{member.bio}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to transform your property experience?
          </h2>
          <p className="text-gray-600 mb-8">
            Join hundreds of landlords and tenants already using HausLink across Rwanda.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-brand-teal text-white px-8 py-3 rounded-lg font-semibold hover:bg-brand-teal/90 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/contact"
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
