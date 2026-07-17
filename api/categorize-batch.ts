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
    const { items } = await req.json(); // [{ id, merchant, type }, ...]

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const numberedList = items
      .map(
        (item: { id: number; merchant: string; type: string }) =>
          `id ${item.id}: "${item.merchant}" (${item.type === 'credit' ? 'incoming money' : 'outgoing payment'})`
      )
      .join('\n');

    const prompt = `Classify each of these Indian bank/UPI transactions into EXACTLY ONE category from this list:
${ALLOWED_CATEGORIES.join(', ')}

Rules:
- If a merchant/description looks like an ordinary PERSON'S NAME (e.g. "Mohammad Ali", "Parmand Pancholi", "Suryansh Madhukar") rather than a recognizable business, brand, shop, or service, classify it as "Transfers" — this is almost always a person-to-person UPI payment. This applies REGARDLESS of whether it's incoming or outgoing money.
- "Income" must ONLY be used for an "incoming money" transaction that is clearly salary, business proceeds, or a company/employer paying the person. NEVER use "Income" for an "outgoing payment" transaction, and NEVER use "Income" for a person's name (that's "Transfers" instead, even if money is coming in).
- Only use "Others" when it's clearly some kind of business or entity whose specific purpose just isn't listed elsewhere.

Transactions:
${numberedList}

Return ONLY a JSON array. Each object MUST include the SAME "id" number given above, so answers can be matched correctly even if your processing order differs — this is critical, do not skip or renumber ids:
[{"id": 3, "category": "Food & Dining"}, {"id": 7, "category": "Transfers"}]
No markdown, no explanation, no extra text — exactly ${items.length} objects, each with the original id.`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      return new Response(JSON.stringify({ error: 'Groq API error', details: errText }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await groqResponse.json();
    const text = data.choices?.[0]?.message?.content || '[]';
    const cleanText = text.replace(/```json|```/g, '').trim();
    const parsedCategories: { id: number; category: string }[] = JSON.parse(cleanText);

    // Match by id, NOT by array position — this is what makes the result
    // immune to the model skipping, reordering, or merging entries in a
    // long list, which is a known failure mode for large batched prompts.
    const byId = new Map(parsedCategories.map((p) => [p.id, p.category]));

    const results = items.map((item: { id: number; merchant: string; type: string }) => {
      const category = byId.get(item.id);
      return {
        merchant: item.merchant,
        type: item.type,
        category: category && ALLOWED_CATEGORIES.includes(category) ? category : null,
      };
    });

    return new Response(JSON.stringify({ results }), {
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