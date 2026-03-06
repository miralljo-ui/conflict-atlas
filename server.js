const path = require('path');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const anthropicVersion = process.env.ANTHROPIC_VERSION || '2023-06-01';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function normalizeNewsPayload(payload) {
  if (!payload || !Array.isArray(payload.news)) return { news: [] };
  const news = payload.news
    .filter((item) => item && typeof item === 'object')
    .slice(0, 5)
    .map((item) => ({
      headline: String(item.headline || '').trim(),
      summary: String(item.summary || '').trim(),
      source: String(item.source || '').trim(),
      date: String(item.date || '').trim() || new Date().toISOString().slice(0, 10),
    }))
    .filter((item) => item.headline.length > 0);

  return { news };
}

function tryExtractJson(text) {
  if (!text || typeof text !== 'string') return null;

  try {
    return JSON.parse(text);
  } catch {
    // Keep trying with common wrappers.
  }

  const clean = text.replace(/```json|```/gi, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    // Last-chance parse from the first JSON object block.
  }

  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

app.post('/api/news', async (req, res) => {
  const conflictName = String(req.body?.conflictName || '').trim();
  const region = String(req.body?.region || '').trim();
  const query = String(req.body?.query || '').trim();
  const language = String(req.body?.language || 'es').trim().toLowerCase();
  const maxItems = Math.min(Math.max(Number(req.body?.maxItems || 5), 1), 5);

  if (!conflictName) {
    return res.status(400).json({ error: 'conflictName is required', news: [] });
  }

  if (!anthropicApiKey) {
    return res.status(503).json({
      error: 'Missing ANTHROPIC_API_KEY in environment',
      news: [],
    });
  }

  const systemPrompt = [
    'You are a geopolitical analyst.',
    'Search for recent and credible news about the requested conflict.',
    'Return ONLY valid JSON without markdown fences using this exact shape:',
    '{"news":[{"headline":"...","summary":"...","source":"...","date":"YYYY-MM-DD"}]}',
    `Return between 3 and ${maxItems} items when possible.`,
    'Summaries must be concise (max two sentences).',
  ].join(' ');

  const userPrompt = [
    `Conflict: ${conflictName}`,
    `Region: ${region || 'N/A'}`,
    `Search query: ${query || conflictName}`,
    `Response language: ${language}`,
  ].join('\n');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': anthropicVersion,
      },
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: 900,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      return res.status(502).json({
        error: `Anthropic request failed with status ${response.status}`,
        details: raw.slice(0, 500),
        news: [],
      });
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((block) => block?.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const parsed = tryExtractJson(text);
    return res.json(normalizeNewsPayload(parsed));
  } catch (error) {
    return res.status(500).json({
      error: 'Internal error while fetching news',
      details: error?.message || 'Unknown error',
      news: [],
    });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Conflict Atlas server running at http://localhost:${port}`);
});
