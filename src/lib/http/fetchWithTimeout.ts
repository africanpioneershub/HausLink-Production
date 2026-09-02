// No timeout existed anywhere in the MoMo/Airtel clients -- a slow or
// hanging provider response blocked the request for however long fetch()
// felt like waiting, bounded only by the Vercel function's own 30s
// maxDuration (vercel.json), well past what a payment-initiation request
// should keep a tenant waiting on. A timed-out fetch rejects with the
// same AbortError shape every existing call site's catch block already
// handles generically ("Network error contacting X"), so no call site
// needs special-case handling for it.
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
