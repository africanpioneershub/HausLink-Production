'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');

    try {
      const payload = {
        ...form,
        phone: form.phone.trim() === '' ? undefined : form.phone,
      };
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to submit');

      setStatus('success');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-12">Contact Us</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="contact-name" className="block text-sm font-semibold text-gray-700 mb-1">
                Name
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                placeholder="Your full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>

            <div>
              <label htmlFor="contact-email" className="block text-sm font-semibold text-gray-700 mb-1">
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>

            <div>
              <label htmlFor="contact-phone" className="block text-sm font-semibold text-gray-700 mb-1">
                Phone <span className="text-gray-400 font-normal">(optional, for WhatsApp confirmation)</span>
              </label>
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                placeholder="+250788xxxxxx"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>

            <div>
              <label htmlFor="contact-subject" className="block text-sm font-semibold text-gray-700 mb-1">
                Subject
              </label>
              <input
                id="contact-subject"
                name="subject"
                type="text"
                required
                placeholder="What is this about?"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="block text-sm font-semibold text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={5}
                placeholder="Write your message here..."
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="bg-brand-teal text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {status === 'submitting' ? 'Sending...' : 'Send Message'}
            </button>

            {status === 'success' && (
              <p className="text-sm font-semibold text-green-600">
                Thanks for reaching out! We&apos;ll get back to you shortly.
              </p>
            )}
            {status === 'error' && (
              <p className="text-sm font-semibold text-red-600">
                Something went wrong. Please try again.
              </p>
            )}
          </form>

          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-brand-teal mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Email</p>
                <p className="text-gray-600">afriprimeholdings@gmail.com</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-brand-teal mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Phone / WhatsApp</p>
                <p className="text-gray-600">+250788937487</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-brand-teal mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Location</p>
                <p className="text-gray-600">Kigali, Rwanda</p>
              </div>
            </div>

            <a
              href="https://wa.me/250788937487"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-5 h-5" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
