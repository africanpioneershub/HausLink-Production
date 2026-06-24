const WHATSAPP_BASE_URL = 'https://graph.facebook.com/v19.0';

export interface SendWhatsAppMessageParams {
  to: string;
  templateName?: string;
  variables?: string[];
  text?: string;
}

export async function sendWhatsAppMessage({
  to,
  templateName,
  variables,
  text,
}: SendWhatsAppMessageParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    console.error('[WhatsApp] Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_ID env vars');
    return { success: false, error: 'WhatsApp client not configured' };
  }

  const payload = templateName
    ? {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: variables
            ? [
                {
                  type: 'body',
                  parameters: variables.map((v) => ({ type: 'text', text: v })),
                },
              ]
            : undefined,
        },
      }
    : {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text ?? '' },
      };

  try {
    const res = await fetch(`${WHATSAPP_BASE_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error('[WhatsApp] Send failed', json);
      return { success: false, error: json?.error?.message ?? 'Failed to send message' };
    }

    return { success: true, messageId: json?.messages?.[0]?.id };
  } catch (error) {
    console.error('[WhatsApp] Send error', error);
    return { success: false, error: 'Network error sending WhatsApp message' };
  }
}
