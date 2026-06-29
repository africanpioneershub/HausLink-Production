export const revalidate = 3600;

const FAQS = [
  {
    question: 'How do I find a property on HausLink?',
    answer:
      'Browse verified listings on the Properties page, filter by district, price, or property type, and apply directly online once you create an account.',
  },
  {
    question: 'How does the application process work?',
    answer:
      'Once you find a property you like, submit an application with your details and supporting documents. The landlord reviews it and you will be notified by email and WhatsApp once a decision is made.',
  },
  {
    question: 'What payment methods are supported?',
    answer:
      'HausLink supports MTN Mobile Money, Airtel Money, and card payments via Stripe, alongside manual bank transfer as a fallback option.',
  },
  {
    question: 'How long does landlord verification take?',
    answer:
      'Our team typically reviews identity documents and KYC submissions within 24-48 hours.',
  },
  {
    question: 'Is there a fee to list a property?',
    answer:
      'Landlords pay a one-time registration fee to activate their account. Featured listing placements are available for an additional fee.',
  },
  {
    question: 'How do I contact support?',
    answer:
      'Reach us via the Contact page, WhatsApp, or email at afriprimeholdings@gmail.com — our team responds within 24 hours.',
  },
];

export default function FaqPage() {
  return (
    <div className="bg-white">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-gray-600 text-center max-w-2xl mx-auto mb-12">
          Answers to common questions about renting, listing, and managing properties on
          HausLink.
        </p>

        <div className="max-w-3xl mx-auto space-y-4">
          {FAQS.map((faq) => (
            <details
              key={faq.question}
              className="group bg-white border border-gray-100 rounded-xl shadow-sm p-5"
            >
              <summary className="font-semibold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                {faq.question}
                <span className="text-brand-teal group-open:rotate-45 transition-transform text-xl leading-none">
                  +
                </span>
              </summary>
              <p className="text-sm text-gray-600 mt-3">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
