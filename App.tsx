
import React, { useState, useEffect, useRef } from 'react';
import InputSection from './components/InputSection';
import TestPreview from './components/TestPreview';
import { generateVocabTest, parseTestFromText } from './services/aiService';
import { TestGenerationResult, createEmptyTest, QuestionType, AIConfig, AIProvider, PROVIDER_DEFAULTS, PROVIDER_MODELS } from './types';
import { BookOpen, GraduationCap, FileText, AlertCircle, Settings, KeyRound, Save, History, Trash2, X, Sun, Moon } from 'lucide-react';

const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: 'Google Gemini',
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  kimi: 'Kimi (Moonshot)',
  'kimi-code': 'Kimi Code',
  custom: 'Custom (OpenAI-compatible)',
};

type LoadingStage = 'idle' | 'connecting' | 'generating' | 'parsing';

interface LoadingState {
  stage: LoadingStage;
  elapsed: number;
  receivedChars: number;
  progress: number; // 0-100
}

interface SavedVersion {
  id: string;
  name: string;
  result: TestGenerationResult;
  difficulty: string;
  createdAt: number;
}

const defaultConfig: AIConfig = {
  provider: 'gemini',
  apiKey: '',
  baseUrl: '',
  model: PROVIDER_DEFAULTS.gemini.model,
};

const SAVED_VERSIONS_KEY = 'vocabforge_saved_versions';

const App: React.FC = () => {
  const [result, setResult] = useState<TestGenerationResult | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ stage: 'idle', elapsed: 0, receivedChars: 0, progress: 0 });
  const [error, setError] = useState<string | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState<string>('medium');
  const cancelledRef = useRef(false);

  const [aiConfig, setAiConfig] = useState<AIConfig>(defaultConfig);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [draftConfig, setDraftConfig] = useState<AIConfig>(defaultConfig);

  const [savedVersions, setSavedVersions] = useState<SavedVersion[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_VERSIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('vocabforge_dark_mode');
      return saved === null ? false : saved === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('vocabforge_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    const raw = localStorage.getItem('ai_config');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AIConfig;
        // Load provider-specific saved key if available
        const rawKeys = localStorage.getItem('ai_keys');
        if (rawKeys) {
          const keys = JSON.parse(rawKeys);
          const saved = keys[parsed.provider];
          if (saved?.apiKey) {
            parsed.apiKey = saved.apiKey;
            parsed.baseUrl = saved.baseUrl || PROVIDER_DEFAULTS[parsed.provider].baseUrl;
            parsed.model = saved.model || PROVIDER_DEFAULTS[parsed.provider].model;
          }
        }
        // Auto-correct invalid/outdated model names
        const validModels = PROVIDER_MODELS[parsed.provider]?.map(m => m.value) || [];
        if (validModels.length > 0 && !validModels.includes(parsed.model)) {
          parsed.model = PROVIDER_DEFAULTS[parsed.provider].model;
          localStorage.setItem('ai_config', JSON.stringify(parsed));
        }
        setAiConfig(parsed);
      } catch {
        setShowKeyModal(true);
      }
    } else {
      setShowKeyModal(true);
    }
  }, []);

  const saveConfig = () => {
    const trimmed = { ...draftConfig, apiKey: draftConfig.apiKey.trim(), baseUrl: draftConfig.baseUrl?.trim() || '' };
    if (!trimmed.apiKey) return;
    // Save current active config
    localStorage.setItem('ai_config', JSON.stringify(trimmed));
    // Save per-provider key so switching providers preserves keys
    const rawKeys = localStorage.getItem('ai_keys');
    const keys = rawKeys ? JSON.parse(rawKeys) : {};
    keys[trimmed.provider] = {
      apiKey: trimmed.apiKey,
      baseUrl: trimmed.baseUrl,
      model: trimmed.model,
    };
    localStorage.setItem('ai_keys', JSON.stringify(keys));
    setAiConfig(trimmed);
    setShowKeyModal(false);
  };

  const openSettings = () => {
    // Load provider-specific saved key when opening settings
    const rawKeys = localStorage.getItem('ai_keys');
    let configToEdit = { ...aiConfig };
    if (rawKeys) {
      try {
        const keys = JSON.parse(rawKeys);
        const saved = keys[aiConfig.provider];
        if (saved?.apiKey) {
          configToEdit = {
            ...aiConfig,
            apiKey: saved.apiKey,
            baseUrl: saved.baseUrl || PROVIDER_DEFAULTS[aiConfig.provider].baseUrl,
            model: saved.model || PROVIDER_DEFAULTS[aiConfig.provider].model,
          };
        }
      } catch { /* ignore */ }
    }
    setDraftConfig(configToEdit);
    setShowKeyModal(true);
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    setLoading({ stage: 'idle', elapsed: 0, receivedChars: 0, progress: 0 });
  };

  const handleGenerate = async (
    words: string[],
    versions: number,
    difficulty: 'basic' | 'easy' | 'medium' | 'hard',
    sections?: QuestionType[]
  ) => {
    if (!aiConfig.apiKey) {
      setShowKeyModal(true);
      return;
    }
    cancelledRef.current = false;
    setLoading({ stage: 'connecting', elapsed: 0, receivedChars: 0, progress: 5 });
    setError(null);
    setCurrentDifficulty(difficulty);

    const timer = setInterval(() => {
      setLoading(prev => ({ ...prev, elapsed: prev.elapsed + 1 }));
    }, 1000);

    try {
      const data = await generateVocabTest({
        wordList: words,
        versions,
        difficulty,
        aiConfig,
        sections
      }, (text) => {
        if (!cancelledRef.current) {
          const progress = Math.min(5 + Math.floor(text.length / 80), 90);
          setLoading(prev => ({ ...prev, stage: 'generating', receivedChars: text.length, progress }));
        }
      });
      if (!cancelledRef.current) {
        setLoading(prev => ({ ...prev, stage: 'parsing', progress: 95 }));
        setResult(data);
      }
    } catch (err: any) {
      if (!cancelledRef.current) {
        const msg = (err.message || "").toLowerCase();
        if (msg.includes('transient')) {
          setError("The server is temporarily busy. Please click 'Generate' again to retry.");
        } else if (msg.includes('quota') || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('rate limit')) {
          setError("API Quota or Rate Limit exceeded. Please try again later.");
        } else if (msg.includes('api key is missing')) {
          setError("API Key is missing. Please configure your API key in Settings.");
          setShowKeyModal(true);
        } else if (msg.includes('unauthorized') || msg.includes('api key invalid')) {
          setError("API Key is invalid or unauthorized. Please check your Settings.");
        } else if (msg.includes('insufficient balance') || msg.includes('402')) {
          setError("Account balance insufficient. Please recharge your API account or switch to a different provider.");
        } else {
          setError(err.message || "An unexpected error occurred.");
        }
      }
    } finally {
      clearInterval(timer);
      if (!cancelledRef.current) {
        setLoading({ stage: 'idle', elapsed: 0, receivedChars: 0, progress: 0 });
      }
    }
  };

  const handleImport = async (rawText: string) => {
    if (!aiConfig.apiKey) {
      setShowKeyModal(true);
      return;
    }
    cancelledRef.current = false;
    setLoading({ stage: 'connecting', elapsed: 0, receivedChars: 0, progress: 5 });
    setError(null);
    setCurrentDifficulty('medium');

    const timer = setInterval(() => {
      setLoading(prev => ({ ...prev, elapsed: prev.elapsed + 1 }));
    }, 1000);

    try {
      const data = await parseTestFromText(rawText, aiConfig, (text) => {
        if (!cancelledRef.current) {
          const progress = Math.min(5 + Math.floor(text.length / 80), 90);
          setLoading(prev => ({ ...prev, stage: 'generating', receivedChars: text.length, progress }));
        }
      });
      if (!cancelledRef.current) {
        setLoading(prev => ({ ...prev, stage: 'parsing', progress: 95 }));
        setResult(data);
      }
    } catch (err: any) {
      if (!cancelledRef.current) {
        const msg = (err.message || "").toLowerCase();
        if (msg.includes('quota') || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('rate limit')) {
          setError("API Quota or Rate Limit exceeded. Please try again later.");
        } else if (msg.includes('api key is missing')) {
          setError("API Key is missing. Please configure your API key in Settings.");
          setShowKeyModal(true);
        } else if (msg.includes('unauthorized') || msg.includes('api key invalid')) {
          setError("API Key is invalid or unauthorized. Please check your Settings.");
        } else if (msg.includes('insufficient balance') || msg.includes('402')) {
          setError("Account balance insufficient. Please recharge your API account or switch to a different provider.");
        } else {
          setError(err.message || "Failed to parse text. Please check your internet connection and try again.");
        }
      }
    } finally {
      clearInterval(timer);
      if (!cancelledRef.current) {
        setLoading({ stage: 'idle', elapsed: 0, receivedChars: 0, progress: 0 });
      }
    }
  };

  const handleManualCreate = (sections: QuestionType[]) => {
    setCurrentDifficulty('medium');
    setResult(createEmptyTest(sections));
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const persistVersions = (versions: SavedVersion[]) => {
    localStorage.setItem(SAVED_VERSIONS_KEY, JSON.stringify(versions));
    setSavedVersions(versions);
  };

  const handleSaveVersion = (name: string) => {
    if (!result) return;
    const newVersion: SavedVersion = {
      id: Date.now().toString(),
      name: name.trim() || `Test ${savedVersions.length + 1}`,
      result: JSON.parse(JSON.stringify(result)), // deep clone
      difficulty: currentDifficulty,
      createdAt: Date.now(),
    };
    persistVersions([newVersion, ...savedVersions]);
  };

  const handleLoadVersion = (version: SavedVersion) => {
    setResult(JSON.parse(JSON.stringify(version.result)));
    setCurrentDifficulty(version.difficulty);
    setError(null);
  };

  const handleDeleteVersion = (id: string) => {
    persistVersions(savedVersions.filter(v => v.id !== id));
  };

  const providerNeedsBaseUrl = draftConfig.provider === 'deepseek' || draftConfig.provider === 'openai' || draftConfig.provider === 'custom';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1121] flex flex-col transition-colors">
      {/* Settings Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-fade-in-up border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                <KeyRound size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-black dark:text-slate-100">AI Provider Settings</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Configure your API key and provider</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black dark:text-slate-300 mb-1">Provider</label>
                <select
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm bg-white dark:bg-[#0f172a] text-black dark:text-slate-100"
                  value={draftConfig.provider}
                  onChange={(e) => {
                    const provider = e.target.value as AIProvider;
                    const defaults = PROVIDER_DEFAULTS[provider];
                    // Load saved key for this provider if available
                    const rawKeys = localStorage.getItem('ai_keys');
                    let savedKey = '';
                    let savedBaseUrl = defaults.baseUrl;
                    let savedModel = defaults.model;
                    if (rawKeys) {
                      try {
                        const keys = JSON.parse(rawKeys);
                        if (keys[provider]?.apiKey) {
                          savedKey = keys[provider].apiKey;
                          savedBaseUrl = keys[provider].baseUrl || defaults.baseUrl;
                          savedModel = keys[provider].model || defaults.model;
                        }
                      } catch { /* ignore */ }
                    }
                    setDraftConfig(prev => ({
                      ...prev,
                      provider,
                      model: savedModel,
                      baseUrl: savedBaseUrl,
                      apiKey: savedKey,
                    }));
                  }}
                >
                  {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map(p => (
                    <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-slate-300 mb-1">API Key</label>
                <input
                  type="password"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-mono bg-white dark:bg-[#0f172a] text-black dark:text-slate-100"
                  placeholder={draftConfig.provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                  value={draftConfig.apiKey}
                  onChange={(e) => setDraftConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>

              {providerNeedsBaseUrl && (
                <div>
                  <label className="block text-sm font-medium text-black dark:text-slate-300 mb-1">Base URL</label>
                  <input
                    type="text"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-mono bg-white dark:bg-[#0f172a] text-black dark:text-slate-100"
                    placeholder="https://api.example.com/v1"
                    value={draftConfig.baseUrl}
                    onChange={(e) => setDraftConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                  />
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    {draftConfig.provider === 'deepseek' && 'Default: https://api.deepseek.com/v1'}
                    {draftConfig.provider === 'openai' && 'Default: https://api.openai.com/v1'}
                    {draftConfig.provider === 'custom' && 'Enter your API base URL'}
                  </p>
                </div>
              )}

              {draftConfig.provider === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-black dark:text-slate-300 mb-1">Model</label>
                  <input
                    type="text"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm bg-white dark:bg-[#0f172a] text-black dark:text-slate-100"
                    value={draftConfig.model}
                    onChange={(e) => setDraftConfig(prev => ({ ...prev, model: e.target.value }))}
                  />
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Your configuration is stored locally and is never sent to our servers.
                {draftConfig.provider === 'gemini' && (
                  <> Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a>.</>
                )}
                {draftConfig.provider === 'deepseek' && (
                  <> Get a key from <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">DeepSeek Platform</a>.</>
                )}
                {draftConfig.provider === 'openai' && (
                  <> Get a key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">OpenAI Platform</a>.</>
                )}
                {draftConfig.provider === 'kimi' && (
                  <> Get a key from <a href="https://platform.moonshot.cn/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Moonshot Platform</a>.</>
                )}
                {draftConfig.provider === 'kimi-code' && (
                  <> Get a key from <a href="https://kimi.com/code" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Kimi Code</a>.</>
                )}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              {aiConfig.apiKey && (
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-lg font-medium text-black dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={saveConfig}
                disabled={!draftConfig.apiKey.trim() || (providerNeedsBaseUrl && !draftConfig.baseUrl?.trim())}
                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-white transition-all ${
                  draftConfig.apiKey.trim() && (!providerNeedsBaseUrl || draftConfig.baseUrl?.trim())
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md'
                    : 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed'
                }`}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <GraduationCap size={24} />
            </div>
            <span className="font-bold text-xl text-black dark:text-slate-100 tracking-tight">
              VocabForge <span className="text-indigo-600">AI</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500 dark:text-slate-400">
            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-gray-600 dark:text-slate-300">
              {PROVIDER_LABELS[aiConfig.provider] || 'Not configured'}
            </span>
            {savedVersions.length > 0 && (
              <button
                onClick={() => document.getElementById('saved-versions')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
                title="Jump to saved tests"
              >
                <History size={16} />
                <span>Saved ({savedVersions.length})</span>
              </button>
            )}
            <button
              onClick={() => setIsDarkMode(prev => !prev)}
              className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
              title="Toggle dark mode"
            >
              {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
              <span>{isDarkMode ? 'Dark' : 'Light'}</span>
            </button>
            <button
              onClick={openSettings}
              className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
              title="Manage AI Settings"
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-3 max-w-4xl mx-auto animate-shake">
            <AlertCircle size={20} className="flex-shrink-0" />
            <div>
              <span className="font-bold">Generation Error:</span> {error}
            </div>
          </div>
        )}

        {!result ? (
          <div className="space-y-8 animate-fade-in-up">
            <div className="text-center space-y-3 max-w-2xl mx-auto mb-10">
              <h1 className="text-3xl md:text-4xl font-extrabold text-black dark:text-slate-100">
                Create Perfect Vocabulary Tests in Seconds
              </h1>
              <p className="text-lg text-gray-600 dark:text-slate-400">
                Generate A/B/C versions from a list, or simply paste an existing test to format it instantly.
              </p>
            </div>

            <InputSection
              aiConfig={aiConfig}
              onAiConfigChange={setAiConfig}
              onGenerate={handleGenerate}
              onImport={handleImport}
              onManualCreate={handleManualCreate}
              loading={loading}
              onCancel={handleCancel}
            />

            {savedVersions.length > 0 && (
              <div id="saved-versions" className="max-w-4xl mx-auto mt-12 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-4">
                  <History size={18} className="text-indigo-600" />
                  <h2 className="text-lg font-bold text-black dark:text-slate-100">Saved Tests</h2>
                  <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">{savedVersions.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {savedVersions.map((version) => (
                    <div
                      key={version.id}
                      className="group bg-white dark:bg-[#1e293b] rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer relative"
                      onClick={() => handleLoadVersion(version)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-black dark:text-slate-100 truncate pr-6">{version.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            {version.result.versions.length} version{version.result.versions.length !== 1 ? 's' : ''} · {version.result.wordList?.length || 0} words · {new Date(version.createdAt).toLocaleDateString()}
                          </p>
                          <span className="inline-block mt-2 text-[10px] uppercase tracking-wider font-bold bg-slate-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded">
                            {version.difficulty}
                          </span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteVersion(version.id); }}
                          className="absolute top-3 right-3 text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors p-1"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                        <FileText size={12} />
                        <span>Click to review & download</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16 text-center">
              <div className="p-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-3">
                  <BookOpen size={24} />
                </div>
                <h3 className="font-semibold text-black dark:text-slate-100">Contextual Learning</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Tests application, not just definition matching.</p>
              </div>
              <div className="p-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </div>
                <h3 className="font-semibold text-black dark:text-slate-100">Smart Rotation</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Automatically rotates words through different question types.</p>
              </div>
              <div className="p-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-3">
                  <FileText size={24} />
                </div>
                <h3 className="font-semibold text-black dark:text-slate-100">Format Existing</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Paste any text and instantly convert it to our professional PDF layout.</p>
              </div>
            </div>
          </div>
        ) : (
          <TestPreview data={result} onReset={handleReset} difficulty={currentDifficulty} onSave={handleSaveVersion} />
        )}
      </main>

      <footer className="bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-700 py-8 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 dark:text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} VocabForge AI.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
