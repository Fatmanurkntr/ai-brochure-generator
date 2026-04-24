/**
 * fetchBrochure — Dinamik Model Seçimli AI Broşür Servisi
 *
 * Desteklenen API anahtarı formatları:
 *   AIza...  →  Google Gemini  (generativelanguage.googleapis.com)
 *   gsk_...  →  Groq           (api.groq.com)
 *   sk-...   →  OpenAI         (api.openai.com)
 *
 * Model seçimi kullanıcıdan gelir; endpoint ve model parametresi dinamik oluşturulur.
 */

// ─── Sabitler ────────────────────────────────────────────────────────────────

const JINA_BASE_URL          = 'https://r.jina.ai/';
const GEMINI_BASE_ENDPOINT   = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_ENDPOINT          = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_ENDPOINT        = 'https://api.openai.com/v1/chat/completions';

// ─── Model Kataloğu ───────────────────────────────────────────────────────────
// Bu tek kaynak; UI ve API mantığı buradan beslenir.

export const MODELS_CATALOG = [
  // ── Google Gemini ────────────────────────────────────────────────────────
  {
    key:             'gemini-2.0-flash-lite',
    provider:        'gemini',
    label:           'Gemini 2.0 Flash Lite',
    hint:            'Hızlı & Ücretsiz',
    modelId:         'gemini-2.0-flash-lite',
    maxChars:        10_000,
    maxOutputTokens: 2048,
  },
  {
    key:             'gemini-1.5-pro',
    provider:        'gemini',
    label:           'Gemini 1.5 Pro',
    hint:            'Gelişmiş',
    modelId:         'gemini-1.5-pro-latest',
    maxChars:        12_000,
    maxOutputTokens: 2048,
  },

  // ── Groq — Production Models (Nisan 2026) ───────────────────────────────
  {
    key:             'groq-llama31-8b',
    provider:        'groq',
    label:           'Llama 3.1 8B Instant',
    hint:            'Hızlı & Ücretsiz',
    modelId:         'llama-3.1-8b-instant',
    maxChars:        3_000,   // ücretsiz katta 6 000 TPM — içerik + çıktı sığmalı
    maxOutputTokens: 1024,
  },
  {
    key:             'groq-llama33-70b',
    provider:        'groq',
    label:           'Llama 3.3 70B Versatile',
    hint:            'Güçlü & Dengeli',
    modelId:         'llama-3.3-70b-versatile',
    maxChars:        6_000,
    maxOutputTokens: 2048,
  },
  {
    key:             'groq-qwen3-32b',
    provider:        'groq',
    label:           'Qwen3 32B',
    hint:            'Çok Dilli · Preview',
    modelId:         'qwen/qwen3-32b',
    maxChars:        6_000,
    maxOutputTokens: 2048,
  },

  // ── OpenAI ───────────────────────────────────────────────────────────────
  {
    key:             'openai-gpt4o-mini',
    provider:        'openai',
    label:           'GPT-4o Mini',
    hint:            'Hızlı & Ekonomik',
    modelId:         'gpt-4o-mini',
    maxChars:        10_000,
    maxOutputTokens: 2048,
  },
  {
    key:             'openai-gpt4o',
    provider:        'openai',
    label:           'GPT-4o',
    hint:            'En Güçlü',
    modelId:         'gpt-4o',
    maxChars:        12_000,
    maxOutputTokens: 2048,
  },
];

export const DEFAULT_MODEL_KEY = 'groq-llama31-8b'; // En güvenli ücretsiz seçenek


// ─── Sistem Promptu ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert marketing copywriter and brand strategist.
Your task is to generate a visually rich, beautifully structured **digital brochure** in Markdown format.

Rules:
- Start with the company/product name as an H1 heading.
- Follow with a compelling one-line tagline as a blockquote.
- Organize the brochure into clear sections using H2 headings. Choose section titles that match the OUTPUT language specified by the user — do NOT use English titles if the output language is not English.
- CRITICAL LANGUAGE RULE: The user will specify an OUTPUT LANGUAGE. The ENTIRE output — including every heading, label, bullet point, and tagline — MUST be written exclusively in that specified output language, regardless of the source website's language. Never mix languages.
- Use bullet points for features.
- Keep the tone professional yet warm — like Apple or Notion marketing copy.
- Respond ONLY with the Markdown — no explanations, no code fences.`;

// ─── Tarayıcı Dili Tespit & Etiket ──────────────────────────────────────────

/** BCP-47 dil kodunu okunabilir bir isme çevirir (ör. 'tr' → 'Turkish / Türkçe') */
function resolveLanguageLabel(bcp47) {
  const code = (bcp47 || 'en').split('-')[0].toLowerCase();
  const map = {
    tr: 'Turkish / Türkçe',
    en: 'English',
    de: 'German / Deutsch',
    fr: 'French / Français',
    es: 'Spanish / Español',
    it: 'Italian / Italiano',
    pt: 'Portuguese / Português',
    nl: 'Dutch / Nederlands',
    pl: 'Polish / Polski',
    ru: 'Russian / Русский',
    ar: 'Arabic / العربية',
    zh: 'Chinese / 中文',
    ja: 'Japanese / 日本語',
    ko: 'Korean / 한국어',
    hi: 'Hindi / हिन्दी',
    sv: 'Swedish / Svenska',
    no: 'Norwegian / Norsk',
    da: 'Danish / Dansk',
    fi: 'Finnish / Suomi',
  };
  return map[code] ?? 'English';
}

/** Kullanıcıya gösterilecek prompt'u oluşturur (dil direktifi dahil) */
function buildUserPrompt(content, detectedLanguage) {
  return (
    `IMPORTANT — OUTPUT LANGUAGE DIRECTIVE: You MUST write the ENTIRE brochure ` +
    `exclusively in **${detectedLanguage}**, regardless of the source website's language. ` +
    `Every heading, tagline, bullet point, and sentence must be in ${detectedLanguage}. ` +
    `Do NOT use any other language under any circumstances.\n\n` +
    `Here is the website content:\n\n${content}\n\nGenerate the brochure now.`
  );
}

// ─── URL Yardımcıları ─────────────────────────────────────────────────────────

export function isValidUrl(url) {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
}

export function normalizeUrl(url) {
  return url.startsWith('http') ? url : `https://${url}`;
}

// ─── Sağlayıcı Algılayıcı ────────────────────────────────────────────────────

export function detectProvider(apiKey) {
  const key = (apiKey || '').trim();
  if (key.startsWith('AIza')) return 'gemini';
  if (key.startsWith('gsk_')) return 'groq';
  if (key.startsWith('sk-'))  return 'openai';
  return null;
}

// ─── Sağlayıcı Etiketi ───────────────────────────────────────────────────────

export function getProviderLabel(provider) {
  return (
    { gemini: 'Google Gemini', groq: 'Groq', openai: 'OpenAI' }[provider] ?? ''
  );
}

// ─── Dinamik Model Çekme ────────────────────────────────────────────────────────────────

/**
 * Platformın /models endpoint'ine istek at ve normalize edilmiş liste dön.
 * @returns {Promise<Array<{modelId: string, label: string}>>}
 */
export async function fetchAvailableModels(apiKey) {
  const provider = detectProvider(apiKey);
  if (!provider) return [];

  // ─ Gemini ─
  if (provider === 'gemini') {
    const url  = `${GEMINI_BASE_ENDPOINT}?key=${apiKey}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`Gemini model listesi alınamadı (${res.status}).`);
    const data = await res.json();

    return (data.models ?? [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({
        modelId: m.name.replace('models/', ''),
        label:   m.displayName || m.name.replace('models/', ''),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  // ─ Groq ─
  if (provider === 'groq') {
    const res  = await fetch(GROQ_ENDPOINT.replace('/chat/completions', '/models'), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Groq model listesi alınamadı (${res.status}).`);
    const data = await res.json();

    // Sadece metin üretim modelleri (ses/görüntü/moderasyon filtresi)
    const TEXT_BLOCKLIST = ['whisper', 'tts', 'guard', 'vision', 'embed', 'moderation', 'rerank', 'clip'];
    return (data.data ?? [])
      .filter(m => !TEXT_BLOCKLIST.some(k => m.id.toLowerCase().includes(k)))
      .map(m => ({ modelId: m.id, label: m.id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  // ─ OpenAI ─
  if (provider === 'openai') {
    const res  = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`OpenAI model listesi alınamadı (${res.status}).`);
    const data = await res.json();

    // Sadece GPT ve o-serisi metin modelleri
    return (data.data ?? [])
      .filter(m => /^(gpt-|o1|o3|chatgpt)/.test(m.id))
      .map(m => ({ modelId: m.id, label: m.id }))
      .sort((a, b) => b.label.localeCompare(a.label)); // yeniden eskiye
  }

  return [];
}

// ─── Adım 1: Jina Reader ─────────────────────────────────────────────────────

async function fetchWebContent(url, maxChars = 12_000) {
  const jinaUrl = `${JINA_BASE_URL}${normalizeUrl(url)}`;

  const response = await fetch(jinaUrl, {
    headers: { Accept: 'text/plain' },
  });

  if (!response.ok) {
    throw new Error(
      `Web sayfası okunamadı (${response.status}). URL'yi kontrol edin.`
    );
  }

  const text = await response.text();

  if (!text || text.trim().length < 100) {
    throw new Error('Sayfadan yeterli içerik alınamadı. Başka bir URL deneyin.');
  }

  // Modelin token kapasitesine göre kes
  if (text.length > maxChars) {
    return text.slice(0, maxChars) + '\n\n... [metin kısaltıldı]';
  }
  return text;
}

// ─── Adım 2a: Gemini API — dinamik model + endpoint ──────────────────────────

async function generateWithGemini(content, apiKey, modelId, maxOutputTokens, userPrompt) {
  const endpoint = `${GEMINI_BASE_ENDPOINT}/${modelId}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature:     0.7,
        maxOutputTokens: maxOutputTokens,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const rawMsg = err?.error?.message ?? '';

    // Kota hatası mı? Retry süresini parse et ve kullanıcıya göster
    if (response.status === 429 || rawMsg.toLowerCase().includes('quota')) {
      const retryMatch = rawMsg.match(/retry in ([\d.]+)s/i);
      const retrySec   = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;
      const retryHint  = retrySec
        ? ` ${retrySec} saniye sonra tekrar deneyin.`
        : ' Birkaç dakika sonra tekrar deneyin.';

      throw new Error(
        `Gemini ücretsiz kotanız doldu.${retryHint} ` +
        `Alternatif olarak Groq API anahtarı (gsk_…) ile ` +
        `"Groq Llama 3 8B — Hızlı & Ücretsiz" modelini seçebilirsiniz.`
      );
    }

    throw new Error(rawMsg || `Gemini API hatası: ${response.status}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─── Adım 2b: OpenAI-Uyumlu API (Groq + OpenAI) — dinamik model ──────────────

async function generateWithOpenAICompat(content, apiKey, provider, modelId, maxOutputTokens, userPrompt) {
  const endpoint = provider === 'groq' ? GROQ_ENDPOINT : OPENAI_ENDPOINT;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:       modelId,
      temperature: 0.7,
      max_tokens:  maxOutputTokens,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `${provider} API hatası: ${response.status}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── Ana Export ────────────────────────────────────────────────────────────────────────

// Her provider için varsayılan güvenli limitler (catalog yerine)
const PROVIDER_DEFAULTS = {
  gemini: { maxChars: 10_000, maxOutputTokens: 2048 },
  groq:   { maxChars:  4_000, maxOutputTokens: 1024 }, // ücretsiz tier koruması
  openai: { maxChars: 10_000, maxOutputTokens: 2048 },
};

/**
 * @param {string} url     - Broşür üretilecek web sitesi URL'si
 * @param {string} apiKey  - Gemini, Groq veya OpenAI API anahtarı
 * @param {string} modelId - Platform API'sinden gelen model ID'si (dinamik)
 * @returns {Promise<{ markdown: string, provider: string, modelLabel: string }>}
 */
export async function fetchBrochure(url, apiKey, modelId) {
  // 0. Sağlayıcıyı algıla
  const provider = detectProvider(apiKey);

  if (!provider) {
    throw new Error(
      'Geçersiz veya desteklenmeyen API Key formatı. ' +
      'Gemini (AIza…), Groq (gsk_…) veya OpenAI (sk-…) anahtarı kullanın.'
    );
  }

  if (!modelId) {
    throw new Error('Lütfen bir model seçin.');
  }

  const { maxChars, maxOutputTokens } = PROVIDER_DEFAULTS[provider];

  // 1. Tarayıcı dilini tespit et
  const browserLang     = (navigator.languages?.[0] ?? navigator.language ?? 'en');
  const detectedLanguage = resolveLanguageLabel(browserLang);

  // 2. Web içeriğini çek
  const webContent = await fetchWebContent(url, maxChars);

  // 3. Dil direktifini içeren user prompt'u oluştur
  const userPrompt = buildUserPrompt(webContent, detectedLanguage);

  // 4. Sağlayıcıya göre yönlendir
  let markdown;

  if (provider === 'gemini') {
    markdown = await generateWithGemini(webContent, apiKey, modelId, maxOutputTokens, userPrompt);
  } else {
    markdown = await generateWithOpenAICompat(webContent, apiKey, provider, modelId, maxOutputTokens, userPrompt);
  }

  return { markdown, provider, modelLabel: modelId };
}
