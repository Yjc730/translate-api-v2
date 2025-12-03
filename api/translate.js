// api/translate.js — clean version (strip <think>) for Vercel
export default async function handler(req, res) {
  // --- CORS ---
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'no text' });
    }

    // 嚴格直譯，不要加註解；有些模型仍會回 <think>，所以後面會清理。
    const system =
  '你是一個嚴格的翻譯器。將使用者輸入完整翻成繁體中文。' +
  '只做直譯，不補充、不延伸、不省略、不加入任何註解或前後綴。' +
  '專有名詞如 RF、GPS、VSWR、PLL、SMOD、BBMOD、BTS、FDD、TDD、SBTS 必須完整保留原文，不得拆解或翻譯。' +
  '最終只輸出翻譯結果。';


    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'missing LLM_API_KEY' });

    const model    = process.env.LLM_MODEL    || 'gpt-4o-mini';
    const endpoint = process.env.LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions';

    // --- headers（含 OpenRouter 可選參數）---
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
    // 如果你用 openrouter.ai，這兩個可提升成功率（環境變數可不設）
    if (process.env.OPENROUTER_SITE)  headers['HTTP-Referer'] = process.env.OPENROUTER_SITE;
    if (process.env.OPENROUTER_TITLE) headers['X-Title']      = process.env.OPENROUTER_TITLE;

    const r = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: text }
        ],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(500).json({ error: 'llm call failed', detail: detail.slice(0, 500) });
    }

    const data = await r.json();
    let zh = (data?.choices?.[0]?.message?.content || '').trim();

    // --- 清理模型的思考區塊與雜訊 ---
    // 1) 移除 <think>...</think>
    zh = zh.replace(/<think>[\s\S]*?<\/think>/gi, '');
    // 2) 移除可能殘留的 <xml> 或其他標籤（保守做法）
    zh = zh.replace(/<\/?[\w-]+[^>]*>/g, '');
    // 3) 移除三引號 code fence
    zh = zh.replace(/```[\s\S]*?```/g, '');
    zh = zh.trim();

    return res.status(200).json({ zh });
  } catch (e) {
    return res.status(500).json({ error: 'server error', detail: e.message });
  }
}
