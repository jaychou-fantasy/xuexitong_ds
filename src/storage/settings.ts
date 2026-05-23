/**
 * chrome.storage.local wrappers for extension settings.
 *
 * All read/write operations for API keys, model config, and
 * user preferences go through these functions.
 */

import type { ExtensionSettings, ModelTier, ProviderType } from '@shared/types';

const DEFAULTS: ExtensionSettings = {
  provider: 'deepseek',
  deepseekApiKey: '',
  deepseekFlashModel: 'deepseek-chat',
  deepseekProModel: 'deepseek-reasoner',
  openaiApiKey: '',
  openaiFlashModel: 'gpt-4o-mini',
  openaiProModel: 'gpt-4o',
  geminiApiKey: '',
  geminiFlashModel: 'gemini-2.0-flash',
  geminiProModel: 'gemini-2.5-pro',
  selectedModel: 'flash',
};

/**
 * Read all extension settings. Returns defaults for unset keys.
 */
export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get('xxt_settings');
  const stored = result.xxt_settings as Partial<ExtensionSettings> | undefined;
  return { ...DEFAULTS, ...stored };
}

/**
 * Merge partial settings into storage.
 */
export async function saveSettings(
  partial: Partial<ExtensionSettings>,
): Promise<void> {
  const current = await getSettings();
  const merged = { ...current, ...partial };
  await chrome.storage.local.set({ xxt_settings: merged });
}

/**
 * Get the API key for the currently selected provider.
 */
export async function getApiKey(): Promise<string> {
  const s = await getSettings();
  switch (s.provider) {
    case 'openai': return s.openaiApiKey;
    case 'gemini': return s.geminiApiKey;
    default: return s.deepseekApiKey;
  }
}

/**
 * Get the active model name based on provider + selected tier.
 */
export async function getActiveModel(): Promise<string> {
  const s = await getSettings();
  const isPro = s.selectedModel === 'pro';
  switch (s.provider) {
    case 'openai':
      return isPro ? s.openaiProModel : s.openaiFlashModel;
    case 'gemini':
      return isPro ? s.geminiProModel : s.geminiFlashModel;
    default:
      return isPro ? s.deepseekProModel : s.deepseekFlashModel;
  }
}

/**
 * Get the active provider type.
 */
export async function getActiveProvider(): Promise<ProviderType> {
  const s = await getSettings();
  return s.provider;
}

/**
 * Get the selected model tier.
 */
export async function getSelectedTier(): Promise<ModelTier> {
  const s = await getSettings();
  return s.selectedModel;
}
