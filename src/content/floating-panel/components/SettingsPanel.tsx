import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '@storage/settings';
import type { ExtensionSettings, ModelTier, ProviderType } from '@shared/types';

interface SettingsPanelProps {
  isDarkMode: boolean;
}

const PROVIDERS: { key: ProviderType; label: string }[] = [
  { key: 'deepseek', label: 'DeepSeek' },
  { key: 'openai', label: 'OpenAI' },
  { key: 'gemini', label: 'Gemini' },
];

const PROVIDER_DEFAULTS: Record<ProviderType, {
  flashModel: string;
  proModel: string;
  placeholder: string;
}> = {
  deepseek: {
    flashModel: 'deepseek-chat',
    proModel: 'deepseek-reasoner',
    placeholder: 'sk-...',
  },
  openai: {
    flashModel: 'gpt-4o-mini',
    proModel: 'gpt-4o',
    placeholder: 'sk-proj-...',
  },
  gemini: {
    flashModel: 'gemini-2.0-flash',
    proModel: 'gemini-2.5-pro',
    placeholder: 'AIza...',
  },
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isDarkMode }) => {
  const [provider, setProvider] = useState<ProviderType>('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [flashModel, setFlashModel] = useState('');
  const [proModel, setProModel] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelTier>('flash');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((s: ExtensionSettings) => {
      setProvider(s.provider);
      setSelectedModel(s.selectedModel);
      loadProviderFields(s.provider, s, s.selectedModel);
    });
  }, []);

  const loadProviderFields = (
    p: ProviderType,
    s: ExtensionSettings,
    tier: ModelTier,
  ) => {
    const def = PROVIDER_DEFAULTS[p];
    switch (p) {
      case 'openai':
        setApiKey(s.openaiApiKey);
        setFlashModel(s.openaiFlashModel || def.flashModel);
        setProModel(s.openaiProModel || def.proModel);
        break;
      case 'gemini':
        setApiKey(s.geminiApiKey);
        setFlashModel(s.geminiFlashModel || def.flashModel);
        setProModel(s.geminiProModel || def.proModel);
        break;
      default:
        setApiKey(s.deepseekApiKey);
        setFlashModel(s.deepseekFlashModel || def.flashModel);
        setProModel(s.deepseekProModel || def.proModel);
    }
  };

  const handleProviderChange = async (p: ProviderType) => {
    setProvider(p);
    const s = await getSettings();
    loadProviderFields(p, s, selectedModel);
  };

  const handleSave = async () => {
    const partial: Partial<ExtensionSettings> = { provider, selectedModel };
    switch (provider) {
      case 'openai':
        partial.openaiApiKey = apiKey;
        partial.openaiFlashModel = flashModel;
        partial.openaiProModel = proModel;
        break;
      case 'gemini':
        partial.geminiApiKey = apiKey;
        partial.geminiFlashModel = flashModel;
        partial.geminiProModel = proModel;
        break;
      default:
        partial.deepseekApiKey = apiKey;
        partial.deepseekFlashModel = flashModel;
        partial.deepseekProModel = proModel;
    }
    await saveSettings(partial);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClass = `w-full px-3 py-1.5 text-sm rounded border ${
    isDarkMode
      ? 'bg-gray-800 border-gray-600 text-gray-200 focus:border-blue-500'
      : 'bg-white border-gray-300 text-gray-800 focus:border-blue-500'
  } outline-none transition-colors`;

  const labelClass = `text-xs mb-1 block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;

  const selectClass = `w-full px-3 py-1.5 text-sm rounded border ${
    isDarkMode
      ? 'bg-gray-800 border-gray-600 text-gray-200'
      : 'bg-white border-gray-300 text-gray-800'
  } outline-none`;

  const pd = PROVIDER_DEFAULTS[provider];

  return (
    <div className="px-3 py-2 border-b border-gray-700">
      {/* Provider selector */}
      <label className={labelClass}>AI 模型</label>
      <select
        className={selectClass}
        value={provider}
        onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
      >
        {PROVIDERS.map((p) => (
          <option key={p.key} value={p.key}>{p.label}</option>
        ))}
      </select>

      {/* API Key */}
      <label className={`${labelClass} mt-2`}>{PROVIDERS.find(p => p.key === provider)?.label} API Key</label>
      <input
        type="password"
        className={inputClass}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={pd.placeholder}
      />

      {/* Model Tier */}
      <label className={`${labelClass} mt-2`}>默认模型</label>
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedModel('flash')}
          className={`flex-1 py-1 px-2 text-xs rounded border transition-colors ${
            selectedModel === 'flash'
              ? 'bg-blue-600 border-blue-500 text-white'
              : isDarkMode
                ? 'bg-gray-800 border-gray-600 text-gray-400'
                : 'bg-gray-100 border-gray-300 text-gray-600'
          }`}
        >
          Flash（快速）
        </button>
        <button
          onClick={() => setSelectedModel('pro')}
          className={`flex-1 py-1 px-2 text-xs rounded border transition-colors ${
            selectedModel === 'pro'
              ? 'bg-blue-600 border-blue-500 text-white'
              : isDarkMode
                ? 'bg-gray-800 border-gray-600 text-gray-400'
                : 'bg-gray-100 border-gray-300 text-gray-600'
          }`}
        >
          Pro（高精度）
        </button>
      </div>

      {/* Model name */}
      <div className="mt-2">
        <label className={labelClass}>
          {selectedModel === 'flash' ? 'Flash 模型名' : 'Pro 模型名'}
        </label>
        <input
          className={inputClass}
          value={selectedModel === 'flash' ? flashModel : proModel}
          onChange={(e) =>
            selectedModel === 'flash'
              ? setFlashModel(e.target.value)
              : setProModel(e.target.value)
          }
          placeholder={selectedModel === 'flash' ? pd.flashModel : pd.proModel}
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`mt-3 w-full py-1.5 text-sm rounded transition-colors font-medium ${
          saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
        }`}
      >
        {saved ? '已保存' : '保存设置'}
      </button>
    </div>
  );
};

export default SettingsPanel;
