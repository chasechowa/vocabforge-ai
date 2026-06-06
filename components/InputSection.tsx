
import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, PenTool, ClipboardPaste, ArrowRight, CheckSquare, Square, Save, Bookmark, Trash2, X } from 'lucide-react';
import { QuestionType, AIConfig } from '../types';

interface SavedWordList {
  id: string;
  name: string;
  words: string[];
  createdAt: number;
}

interface LoadingState {
  stage: 'idle' | 'connecting' | 'generating' | 'parsing';
  elapsed: number;
  receivedChars: number;
  progress: number;
}

interface InputSectionProps {
  aiConfig: AIConfig;
  onAiConfigChange: (cfg: AIConfig) => void;
  onGenerate: (words: string[], versions: number, difficulty: 'basic' | 'easy' | 'medium' | 'hard', sections?: QuestionType[]) => void;
  onImport: (rawText: string) => void;
  onManualCreate: (sections: QuestionType[]) => void;
  loading: LoadingState;
  onCancel: () => void;
}

const InputSection: React.FC<InputSectionProps> = ({ aiConfig, onAiConfigChange, onGenerate, onImport, onManualCreate, loading, onCancel }) => {
  const isBusy = loading.stage !== 'idle';
  const [mode, setMode] = useState<'generate' | 'import'>('generate');

  // Generate State
  const [textInput, setTextInput] = useState('');
  const [difficulty, setDifficulty] = useState<'basic' | 'easy' | 'medium' | 'hard'>('medium');
  const [versionCount, setVersionCount] = useState(2);

  const [selectedSections, setSelectedSections] = useState<QuestionType[]>([
    QuestionType.FILL_IN_BLANK,
    QuestionType.SYNONYM_ANTONYM,
    QuestionType.REWRITE,
    QuestionType.CONTEXTUAL,
    QuestionType.SCRAMBLED,
    QuestionType.CREATIVE
  ]);

  // Import State
  const [importText, setImportText] = useState('');

  // Saved word lists
  const [savedLists, setSavedLists] = useState<SavedWordList[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('saved_word_lists');
    if (raw) {
      try {
        setSavedLists(JSON.parse(raw));
      } catch { /* ignore */ }
    }
  }, []);

  const persistLists = (lists: SavedWordList[]) => {
    localStorage.setItem('saved_word_lists', JSON.stringify(lists));
    setSavedLists(lists);
  };

  const handleSaveList = () => {
    const words = textInput
      .split(/[\n,;]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
    if (words.length === 0) return;
    const name = saveName.trim() || `Word List ${savedLists.length + 1}`;
    const newList: SavedWordList = {
      id: Date.now().toString(),
      name,
      words,
      createdAt: Date.now(),
    };
    persistLists([newList, ...savedLists]);
    setSaveName('');
    setShowSaveModal(false);
  };

  const handleLoadList = (list: SavedWordList) => {
    setTextInput(list.words.join('\n'));
  };

  const handleDeleteList = (id: string) => {
    persistLists(savedLists.filter(l => l.id !== id));
  };

  const toggleSection = (type: QuestionType) => {
    setSelectedSections(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = () => {
    const words = textInput
      .split(/[\n,;]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);

    if (words.length < 5) {
      alert("Please enter at least 5 words to generate a meaningful test.");
      return;
    }

    if (words.length > 60) {
        alert("For optimal results, please limit lists to 60 words or fewer per batch.");
        return;
    }

    if (selectedSections.length === 0) {
        alert("Please select at least one section for the test.");
        return;
    }

    onGenerate(words, versionCount, difficulty, selectedSections);
  };

  const handleImport = () => {
      if (importText.trim().length < 10) {
          alert("Please paste the content of your test.");
          return;
      }
      onImport(importText);
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setMode('generate')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'generate' ? 'bg-slate-50 dark:bg-[#0f172a] text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 dark:text-slate-400 hover:text-black dark:hover:text-slate-200'}`}
          >
              <Sparkles size={18} />
              <span>Generate New</span>
          </button>
          <button
            onClick={() => setMode('import')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'import' ? 'bg-slate-50 dark:bg-[#0f172a] text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 dark:text-slate-400 hover:text-black dark:hover:text-slate-200'}`}
          >
              <ClipboardPaste size={18} />
              <span>Format Existing Test</span>
          </button>
      </div>

      <div className="p-6">
        {mode === 'generate' ? (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <label className="block text-sm font-medium text-black dark:text-slate-300 mb-2">
                        Target Word List
                    </label>
                    <textarea
                        className="w-full h-40 p-4 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm resize-none bg-white dark:bg-[#0f172a] text-black dark:text-slate-100"
                        placeholder="e.g. Benevolent, Cacophony, Ephemeral, Pragmatic, Nostalgic, Controversial, Detect..."
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        disabled={isBusy}
                    />
                    <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                            <span>Separate words by commas or new lines.</span>
                            <span className="mx-2">|</span>
                            <span>Max 60 words.</span>
                        </p>
                        <button
                            onClick={() => setShowSaveModal(true)}
                            disabled={!textInput.trim()}
                            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:text-gray-300 transition-colors"
                        >
                            <Save size={14} />
                            <span>Save List</span>
                        </button>
                    </div>

                    {savedLists.length > 0 && (
                        <div className="mt-3">
                            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                                <Bookmark size={12} />
                                Saved Lists
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {savedLists.map((list) => (
                                    <div
                                        key={list.id}
                                        className="group flex items-center gap-2 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all cursor-pointer"
                                        onClick={() => handleLoadList(list)}
                                        title="Click to load"
                                    >
                                        <span className="font-medium text-black dark:text-slate-300 truncate max-w-[120px]">{list.name}</span>
                                        <span className="text-gray-400 dark:text-slate-500">({list.words.length})</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                                            className="text-gray-400 dark:text-slate-600 hover:text-red-500 transition-colors ml-1"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {showSaveModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5 animate-fade-in-up border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-base font-bold text-black dark:text-slate-100">Save Word List</h3>
                                    <button onClick={() => setShowSaveModal(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
                                        <X size={18} />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm bg-white dark:bg-[#0f172a] text-black dark:text-slate-100"
                                    placeholder="Enter a name for this list..."
                                    value={saveName}
                                    onChange={(e) => setSaveName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveList(); }}
                                    autoFocus
                                />
                                <div className="mt-4 flex gap-3">
                                    <button
                                        onClick={() => setShowSaveModal(false)}
                                        className="flex-1 py-2 rounded-lg font-medium text-black dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveList}
                                        className="flex-1 py-2 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors text-sm"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-black dark:text-slate-300 mb-2">
                        Select Test Sections
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                            { id: QuestionType.FILL_IN_BLANK, label: 'Fill-in-the-Blank' },
                            { id: QuestionType.SYNONYM_ANTONYM, label: 'Synonyms & Antonyms' },
                            { id: QuestionType.REWRITE, label: 'Sentence Rewrite' },
                            { id: QuestionType.CONTEXTUAL, label: 'Word Bank' },
                            { id: QuestionType.SCRAMBLED, label: 'Scrambled Sentences' },
                            { id: QuestionType.CREATIVE, label: 'Creative Writing' }
                        ].map((section) => (
                            <button
                                key={section.id}
                                onClick={() => toggleSection(section.id)}
                                disabled={isBusy}
                                className={`flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                                    selectedSections.includes(section.id)
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-gray-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                            >
                                {selectedSections.includes(section.id) ? (
                                    <CheckSquare size={18} className="text-indigo-600 flex-shrink-0" />
                                ) : (
                                    <Square size={18} className="text-gray-400 flex-shrink-0" />
                                )}
                                <span className="truncate">{section.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-black dark:text-slate-300 mb-2">
                        Difficulty Level
                        </label>
                        <div className="flex gap-2">
                        {(['basic', 'easy', 'medium', 'hard'] as const).map((lvl) => (
                            <button
                            key={lvl}
                            onClick={() => setDifficulty(lvl)}
                            disabled={isBusy}
                            className={`flex-1 py-2 px-1 rounded-md text-xs font-medium capitalize transition-colors ${
                                difficulty === lvl
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                            }`}
                            >
                            {lvl}
                            </button>
                        ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-black dark:text-slate-300 mb-2">
                        Versions
                        </label>
                        <div className="flex gap-2">
                        {[1, 2, 3].map((num) => (
                            <button
                            key={num}
                            onClick={() => setVersionCount(num)}
                            disabled={isBusy}
                            className={`flex-1 py-2 px-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                                versionCount === num
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                            }`}
                            >
                            {num} {num === 1 ? 'Set' : 'Sets'}
                            </button>
                        ))}
                        </div>
                    </div>

                </div>

                <div className="pt-4 flex flex-col sm:flex-row justify-between gap-4">
                    <button
                        onClick={() => onManualCreate(selectedSections)}
                        disabled={isBusy}
                        className="flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-medium text-black bg-white border border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <PenTool size={18} />
                        <span>Skip AI & Build Manually</span>
                    </button>

                    {isBusy ? (
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-1.5 min-w-[260px]">
                                <div className="flex items-center gap-2 py-2 px-4 rounded-lg font-semibold text-white bg-indigo-500 shadow-lg">
                                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full flex-shrink-0" />
                                    <span className="text-sm">
                                        {loading.stage === 'connecting' && 'Connecting...'}
                                        {loading.stage === 'generating' && `Generating... (${loading.elapsed}s)`}
                                        {loading.stage === 'parsing' && 'Parsing...'}
                                    </span>
                                    {loading.receivedChars > 0 && (
                                        <span className="text-xs opacity-75">({loading.receivedChars.toLocaleString()} chars)</span>
                                    )}
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${loading.progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-400 px-1">
                                    <span>{loading.progress}%</span>
                                    <span>{loading.stage === 'parsing' ? 'Finalizing...' : 'AI is writing...'}</span>
                                </div>
                            </div>
                            <button
                                onClick={onCancel}
                                className="text-sm font-medium text-red-500 hover:text-red-600 px-2 self-start mt-2"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleGenerate}
                            disabled={!textInput.trim()}
                            className={`flex items-center justify-center gap-2 py-3 px-8 rounded-lg font-semibold text-white shadow-lg transition-all transform active:scale-95 ${
                                !textInput.trim()
                                    ? 'bg-slate-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'
                            }`}
                        >
                            <Sparkles size={20} />
                            <span>Generate Test</span>
                        </button>
                    )}
                </div>
            </div>
        ) : (
            <div className="space-y-6 animate-fade-in">
                 <div>
                    <label className="block text-sm font-medium text-black dark:text-slate-300 mb-2">
                        Paste Existing Test Content
                    </label>
                    <textarea
                        className="w-full h-80 p-4 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm resize-none bg-white dark:bg-[#0f172a] text-black dark:text-slate-100"
                        placeholder={`Paste your entire test here.

Tip: For best results, include answers in brackets so the AI can format them correctly.
Example: "1. The sky is _____ (blue)." will be formatted as "The sky is b______."`}
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        disabled={isBusy}
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                        The AI will reconstruct your sentences to match our standardized layout exactly.
                    </p>
                </div>

                 <div className="flex justify-end gap-4">
                    {isBusy ? (
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-1.5 min-w-[260px]">
                                <div className="flex items-center gap-2 py-2 px-4 rounded-lg font-semibold text-white bg-indigo-500 shadow-lg">
                                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full flex-shrink-0" />
                                    <span className="text-sm">
                                        {loading.stage === 'connecting' && 'Connecting...'}
                                        {loading.stage === 'generating' && `Formatting... (${loading.elapsed}s)`}
                                        {loading.stage === 'parsing' && 'Parsing...'}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${loading.progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-400 px-1">
                                    <span>{loading.progress}%</span>
                                    <span>{loading.stage === 'parsing' ? 'Finalizing...' : 'AI is writing...'}</span>
                                </div>
                            </div>
                            <button
                                onClick={onCancel}
                                className="text-sm font-medium text-red-500 hover:text-red-600 px-2 self-start mt-2"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleImport}
                            disabled={!importText.trim()}
                            className={`flex items-center justify-center gap-2 py-3 px-8 rounded-lg font-semibold text-white shadow-lg transition-all transform active:scale-95 ${
                                !importText.trim()
                                    ? 'bg-slate-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'
                            }`}
                        >
                            <span>Format & Preview</span>
                            <ArrowRight size={20} />
                        </button>
                    )}
                 </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default InputSection;
