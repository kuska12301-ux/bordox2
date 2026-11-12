import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export class LavePay {
  constructor({ baseUrl = 'https://laveshka.io/merchant/v1', apiKey }) {
    if (!apiKey) throw new Error('Lave Pay is not configured');
    this.baseUrl = String(baseUrl).replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  static idempotencyKey(prefix = 'bor') {
    return `${prefix}-${randomUUID()}`.slice(0, 64);
  }

  async request(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'X-Api-Key': this.apiKey,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(12_000)
    });
    const envelope = await response.json().catch(() => ({}));
    if (!response.ok || envelope.ok === false) {
      const error = new Error(envelope?.error?.message || `Lave Pay returned ${response.status}`);
      error.status = response.status;
      error.code = envelope?.error?.code;
      error.details = envelope?.error?.details;
      throw error;
    }
    return envelope?.data ?? envelope;
  }

  createInvoice(input) {
    return this.request('/invoices', { method: 'POST', body: input });
  }

  getInvoice(id) {
    return this.request(`/invoices/${encodeURIComponent(id)}`);
  }

  createTransfer(input) {
    return this.request('/transfers', { method: 'POST', body: input });
  }

  getMerchant() {
    return this.request('/me');
  }
}

export function verifyLaveWebhook({ secret, timestamp, signature, rawBody, maxAgeSeconds = 300 }) {
  if (!secret || !timestamp || !signature || !rawBody) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > maxAgeSeconds) return false;
  const received = String(signature).replace(/^v1=/, '').trim();
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(received, 'hex');
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
