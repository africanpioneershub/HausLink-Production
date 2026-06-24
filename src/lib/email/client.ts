import { Resend } from 'resend';

// Lazily constructed so importing this module (e.g. during Next.js build-time
// page data collection) never requires the API key to be present.
let client: Resend | undefined;

function getClient(): Resend {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder');
  }
  return client;
}

export const resend = new Proxy({} as Resend, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
