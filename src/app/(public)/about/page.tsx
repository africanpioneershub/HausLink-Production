const TEAM = [
  { name: 'Joshua HERI', title: 'CEO & Founder', company: 'AfriPrime Holdings Group Ltd' },
  { name: 'Jocelyne IRAGUHA', title: 'Head of Product & Operations Manager' },
  { name: 'Josue HABIYAREMYE', title: 'Lead Developer' },
  { name: 'Fabrice ISHIMWE', title: 'Project & Marketing Manager' },
  { name: 'Marius Kevin IKUZWE', title: 'Finance Manager' },
];

const PARTNERS = ['MTN Mobile Money', 'Airtel Money', 'Stripe'];

export default function AboutPage() {
  return (
    <div className="bg-white">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6">
          Building Rwanda&apos;s Property Future
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          HausLink is a product of AfriPrime Holdings Group Ltd, built to transform how Rwandans
          find homes and manage properties through technology.
        </p>
      </section>

      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Our Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {TEAM.map((member) => (
              <div
                key={member.name}
                className="bg-white border border-gray-100 rounded-xl shadow-md p-6 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {member.name.charAt(0)}
                </div>
                <p className="font-bold text-gray-900">{member.name}</p>
                <div className="border-t border-gray-100 my-2 w-10 mx-auto" />
                <p className="text-sm text-gray-600">{member.title}</p>
                {member.company && (
                  <p className="text-xs text-gray-500 mt-1">{member.company}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-10">Our Partners</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {PARTNERS.map((partner) => (
              <span
                key={partner}
                className="border border-gray-200 rounded-full px-6 py-3 text-sm font-semibold text-gray-700"
              >
                {partner}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
