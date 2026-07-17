export const config = { runtime: 'edge' };

const ALLOWED_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transport',
  'Bills & Utilities',
  'Entertainment',
  'Others',
  'Income',
  'Transfers',
];

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { merchant, type } = await req.json();

    const prompt = `Classify this Indian bank/UPI transaction into EXACTLY ONE of these categories, nothing else:
${ALLOWED_CATEGORIES.join(', ')}

Merchant/description: "${merchant}"
Transaction type: ${type === 'credit' ? 'incoming money (credit)' : 'outgoing payment (debit)'}

Important rule: if the merchant/description looks like an ordinary PERSON'S NAME (e.g. "Mohammad Ali", "Murtaza", "Parmand Pancholi") rather than a recognizable business, brand, shop, or service, classify it as "Transfers" — this is almost always a person-to-person UPI payment, not a purchase from a business. Only use "Others" when it's clearly some kind of business, shop, or entity whose specific purpose just isn't listed elsewhere.

Return ONLY a JSON object like {"category": "Food & Dining"}. The category value must be copied EXACTLY from the list above, character for character. No markdown, no explanation.`;

    const groqResponse = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
        }),
      }
    );

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      return new Response(JSON.stringify({ error: 'Groq API error', details: errText }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await groqResponse.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    const cleanText = text.replace(/```json|```/g, '').trim();

    return new Response(cleanText, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', details: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}