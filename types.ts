
export enum QuestionType {
  FILL_IN_BLANK = 'fill-in-blank',
  SYNONYM_ANTONYM = 'synonym-antonym',
  REWRITE = 'rewrite',
  CONTEXTUAL = 'contextual',
  SCRAMBLED = 'scrambled',
  CREATIVE = 'creative'
}

export interface Question {
  id: number;
  type: QuestionType;
  text: string; // The main sentence or word
  targetWord: string; // The answer word
  clue?: string; // For Section 1: (definition)
  matchWord?: string; // For Section 2: The word to compare against
  correctAnswer: string; // The final answer (Word, 'S'/'A', rewritten sentence, or unscrambled sentence)
}

export interface TestSection {
  title: string;
  type: QuestionType;
  instructions: string;
  distractors?: string[]; // For Section 4 Word Bank
  questions: Question[];
}

export interface TestVersion {
  versionName: string; // "Version A"
  theme?: string;
  sections: TestSection[];
}

export interface TestGenerationResult {
  versions: TestVersion[];
  wordList: string[];
}

export type AIProvider = 'gemini' | 'deepseek' | 'openai' | 'kimi' | 'kimi-code' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export interface GenerationConfig {
  wordList: string[];
  difficulty: 'basic' | 'easy' | 'medium' | 'hard';
  versions: number;
  aiConfig: AIConfig;
  sections?: QuestionType[];
}

export const createEmptyTest = (selectedSections?: QuestionType[]): TestGenerationResult => {
  const createEmptyQuestions = (count: number, type: QuestionType): Question[] => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i + 1,
      type,
      text: "",
      targetWord: "",
      correctAnswer: "",
      clue: "",
      matchWord: ""
    }));
  };

  const allSections: TestSection[] = [
    {
      title: "Fill-in-the-Blank",
      type: QuestionType.FILL_IN_BLANK,
      instructions: "Read each sentence. Choose the best word to fill in the blank. The meaning in the brackets ( ) will help you.",
      questions: createEmptyQuestions(10, QuestionType.FILL_IN_BLANK)
    },
    {
      title: "Synonyms & Antonyms",
      type: QuestionType.SYNONYM_ANTONYM,
      instructions: "Decide if the word on the right is a Synonym (similar meaning) or an Antonym (opposite meaning) of the word on the left. Write A for Antonym or S for Synonym.",
      questions: createEmptyQuestions(10, QuestionType.SYNONYM_ANTONYM) // Increased to 10
    },
    {
      title: "Sentence Rewrite",
      type: QuestionType.REWRITE,
      instructions: "Rewrite each sentence using the word provided in the brackets. Keep the original meaning of the sentence.",
      questions: createEmptyQuestions(5, QuestionType.REWRITE)
    },
    {
      title: "Contextual Fill-in-the-Blank",
      type: QuestionType.CONTEXTUAL,
      instructions: "Choose the best word from the word bank below to complete each sentence. Use each word only once.",
      distractors: Array(10).fill(""),
      questions: createEmptyQuestions(10, QuestionType.CONTEXTUAL)
    },
    {
      title: "Scrambled Sentences",
      type: QuestionType.SCRAMBLED,
      instructions: "Read the context, then unscramble the words to form a grammatically correct response sentence.",
      questions: createEmptyQuestions(10, QuestionType.SCRAMBLED) // Increased to 10
    },
    {
      title: "Bonus Creative Writing",
      type: QuestionType.CREATIVE,
      instructions: "Use all FIVE of the words below to write a short, logical, and grammatically correct story.",
      questions: createEmptyQuestions(5, QuestionType.CREATIVE)
    }
  ];

  const sections = selectedSections && selectedSections.length > 0
    ? allSections.filter(s => selectedSections.includes(s.type))
    : allSections;

  return {
    wordList: [],
    versions: [
      {
        versionName: "Manual Version",
        theme: "Custom",
        sections: sections
      }
    ]
  };
};

// Provider-specific model lists
export const PROVIDER_MODELS: Record<AIProvider, { label: string; value: string }[]> = {
  gemini: [
    { label: 'Auto-detect', value: 'auto' },
  ],
  deepseek: [
    { label: 'DeepSeek V3 (Fast)', value: 'deepseek-chat' },
    { label: 'DeepSeek R1 (Slow Reasoning)', value: 'deepseek-reasoner' },
  ],
  openai: [
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  ],
  kimi: [
    { label: 'Moonshot v1 8k', value: 'moonshot-v1-8k' },
    { label: 'Moonshot v1 32k', value: 'moonshot-v1-32k' },
    { label: 'Moonshot v1 128k', value: 'moonshot-v1-128k' },
  ],
  'kimi-code': [
    { label: 'Moonshot v1 8k', value: 'moonshot-v1-8k' },
    { label: 'Moonshot v1 32k', value: 'moonshot-v1-32k' },
    { label: 'Moonshot v1 128k', value: 'moonshot-v1-128k' },
  ],
  custom: [
    { label: 'Custom Model', value: 'custom-model' },
  ],
};

export const PROVIDER_DEFAULTS: Record<AIProvider, { baseUrl: string; model: string }> = {
  gemini: { baseUrl: '', model: 'gemini-1.5-flash' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  kimi: { baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  'kimi-code': { baseUrl: 'https://api.kimi.com/coding/v1', model: 'moonshot-v1-8k' },
  custom: { baseUrl: '', model: 'custom-model' },
};
