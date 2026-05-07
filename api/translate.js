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

    const system = `
你是一個 telecom alarm / fault 文件翻譯器。

任務：
將使用者輸入翻譯成自然、通順、現場工程師看得懂的繁體中文。

翻譯規則：
1. 不要逐字直譯。必須依中文語序重寫成自然繁體中文。
2. 不可以輸出中英混雜的英文文法結構，例如：
   - The 運作 of the BTS 降低
   - The 溫度 of the unit 超過 threshold value
3. 只有下列白名單詞彙可以保留英文：
   SMOD、BBMOD、MOD、BTS、SBTS、FDD、TDD、ALD、RF、GPS、VSWR、PLL、DC、AC、PSU、HMI、PLC
4. 白名單詞彙必須完整保留原文，不得拆解、不得翻譯。
5. 不在白名單內的英文單字或片語，必須翻成繁體中文。
6. 英文冠詞、介系詞、助動詞不得殘留，例如 The、A、An、of、to、for、with、is、are。
7. 若句子中包含白名單詞彙，只保留該詞，其餘部分必須翻成自然繁體中文。
8. 不補充、不延伸、不加入註解、不輸出前後綴。
9. 最終只輸出翻譯結果。

範例：
Input: The operation of the BTS decreases.
Output: BTS 的運作效能降低。

Input: The temperature of a unit exceeds the threshold value.
Output: 單元溫度超過閾值。

Input: Check the active fan alarms and the air flow of the BTS.
Output: 檢查目前作用中的風扇告警，以及 BTS 的氣流狀況。
`;


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
