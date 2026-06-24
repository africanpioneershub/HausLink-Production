export default function PrivacyPage() {
  return (
    <div className="bg-white">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6">Privacy Policy</h1>
        <div className="prose prose-sm text-gray-600 space-y-4">
          <p>
            AfriPrime Holdings Group Ltd, operator of HausLink, collects personal information you
            provide when registering, including your name, email, phone number, and identity
            verification documents.
          </p>
          <p>
            We use this information to verify your identity, process rent payments, facilitate
            communication between tenants and landlords, and send account notifications via email
            and WhatsApp.
          </p>
          <p>
            Identity documents submitted for KYC verification are stored securely and accessible
            only to authorized HausLink administrators for review purposes.
          </p>
          <p>
            We do not sell your personal information to third parties. Payment information is
            processed through MTN Mobile Money, Airtel Money, and Stripe in accordance with their
            respective privacy practices.
          </p>
          <p>
            For questions about how your data is handled, contact us at
            afriprimeholdings@gmail.com.
          </p>
        </div>
      </section>
    </div>
  );
}
