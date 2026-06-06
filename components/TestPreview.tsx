
import React, { useState, useEffect, useRef } from 'react';
import { TestGenerationResult, QuestionType } from '../types';
import { Download, CheckCircle2, FileText, ArrowLeft, Wand2, LayoutList, Eye, EyeOff, Save, X } from 'lucide-react';
import { generatePDF } from '../services/pdfService';

interface TestPreviewProps {
  data: TestGenerationResult;
  onReset: () => void;
  difficulty: string;
  onSave?: (name: string) => void;
}

const TestPreview: React.FC<TestPreviewProps> = ({ data, onReset, difficulty, onSave }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [editableVersions, setEditableVersions] = useState(data.versions);
  const [footerText, setFooterText] = useState("");
  const [quickFillVisible, setQuickFillVisible] = useState<number | null>(null);
  const [quickFillText, setQuickFillText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testTitle, setTestTitle] = useState("VOCABULARY TEST");
  const [difficultyText, setDifficultyText] = useState("");
  const [orgName, setOrgName] = useState("OTIA");

  // New state for hidden sections
  const [hiddenSections, setHiddenSections] = useState<Set<number>>(new Set());

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  const editorRef = useRef<HTMLDivElement>(null);

  const activeVersion = editableVersions[activeTab];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
          setEditingId(null);
      } else {
          const target = event.target as HTMLElement;
          if (!target.closest('.question-row') && !target.closest('.edit-box')) {
              setEditingId(null);
          }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateQuestion = (sectionIndex: number, questionIndex: number, field: string, value: string) => {
    const newVersions = [...editableVersions];
    const currentVersion = newVersions[activeTab];
    // @ts-ignore
    currentVersion.sections[sectionIndex].questions[questionIndex][field] = value;
    setEditableVersions(newVersions);
  };

  const updateSectionMeta = (sectionIndex: number, field: 'title' | 'instructions', value: string) => {
      const newVersions = [...editableVersions];
      newVersions[activeTab].sections[sectionIndex][field] = value;
      setEditableVersions(newVersions);
  };

  const updateDistractors = (sectionIndex: number, newDistractors: string[]) => {
      const newVersions = [...editableVersions];
      newVersions[activeTab].sections[sectionIndex].distractors = newDistractors;
      setEditableVersions(newVersions);
  }

  const updateCreativeWords = (sectionIndex: number, newWords: string[]) => {
      const newVersions = [...editableVersions];
      const section = newVersions[activeTab].sections[sectionIndex];
      section.questions = newWords.map((word, idx) => ({
          id: idx + 1,
          type: QuestionType.CREATIVE,
          text: "",
          targetWord: word, 
          correctAnswer: ""
      }));
      setEditableVersions(newVersions);
  }

  const handleQuickFill = (sectionIndex: number) => {
      const lines = quickFillText.split('\n').filter(l => l.trim().length > 0);
      const newVersions = [...editableVersions];
      const section = newVersions[activeTab].sections[sectionIndex];
      lines.forEach((line, idx) => {
          if (idx < section.questions.length) {
              section.questions[idx].text = line.trim();
          }
      });
      setEditableVersions(newVersions);
      setQuickFillVisible(null);
      setQuickFillText("");
  };

  const handleDownload = (includeKey: boolean) => {
    // Filter out hidden sections for the PDF generation
    const visibleSections = activeVersion.sections.filter((_, idx) => !hiddenSections.has(idx));
    const versionToPrint = { ...activeVersion, sections: visibleSections };
    
    generatePDF(versionToPrint, includeKey, footerText, testTitle, difficultyText, difficulty, orgName);
  };

  const toggleSectionVisibility = (index: number) => {
      const next = new Set(hiddenSections);
      if (next.has(index)) {
          next.delete(index);
      } else {
          next.add(index);
      }
      setHiddenSections(next);
  };

  const QuickFillModal = ({ sectionIndex }: { sectionIndex: number }) => (
      <div className="mb-4 p-5 bg-white dark:bg-[#1e293b] rounded-xl border-4 border-slate-900 dark:border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-fade-in z-30 relative edit-box text-slate-900 dark:text-slate-100">
          <h5 className="text-base font-black mb-3 flex items-center gap-2 uppercase tracking-tight">
              <Wand2 size={18} className="text-indigo-600 dark:text-indigo-400" /> Quick Fill Questions
          </h5>
          <textarea
              className="w-full p-3 border-2 border-slate-900 dark:border-slate-600 rounded-lg text-sm h-32 mb-3 focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 font-bold placeholder-slate-400 dark:placeholder-slate-500"
              value={quickFillText}
              placeholder="Paste one sentence per line..."
              onChange={(e) => setQuickFillText(e.target.value)}
          />
          <div className="flex justify-end gap-3">
              <button onClick={() => setQuickFillVisible(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-bold transition-colors">Cancel</button>
              <button onClick={() => handleQuickFill(sectionIndex)} className="px-6 py-2 text-sm bg-slate-900 dark:bg-indigo-600 text-white rounded-lg hover:bg-black dark:hover:bg-indigo-700 font-black transition-all shadow-md">AUTO-FILL NOW</button>
          </div>
      </div>
  );

  const renderBlankedText = (text: string, targetWord: string, isSection1: boolean = false) => {
      if (!targetWord) return text;
      const regex = new RegExp(`\\b${targetWord}\\b`, 'gi');
      const parts = text.split(regex);
      if (parts.length === 1) return text;
      return (
          <span>
              {parts.map((part, i) => (
                  <React.Fragment key={i}>
                      {part}
                      {i < parts.length - 1 && (
                          <span className="inline-flex items-baseline">
                              {isSection1 && <span className="font-bold mr-0.5">{targetWord.charAt(0)}</span>}
                              <span className="inline-block border-b-2 border-slate-800 w-40 mx-1"></span>
                          </span>
                      )}
                  </React.Fragment>
              ))}
          </span>
      );
  };

  const cleanTitle = (title: string) => {
      return title
        .replace(/^section\s+\d+[:\.]?\s*/i, "")
        .replace(/^section\s+[a-z]+[:\.]?\s*/i, "")
        .trim();
  };

  const handleRowClick = (sIdx: number, qIdx: number) => {
      setEditingId(`${sIdx}-${qIdx}`);
  };

  const renderSectionContent = (section: any, sectionIndex: number) => {
    switch (section.type) {
        case QuestionType.FILL_IN_BLANK:
            return (
                <div className="space-y-3 font-serif">
                    {quickFillVisible === sectionIndex && <QuickFillModal sectionIndex={sectionIndex} />}
                    {section.questions.map((q: any, i: number) => {
                         const isEditing = editingId === `${sectionIndex}-${i}`;
                         return (
                         <div key={i} className={`flex gap-2 items-start relative p-1 rounded cursor-pointer transition-colors question-row ${isEditing ? 'bg-indigo-50 dark:bg-indigo-900/20 shadow-inner' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`} onClick={() => handleRowClick(sectionIndex, i)}>
                            <span className="font-bold text-slate-900 mt-1">{i + 1}.</span>
                            <div className="w-full">
                                <div className="text-slate-900 text-sm leading-6 pointer-events-none">
                                    {renderBlankedText(q.text, q.targetWord, true)}
                                    {q.clue && <span className="text-slate-600 italic ml-2">({q.clue})</span>}
                                </div>
                                {isEditing && (
                                    <div className="flex flex-col gap-3 mt-2 p-5 bg-white dark:bg-[#1e293b] border-4 border-slate-900 dark:border-slate-700 rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] z-20 w-full edit-box animate-fade-in text-slate-900 dark:text-slate-100">
                                        <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest flex justify-between">
                                            <span>Question Text</span>
                                            <span className="text-indigo-600 dark:text-indigo-400 font-black">EDITING ITEM</span>
                                        </div>
                                        <input value={q.text} onChange={(e) => updateQuestion(sectionIndex, i, 'text', e.target.value)} className="text-base font-black p-3 border-2 border-slate-900 dark:border-slate-600 rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" placeholder="Full Sentence" />
                                        <div className="flex gap-4">
                                            <div className="w-1/3">
                                                <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Answer Word</div>
                                                <input value={q.targetWord} onChange={(e) => updateQuestion(sectionIndex, i, 'targetWord', e.target.value)} className="w-full text-sm font-black p-3 border-2 border-slate-900 dark:border-slate-600 rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" placeholder="Word" />
                                            </div>
                                            <div className="w-2/3">
                                                <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Clue/Hint</div>
                                                <input value={q.clue} onChange={(e) => updateQuestion(sectionIndex, i, 'clue', e.target.value)} className="w-full text-sm font-black p-3 border-2 border-slate-900 dark:border-slate-600 rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" placeholder="Hint clue" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            );

        case QuestionType.SYNONYM_ANTONYM:
            return (
                <div className="border border-slate-800 mt-4">
                    <div className="grid grid-cols-12 bg-slate-100 dark:bg-slate-800 border-b border-slate-800 dark:border-slate-600 text-xs font-bold uppercase p-2">
                        <div className="col-span-1">No.</div>
                        <div className="col-span-4">Word</div>
                        <div className="col-span-4">Synonym/Antonym</div>
                        <div className="col-span-3">Answer</div>
                    </div>
                    {section.questions.map((q: any, i: number) => {
                        const isEditing = editingId === `${sectionIndex}-${i}`;
                        return (
                        <div key={i} className={`grid grid-cols-12 border-b border-slate-300 dark:border-slate-700 last:border-0 p-2 text-sm font-serif items-center relative cursor-pointer question-row ${isEditing ? 'bg-indigo-50 dark:bg-indigo-900/20 shadow-inner' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`} onClick={() => handleRowClick(sectionIndex, i)}>
                            <div className="col-span-1 font-bold">{i + 1}.</div>
                            <div className="col-span-4">{q.targetWord}</div>
                            <div className="col-span-4">{q.matchWord}</div>
                            <div className="col-span-3 border-b border-slate-400 h-5 w-32"></div>
                            {isEditing && (
                                <div className="flex gap-3 absolute left-0 top-0 w-full h-full bg-white dark:bg-[#1e293b] border-4 border-slate-900 dark:border-slate-700 items-center px-4 z-20 edit-box shadow-2xl text-slate-900 dark:text-slate-100">
                                    <input value={q.targetWord} onChange={(e) => updateQuestion(sectionIndex, i, 'targetWord', e.target.value)} className="text-sm font-black border-2 border-slate-900 dark:border-slate-600 p-2 w-1/3 rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" />
                                    <input value={q.matchWord} onChange={(e) => updateQuestion(sectionIndex, i, 'matchWord', e.target.value)} className="text-sm font-black border-2 border-slate-900 dark:border-slate-600 p-2 w-1/3 rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" />
                                    <select value={q.correctAnswer} onChange={(e) => updateQuestion(sectionIndex, i, 'correctAnswer', e.target.value)} className="text-sm font-black border-2 border-slate-900 dark:border-slate-600 p-2 rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100">
                                        <option value="S">S (Synonym)</option><option value="A">A (Antonym)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            );

        case QuestionType.REWRITE:
            return (
                <div className="space-y-4 font-serif mt-2">
                     {section.questions.map((q: any, i: number) => {
                        const isEditing = editingId === `${sectionIndex}-${i}`;
                        return (
                        <div key={i} className={`relative p-2 rounded cursor-pointer transition-colors question-row ${isEditing ? 'bg-indigo-50 dark:bg-indigo-900/20 shadow-inner' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`} onClick={() => handleRowClick(sectionIndex, i)}>
                             <div className="flex gap-2 items-baseline text-slate-900 text-sm">
                                <span className="font-bold">{i + 1}.</span>
                                <span>{q.text}</span>
                                <span className="font-bold">({q.targetWord})</span>
                            </div>
                            <div className="border-b border-slate-400 h-6 w-full mt-4"></div>
                            {isEditing && (
                                <div className="flex flex-col gap-3 mt-2 absolute top-0 right-0 bg-white dark:bg-[#1e293b] border-4 border-slate-900 dark:border-slate-700 shadow-2xl p-5 z-20 rounded-xl edit-box text-slate-900 dark:text-slate-100 w-96">
                                    <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Original Sentence</div>
                                    <input value={q.text} onChange={(e) => updateQuestion(sectionIndex, i, 'text', e.target.value)} className="text-sm font-black border-2 border-slate-900 dark:border-slate-600 p-3 w-full rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" placeholder="Sentence" />
                                    <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mt-1">Substitution Word</div>
                                    <input value={q.targetWord} onChange={(e) => updateQuestion(sectionIndex, i, 'targetWord', e.target.value)} className="text-sm font-black border-2 border-slate-900 dark:border-slate-600 p-3 w-full rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" placeholder="Word" />
                                </div>
                            )}
                        </div>
                     )})}
                </div>
            );
        
        case QuestionType.CONTEXTUAL:
            return (
                <div className="font-serif mt-2">
                    <div className="border border-slate-600 p-4 mb-6 relative group/bank">
                        <h4 className="absolute -top-2.5 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Word Bank</h4>
                        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                            {(section.distractors || []).map((word: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 border border-slate-800"></div>
                                    <span>{word}</span>
                                </div>
                            ))}
                        </div>
                        <div className="hidden group-hover/bank:block absolute top-0 right-0 bg-white dark:bg-[#1e293b] border-4 border-slate-900 dark:border-slate-700 p-5 z-20 shadow-2xl w-96 edit-box text-slate-900 dark:text-slate-100">
                            <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Edit Word Bank</div>
                            <textarea value={section.distractors?.join(", ") || ""} onChange={(e) => updateDistractors(sectionIndex, e.target.value.split(",").map(s => s.trim()))} className="w-full text-sm font-black border-2 border-slate-900 dark:border-slate-600 p-3 h-24 rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        {section.questions.map((q: any, i: number) => {
                             const isEditing = editingId === `${sectionIndex}-${i}`;
                             return (
                             <div key={i} className={`flex gap-2 items-start relative p-1 rounded cursor-pointer transition-colors question-row ${isEditing ? 'bg-indigo-50 dark:bg-indigo-900/20 shadow-inner' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`} onClick={() => handleRowClick(sectionIndex, i)}>
                                <span className="font-bold text-slate-900 dark:text-slate-100 mt-1">{i + 1}.</span>
                                <div className="w-full">
                                    <div className="text-slate-900 dark:text-slate-100 text-sm leading-6">{renderBlankedText(q.text, q.targetWord)}</div>
                                </div>
                                {isEditing && (
                                    <div className="flex flex-col gap-3 absolute top-0 right-0 z-20 bg-white dark:bg-[#1e293b] border-4 border-slate-900 dark:border-slate-700 shadow-2xl p-5 rounded-xl edit-box text-slate-900 dark:text-slate-100 w-96">
                                         <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Sentence Content</div>
                                         <input value={q.text} onChange={(e) => updateQuestion(sectionIndex, i, 'text', e.target.value)} className="text-sm font-black border-2 border-slate-900 dark:border-slate-600 p-3 w-full rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" />
                                         <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mt-1">Target Answer</div>
                                         <input value={q.targetWord} onChange={(e) => updateQuestion(sectionIndex, i, 'targetWord', e.target.value)} className="text-sm font-black border-2 border-slate-900 dark:border-slate-600 p-3 w-full rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" />
                                    </div>
                                )}
                            </div>
                        )})}
                    </div>
                </div>
            );

        case QuestionType.SCRAMBLED:
            return (
                <div className="space-y-4 font-serif mt-2">
                    {section.questions.map((q: any, i: number) => {
                        const isEditing = editingId === `${sectionIndex}-${i}`;
                        const parts = q.text?.split(' | ') || [q.text || ''];
                        const hasContext = parts.length >= 2;
                        const contextCue = hasContext ? parts[0] : '';
                        const scrambledText = hasContext ? parts.slice(1).join(' | ') : q.text;
                        return (
                            <div key={i} className={`relative p-2 rounded cursor-pointer transition-colors question-row ${isEditing ? 'bg-indigo-50 dark:bg-indigo-900/20 shadow-inner' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`} onClick={() => handleRowClick(sectionIndex, i)}>
                                <div className="flex gap-2 items-start text-slate-900 text-sm">
                                    <span className="font-bold mt-1">{i + 1}.</span>
                                    <div className="flex-1">
                                        {hasContext && (
                                            <div className="text-slate-500 italic mb-1 text-xs">{contextCue}</div>
                                        )}
                                        <div className="leading-6">{scrambledText}</div>
                                    </div>
                                </div>
                                <div className="border-b border-slate-400 h-6 w-full mt-4"></div>
                                {isEditing && (
                                    <div className="flex flex-col gap-4 mt-2 p-5 bg-white dark:bg-[#1e293b] border-4 border-slate-900 dark:border-slate-700 rounded-xl shadow-2xl z-20 w-full edit-box animate-fade-in text-slate-900 dark:text-slate-100">
                                        <div>
                                            <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Context Cue (Optional)</div>
                                            <input value={contextCue} onChange={(e) => updateQuestion(sectionIndex, i, 'text', e.target.value + ' | ' + scrambledText)} className="w-full text-sm font-black p-3 border-2 border-slate-900 dark:border-slate-600 rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" placeholder="e.g. Where did you buy that backpack?" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Scrambled Words</div>
                                                <input value={scrambledText} onChange={(e) => updateQuestion(sectionIndex, i, 'text', (contextCue ? contextCue + ' | ' : '') + e.target.value)} className="w-full text-sm font-black p-3 border-2 border-slate-900 dark:border-slate-600 rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" placeholder="e.g. blue / the / is / sky" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Target Word</div>
                                                <input value={q.targetWord} onChange={(e) => updateQuestion(sectionIndex, i, 'targetWord', e.target.value)} className="w-full text-sm font-black p-3 border-2 border-slate-900 dark:border-slate-600 rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" placeholder="Target Word" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Solved Sentence Key</div>
                                            <input value={q.correctAnswer} onChange={(e) => updateQuestion(sectionIndex, i, 'correctAnswer', e.target.value)} className="w-full text-sm font-black p-3 border-2 border-slate-900 dark:border-slate-600 rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" placeholder="Correct sentence" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            );

        case QuestionType.CREATIVE:
             return (
                 <div className="mt-4 font-serif relative group/creative">
                     <div className="flex flex-wrap gap-4 mb-4">
                        <span className="font-bold text-sm">Words:</span>
                        {section.questions.map((q: any, i: number) => (
                             <span key={i} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-sm border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">{q.targetWord}</span>
                        ))}
                     </div>
                     <div className="hidden group-hover/creative:block absolute top-0 right-0 bg-white dark:bg-[#1e293b] border-4 border-slate-900 dark:border-slate-700 p-5 z-30 shadow-2xl w-96 edit-box text-slate-900 dark:text-slate-100">
                        <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Prompt Words</div>
                        <textarea value={section.questions.map((q: any) => q.targetWord).join(", ")} onChange={(e) => updateCreativeWords(sectionIndex, e.target.value.split(","))} className="w-full text-sm font-black border-2 border-slate-900 dark:border-slate-600 p-3 h-24 rounded-lg focus:border-indigo-600 dark:focus:border-indigo-500 outline-none bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100" />
                     </div>
                     <div className="space-y-8 mt-6">
                        <div className="text-sm font-bold underline">Your Story:</div>
                        {[1,2,3,4,5,6,7,8].map(line => <div key={line} className="border-b border-slate-300 h-1"></div>)}
                     </div>
                 </div>
             )

        default:
            return null;
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
      <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-20 z-20 transition-colors">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={onReset} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={20} /></button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2 overflow-x-auto">
            {editableVersions.map((v, idx) => (
                <button key={idx} onClick={() => setActiveTab(idx)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === idx ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>{v.versionName}</button>
            ))}
            </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           {onSave && (
             <button onClick={() => setShowSaveModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-indigo-600 rounded-lg text-sm font-medium transition-colors hover:bg-indigo-50"><Save size={16} /> Save</button>
           )}
           <button onClick={() => handleDownload(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"><CheckCircle2 size={16} /> Key PDF</button>
          <button onClick={() => handleDownload(false)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm hover:bg-indigo-700"><Download size={16} /> Download PDF</button>
        </div>
      </div>

      {/* Save Version Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5 animate-fade-in-up border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Save Test Version</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100"
              placeholder="Enter a name for this test..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { onSave?.(saveName); setShowSaveModal(false); setSaveName(''); } }}
              autoFocus
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => { onSave?.(saveName); setShowSaveModal(false); setSaveName(''); }}
                className="flex-1 py-2 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors text-sm"
              >
                Save Version
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 justify-center bg-slate-100 dark:bg-[#0b1121] py-8 min-h-screen px-4 transition-colors">

        {/* Section Visibility Controls Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-40 h-fit space-y-4 order-1 lg:order-none">
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-colors">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                    <LayoutList size={16} /> Sections
                </h3>
                <div className="space-y-2">
                    {activeVersion.sections.map((sec, idx) => (
                        <button
                            key={idx}
                            onClick={() => toggleSectionVisibility(idx)}
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all border ${
                                hiddenSections.has(idx)
                                ? 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                                : 'bg-white text-indigo-700 border-indigo-100 shadow-sm hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                        >
                            <span className="truncate mr-2 text-left">{cleanTitle(sec.title)}</span>
                            {hiddenSections.has(idx) ? <EyeOff size={14} className="flex-shrink-0"/> : <Eye size={14} className="flex-shrink-0"/>}
                        </button>
                    ))}
                </div>
                <div className="mt-3 bg-indigo-50 text-indigo-900 p-2 rounded text-[10px] leading-relaxed border border-indigo-100">
                    <strong>Tip:</strong> Hidden sections are excluded from the PDF. Section numbers update automatically.
                </div>
            </div>
        </div>

        <div ref={editorRef} className="bg-white shadow-xl w-full max-w-[210mm] min-h-[297mm] p-[15mm] md:p-[20mm] relative text-black order-2 lg:order-none">
            <div className="absolute top-[15mm] left-[20mm]">
                <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="text-4xl font-bold text-slate-900 tracking-wider bg-transparent border-none outline-none hover:bg-slate-50 focus:bg-white rounded w-48" />
            </div>
            <div className="absolute top-[15mm] right-[20mm] w-32">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Difficulty</div>
                <input value={difficultyText} onChange={(e) => setDifficultyText(e.target.value)} placeholder="e.g. Basic / A1" className="w-full text-sm border-b border-slate-300 outline-none text-right bg-transparent focus:border-indigo-500" />
            </div>
             <div className="text-center mt-2 mb-8 px-12">
                <input value={testTitle} onChange={(e) => setTestTitle(e.target.value)} className="text-2xl font-bold tracking-widest text-slate-900 uppercase text-center w-full bg-transparent border-none outline-none hover:bg-slate-50 focus:bg-white rounded" />
             </div>
            <div className="mb-8 text-center">
                <h2 className="text-base font-bold text-slate-900 mb-2">Instructions</h2>
                <p className="text-xs text-slate-600 mb-6 max-w-lg mx-auto leading-relaxed">This test has six sections. It is designed to check how well you understand and can use these words. Read the instructions for each section carefully. GOOD LUCK!</p>
                <div className="flex flex-col items-center gap-1 text-sm mt-4">
                    <div className="font-bold text-lg mb-2">{activeVersion.versionName}</div>
                    <div className="flex gap-8 justify-center w-full text-xs sm:text-sm">
                        <span>Name: _________________</span>
                        <span>Date: ___________</span>
                        <span>Score: ______</span>
                    </div>
                </div>
            </div>
            <div className="space-y-8">
            {(() => {
                let displayIndex = 0;
                return activeVersion.sections.map((section, sIdx) => {
                    if (hiddenSections.has(sIdx)) return null;
                    displayIndex++;
                    return (
                        <div key={sIdx} className="relative group/section">
                            <div className="mb-4">
                                <div className="bg-slate-800 text-white rounded-md py-1 px-4 mb-2 flex items-center justify-center gap-2">
                                    <h3 className="text-sm font-bold uppercase tracking-widest">Section {displayIndex}:</h3>
                                    <input value={cleanTitle(section.title)} onChange={(e) => updateSectionMeta(sIdx, 'title', e.target.value)} className="font-bold uppercase text-sm bg-transparent border-none outline-none text-center w-auto text-white" />
                                </div>
                                <div className="text-slate-600 italic text-[11px] w-full text-center">{section.instructions}</div>
                            </div>
                            <div>{renderSectionContent(section, sIdx)}</div>
                        </div>
                    );
                });
            })()}
            </div>
            <div className="mt-16 pt-6 border-t border-slate-200">
                <div className="w-64 h-20 border border-slate-400 p-2 relative">
                    <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-slate-500 uppercase tracking-widest">Teacher / Notes</label>
                    <textarea value={footerText} onChange={(e) => setFooterText(e.target.value)} className="w-full h-full outline-none text-sm text-slate-700 resize-none bg-transparent" />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TestPreview;
