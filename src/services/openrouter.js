const MODELS_URL = 'https://openrouter.ai/api/v1/models';

const PROVIDER_GROUP_LABELS = {
  anthropic: 'Anthropic (Claude)',
  google: 'Google (Gemini)',
  openai: 'OpenAI (GPT)',
  'x-ai': 'xAI (Grok)',
  deepseek: 'DeepSeek',
  'meta-llama': 'Meta Llama',
  mistralai: 'Mistral',
  qwen: 'Qwen',
  cohere: 'Cohere',
};

function providerGroupLabel(slug) {
  if (PROVIDER_GROUP_LABELS[slug]) return PROVIDER_GROUP_LABELS[slug];
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isTextChatModel(m) {
  const arch = m?.architecture;
  if (!arch) return true;
  const inMod = arch.input_modalities || arch.modality;
  const outMod = arch.output_modalities;
  const acceptsText = !inMod || inMod.includes('text') || inMod.includes('image');
  const outputsText = !outMod || outMod.includes('text');
  return acceptsText && outputsText;
}

/**
 * @param {string} [apiKey]
 * @returns {Promise<Array<{ id: string, name: string, provider: string, group: string }>>}
 */
export async function listOpenRouterModels(apiKey) {
  const headers = { Accept: 'application/json' };
  if (apiKey?.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;

  const res = await fetch(MODELS_URL, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter models failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const rows = Array.isArray(json?.data) ? json.data : [];

  return rows
    .filter((m) => m?.id && isTextChatModel(m))
    .map((m) => {
      const provider = m.id.includes('/') ? m.id.split('/')[0] : 'other';
      return {
        id: m.id,
        name: m.name || m.id,
        provider,
        group: providerGroupLabel(provider),
      };
    })
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
}
