import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Bot,
} from 'lucide-react';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';

export interface AIModelSpec {
  slug: string;
  label?: string;
  badge?: string;
  description?: string;
  recommendedTokens?: number;
  recommendedTemp?: number;
  free?: boolean;
}

export interface AIProviderPreset {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  defaultModel: string;
  defaultTokens?: number;
  defaultTemp?: number;
  suggestedModels: (string | AIModelSpec)[];
  free?: boolean;
}

const PROVIDER_PRESETS: AIProviderPreset[] = [
  {
    id: 'groq',
    name: 'Groq Cloud',
    provider: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'qwen/qwen3.8-27b',
    defaultTokens: 1024,
    defaultTemp: 0.3,
    suggestedModels: ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'llama-3.3-70b-versatile'],
    free: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'z-ai/glm-5.2:free',
    defaultTokens: 2048,
    defaultTemp: 0.3,
    suggestedModels: [
      {
        slug: 'z-ai/glm-5.2:free',
        label: 'GLM 5.2',
        badge: 'FREE • 1M Context',
        description: 'Z.ai frontier reasoning model with 1M context. Ideal for complex financial analysis, data diagnostics, and tax compliance calculations.',
        recommendedTokens: 2048,
        recommendedTemp: 0.3,
        free: true,
      },
      {
        slug: 'thinkingmachines/inkling-small:free',
        label: 'Inkling Small',
        badge: 'FREE • 276B MoE',
        description: 'Thinking Machines Lab 276B MoE (12B active) multimodal model with 512K context. Built for fast agentic reasoning and tool execution.',
        recommendedTokens: 2048,
        recommendedTemp: 0.3,
        free: true,
      },
      {
        slug: 'nvidia/nemotron-3-ultra-550b-a55b:free',
        label: 'Nemotron 3 Ultra 550B',
        badge: 'FREE • 550B MoE',
        description: 'NVIDIA 550B MoE (55B active) Transformer-Mamba hybrid model with 1M context. Outstanding for multi-step financial logic and planning.',
        recommendedTokens: 2048,
        recommendedTemp: 0.2,
        free: true,
      },
      {
        slug: 'openrouter/free',
        label: 'OpenRouter Auto Free',
        badge: 'FREE • Auto-Router',
        description: 'Dynamic meta-endpoint routing queries to the most responsive free models available on OpenRouter.',
        recommendedTokens: 1024,
        recommendedTemp: 0.3,
        free: true,
      },
      {
        slug: 'meta-llama/llama-3.3-70b-instruct:free',
        label: 'LLaMA 3.3 70B',
        badge: 'FREE',
        description: 'Meta 70B instruct model. Fast, dependable standard dialogue.',
        recommendedTokens: 1024,
        recommendedTemp: 0.3,
        free: true,
      },
      {
        slug: 'deepseek/deepseek-r1:free',
        label: 'DeepSeek R1',
        badge: 'FREE • Reasoning',
        description: 'DeepSeek open reasoning model with built-in chain of thought.',
        recommendedTokens: 2048,
        recommendedTemp: 0.2,
        free: true,
      },
    ],
    free: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    suggestedModels: ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    free: true,
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'o3-mini'],
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    provider: 'xai',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-2',
    suggestedModels: ['grok-2', 'grok-beta'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'custom',
    name: 'Custom / Ollama',
    provider: 'custom',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3:latest',
    suggestedModels: ['llama3:latest', 'mistral', 'qwen2.5:14b'],
  },
];

export default function AdminAISettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('groq');
  const [provider, setProvider] = useState('groq');
  const [name, setName] = useState('Groq Cloud');
  const [baseUrl, setBaseUrl] = useState('https://api.groq.com/openai/v1');
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [model, setModel] = useState('qwen/qwen3.8-27b');
  const [temperature, setTemperature] = useState<number>(0.3);
  const [maxTokens, setMaxTokens] = useState<number>(1024);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Test Connection Feedback
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    latencyMs?: number;
    reply?: string;
    error?: string;
  } | null>(null);

  // Load existing configuration
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/settings/ai');
      const data = res.data?.data;
      if (data) {
        setProvider(data.provider || 'groq');
        setName(data.name || 'Groq Cloud');
        setBaseUrl(data.baseUrl || 'https://api.groq.com/openai/v1');
        setMaskedApiKey(data.maskedApiKey || '');
        setHasApiKey(data.hasApiKey || false);
        setModel(data.model || 'qwen/qwen3.8-27b');
        setTemperature(data.temperature !== undefined ? Number(data.temperature) : 0.3);
        setMaxTokens(data.maxTokens || 1024);
        setIsActive(data.isActive !== undefined ? data.isActive : true);
        setUpdatedAt(data.updatedAt || null);

        // Match with known preset if possible
        const matchingPreset = PROVIDER_PRESETS.find(
          (p) => p.provider === data.provider || data.baseUrl.includes(p.id)
        );
        if (matchingPreset) {
          setSelectedPresetId(matchingPreset.id);
        } else {
          setSelectedPresetId('custom');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSelectPreset = (preset: AIProviderPreset) => {
    setSelectedPresetId(preset.id);
    setProvider(preset.provider);
    setName(preset.name);
    setBaseUrl(preset.baseUrl);
    setModel(preset.defaultModel);
    if (preset.defaultTokens) setMaxTokens(preset.defaultTokens);
    if (preset.defaultTemp !== undefined) setTemperature(preset.defaultTemp);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const payload = {
        provider,
        baseUrl,
        apiKey: apiKey.trim() || undefined,
        model,
      };

      const res = await api.post('/admin/settings/ai/test', payload);
      const result = res.data?.data;

      if (result?.success) {
        setTestResult({
          tested: true,
          success: true,
          latencyMs: result.latencyMs,
          reply: result.reply,
        });
        toast.success(`Connection verified (${result.latencyMs}ms)!`);
      } else {
        setTestResult({
          tested: true,
          success: false,
          error: result?.error || 'Connection failed',
        });
        toast.error(result?.error || 'Connection failed');
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Connection test error';
      setTestResult({
        tested: true,
        success: false,
        error: errorMsg,
      });
      toast.error(errorMsg);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!baseUrl.trim()) {
      toast.error('Base URL is required');
      return;
    }
    if (!model.trim()) {
      toast.error('Model identifier is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        provider,
        name,
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim() || undefined, // If empty, backend retains existing encrypted key
        model: model.trim(),
        temperature,
        maxTokens,
        isActive,
      };

      const res = await api.put('/admin/settings/ai', payload);
      const data = res.data?.data;

      toast.success('AI Provider configuration saved and activated!');
      setApiKey(''); // Clear raw input field for security
      if (data) {
        setMaskedApiKey(data.maskedApiKey || '');
        setHasApiKey(data.hasApiKey || false);
        setUpdatedAt(data.updatedAt || new Date().toISOString());
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update AI settings');
    } finally {
      setSaving(false);
    }
  };

  const currentPreset = PROVIDER_PRESETS.find((p) => p.id === selectedPresetId);

  const matchedModelItem = currentPreset?.suggestedModels?.find((item) => {
    const slug = typeof item === 'string' ? item : item.slug;
    return slug === model;
  });

  const activeModelSpec: AIModelSpec | null =
    typeof matchedModelItem === 'object'
      ? matchedModelItem
      : matchedModelItem
        ? { slug: matchedModelItem, free: matchedModelItem.includes(':free') }
        : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-fade-in">
      {/* Header — Clean, typography-first, no icons next to title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-sans">AI Settings</h1>
          <p className="mt-1 text-sm text-gray-500 font-body">
            Configure the AI provider, model, and credentials powering the SME assistant.
          </p>
        </div>

        {/* Master Switch */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-gray-500">Status:</span>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                : 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 shadow-2xs'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {isActive ? 'Active (Live)' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* 1-Click Provider Selector (Minimalist Pills) */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
          Choose Provider Preset
        </label>
        <div className="flex flex-wrap gap-2">
          {PROVIDER_PRESETS.map((p) => {
            const isSelected = selectedPresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                <span>{p.name}</span>
                {p.free && (
                  <span
                    className={`text-[9px] px-1 py-0.5 rounded font-bold uppercase tracking-wide ${
                      isSelected
                        ? 'bg-purple-700 text-white'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    Free
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Configuration Card */}
      <form onSubmit={handleSave}>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-6 sm:p-7 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Label / Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Provider Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Groq Cloud or OpenRouter"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all shadow-2xs"
                required
              />
            </div>

            {/* Provider Type */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Provider Protocol
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all shadow-2xs cursor-pointer"
              >
                <option value="groq">Groq Cloud (OpenAI-compatible)</option>
                <option value="openrouter">OpenRouter</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="gemini">Google Gemini</option>
                <option value="xai">xAI (Grok)</option>
                <option value="deepseek">DeepSeek</option>
                <option value="custom">Custom / Self-Hosted</option>
              </select>
            </div>

            {/* Base URL */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                API Base URL
              </label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/60 border border-gray-300 text-gray-900 placeholder:text-gray-400 text-sm font-mono focus:outline-none focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all shadow-2xs"
                required
              />
            </div>

            {/* API Key */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <span>API Key</span>
                  {hasApiKey && (
                    <span className="text-emerald-700 text-xs font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Active: {maskedApiKey}
                    </span>
                  )}
                </label>
                <span className="text-xs text-gray-400">
                  {hasApiKey ? 'Leave blank to keep existing key' : 'Required'}
                </span>
              </div>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasApiKey ? '••••••••••••••••••••••••••••••••' : 'Enter secret key (sk-...)'}
                  className="w-full pl-3.5 pr-11 py-2.5 rounded-xl bg-gray-50/60 border border-gray-300 text-gray-900 placeholder:text-gray-400 text-sm font-mono focus:outline-none focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Model Name */}
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Model Identifier
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. qwen/qwen3.8-27b, gpt-4o-mini, or nvidia/nemotron-3-ultra:free"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/60 border border-gray-300 text-gray-900 placeholder:text-gray-400 text-sm font-mono focus:outline-none focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all shadow-2xs"
                required
              />

              {/* Clickable Model Suggestions */}
              {currentPreset?.suggestedModels && currentPreset.suggestedModels.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-gray-500 mr-1">Quick select:</span>
                    {currentPreset.suggestedModels.map((item) => {
                      const spec: AIModelSpec =
                        typeof item === 'string'
                          ? { slug: item, free: item.includes(':free') || item.endsWith('/free') }
                          : item;
                      const isSelected = model === spec.slug;
                      return (
                        <button
                          key={spec.slug}
                          type="button"
                          onClick={() => {
                            setModel(spec.slug);
                            if (spec.recommendedTokens) setMaxTokens(spec.recommendedTokens);
                            if (spec.recommendedTemp !== undefined) setTemperature(spec.recommendedTemp);
                          }}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-purple-100 text-purple-900 border-purple-300 font-bold shadow-2xs'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 hover:text-gray-900'
                          }`}
                        >
                          {spec.free && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              FREE
                            </span>
                          )}
                          <span>{spec.label || spec.slug}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Selected Model Specification Card */}
                  {activeModelSpec && (
                    <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-xs text-purple-950 flex items-start gap-2.5 animate-fade-in">
                      <Bot className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900">{activeModelSpec.label || activeModelSpec.slug}</span>
                          {activeModelSpec.badge && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {activeModelSpec.badge}
                            </span>
                          )}
                          {activeModelSpec.recommendedTokens && (
                            <span className="text-[11px] text-purple-700 font-mono">
                              Optimal: {activeModelSpec.recommendedTokens} tokens • {activeModelSpec.recommendedTemp} temp
                            </span>
                          )}
                        </div>
                        {activeModelSpec.description && (
                          <p className="text-gray-600 mt-1 text-[11px] leading-relaxed font-body">
                            {activeModelSpec.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Advanced Parameters */}
          <div className="border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 py-1 cursor-pointer transition-colors"
            >
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showAdvanced ? 'Hide advanced parameters' : 'Advanced parameters (Temperature & Tokens)'}</span>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 mt-2 bg-gray-50/50 p-4 rounded-xl border border-gray-200/80">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Temperature: <span className="text-purple-700 font-mono">{temperature}</span>
                    </label>
                    <span className="text-[11px] text-gray-400">0.3 is optimal for tax logic</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Max Output Tokens
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="4096"
                    step="64"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 1024)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-900 text-sm font-mono focus:outline-none focus:border-purple-600 transition-all shadow-2xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Test Connection Output */}
          {testResult?.tested && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <span>{testResult.success ? 'Connection Verified' : 'Connection Failed'}</span>
                  {testResult.latencyMs !== undefined && (
                    <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">
                      {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
                <div className="font-mono text-[11px] leading-relaxed break-words opacity-90">
                  {testResult.success ? `Response: "${testResult.reply}"` : testResult.error}
                </div>
              </div>
            </div>
          )}

          {/* Actions Bar */}
          <div className="border-t border-gray-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || loading}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                {testing ? 'Testing Endpoint...' : 'Test Connection'}
              </button>

              {updatedAt && (
                <span className="hidden sm:inline text-[11px] text-gray-400">
                  Updated {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || loading}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
