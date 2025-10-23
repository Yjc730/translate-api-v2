// api/translate.js - clean version for Vercel Build Output API
export default async function handler(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'no text' });

    const system = '你是一個嚴格的翻譯器。將輸入完整翻成繁體中文。只做直譯，不補充、不延伸、不省略、不加入任何註解或前後綴。專有名詞如 RF、GPS、VSWR、PLL 保留原文。只輸出翻譯結果。';

    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'missing LLM_API_KEY' });

    const model = process.env.LLM_MODEL || 'gpt-4o-mini';
    const endpoint = process.env.LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions';

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text }
        ]
      })
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(500).json({ error: 'llm call failed', detail: detail.slice(0, 300) });
    }

    const data = await r.json();
    const zh = (data?.choices?.[0]?.message?.content || '').trim();
    return res.status(200).json({ zh });
  } catch (e) {
    return res.status(500).json({ error: 'server error', detail: e.message });
  }
}
