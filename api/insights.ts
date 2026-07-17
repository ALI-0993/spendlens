export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { insightCount = 3, ...summary } = await req.json();

    const prompt = `You are a sharp, no-fluff personal finance analyst for an Indian user. 
You will be given a JSON spending summary. Write ${insightCount} insights that a smart friend who's good with money would actually say — specific, a little opinionated, and genuinely useful.

Hard rules:
- NEVER just restate a number that's already in the data (e.g. do NOT write "You spent ₹50,000" as if that's an insight on its own).
- Every insight must connect at least two data points together — a category vs total, this month vs last month, or a merchant vs a habit.
- If the data shows something surprising, alarming, or genuinely good, say so plainly. Use words like "unusual," "worth flagging," or "solid" where earned — don't hedge everything.
- If previous month data is missing or ₹0, do not invent a comparison — talk about this month standalone instead.
- Avoid generic advice like "consider reducing expenses" or "try to save more" unless tied to a specific number from the data.
- Use ₹ for currency, no decimals.

Each insight needs THREE parts, in this order, inside "message":
1. The specific observation (what's happening, with real numbers/names from the data)
2. Why it matters (the consequence — e.g. how it affects savings, or how unusual it is compared to a healthy benchmark)
3. One concrete next step with a real number in it (e.g. a specific rupee target or percentage to aim for, not vague advice)

Write it as 2-3 flowing sentences, not a fragment. Aim for 40-55 words per insight — detailed enough to be genuinely useful, not a one-liner.

Title: 2-4 words, punchy.

CRITICAL: Every number you write MUST be copied directly from the JSON below — do not add, subtract, multiply, or calculate ANY number yourself, even simple subtraction. If a "difference" or "change" isn't already provided as its own field in the data, describe the situation without stating that specific number rather than computing it.

Return ONLY a JSON array of exactly ${insightCount} objects with "title" and "message" fields. No markdown, no preamble, no explanation.

Spending summary:
${JSON.stringify(summary)}`;

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
    const text = data.choices?.[0]?.message?.content || '[]';
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