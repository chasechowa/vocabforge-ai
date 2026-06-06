
import { GenerationConfig, TestGenerationResult, AIConfig, AIProvider } from "../types";

// Detect if we're in Electron with IPC proxy available
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI?.invokeApiCall;

async function proxyFetch(url: string, options?: RequestInit): Promise<Response> {
  if (isElectron) {
    const result = await (window as any).electronAPI.invokeApiCall(url, options);
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
    });
  }
  return fetch(url, options);
}

/**
 * Retrieves AI config from localStorage.
 */
function getStoredConfig(): AIConfig {
  const raw = localStorage.getItem('ai_config');
  if (!raw) {
    throw new Error("AI configuration is missing. Please set your API key and provider in Settings.");
  }
  try {
    const config: AIConfig = JSON.parse(raw);
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new Error("API Key is missing. Please set your API key in Settings.");
    }
    return config;
  } catch {
    throw new Error("Invalid AI configuration. Please reconfigure in Settings.");
  }
}

/**
 * Executes a function with exponential backoff retry.
 * Skips retry for non-recoverable errors.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error.toString().toLowerCase() + (error.message || '').toLowerCase();
    if (
        errorMsg.includes('quota') ||
        errorMsg.includes('429') ||
        errorMsg.includes('resource_exhausted') ||
        errorMsg.includes('rate limit') ||
        errorMsg.includes('insufficient balance') ||
        errorMsg.includes('402') ||
        errorMsg.includes('payment required') ||
        errorMsg.includes('api key invalid') ||
        errorMsg.includes('unauthorized') ||
        errorMsg.includes('model not found') ||
        errorMsg.includes('not found')
    ) {
        throw error;
    }
    if (retries <= 0) throw error;
    console.warn(`Attempt failed (${retries} retries left). Retrying in ${delay}ms...`, error.message);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

// ==================== Prompt Builders ====================

function buildDifficultyInstructions(difficulty: string): { diff: string; contextual: string; scrambled: string } {
  let difficultyInstruction = "";
  let contextualRule = "";
  let scrambledRule = "";

  switch (difficulty) {
    case 'basic':
      difficultyInstruction = `
      CRITICAL FOR BASIC MODE:
      - Target Audience: Beginner English learners (ESL A1/A2).
      - Definitions: Use full-sentence definitions in the style of Collins COBUILD dictionary.
      - CRITICAL: The definition MUST NOT contain the target word itself. Describe it using simple words.
      - Sentences: Use very simple, direct subject-verb-object structures. Everyday vocabulary ONLY.
      - AUTHENTICITY: Sentences must sound like something a native English speaker (age 10) would actually say or write. NO translation-style English. NO awkward phrasing.
      - VOCABULARY CONTROL: Apart from the target word, every other word must be CEFR A1/A2 level (e.g., happy, school, food, run, big). Do NOT use rare or formal words.
      - EXAMPLE GOOD SENTENCES for Basic: "She felt happy when she got a new book.", "The dog ran fast in the park.", "We eat food at school every day."
      `;
      contextualRule = `- CRITICAL LEVEL RULE: Sentences MUST be very simple and easy to understand (ESL A1/A2 level). Use everyday situations (e.g., school, home, shopping).
      - AUTHENTICITY RULE: Sentences must sound natural and native. NO awkward or overly formal language.
      - VOCABULARY CONTROL: All words except the target word must be at or below CEFR A1/A2.`;
      scrambledRule = `- CRITICAL LEVEL RULE: Responses MUST be very simple and direct (ESL A1/A2 level). Use basic vocabulary and everyday contexts.
      - AUTHENTICITY RULE: Must sound like natural spoken English, not textbook exercises.
      - CONTEXT FORMAT: Use simple everyday questions like "Where is your bag?" with short replies.
      - EXAMPLE GOOD: Context: "Do you like this school?" | Scrambled: "yes / I / it / like / very / much"
        Correct Answer: "I like it very much."`;
      break;
    case 'easy':
      difficultyInstruction = `
      CRITICAL FOR EASY MODE:
      - Target Audience: Intermediate learners (Middle School / ESL B1).
      - Sentences: Use simple and compound sentences. Contexts should be relatable and everyday (e.g., hobbies, daily life, simple stories).
      - AUTHENTICITY: Sentences must read like real English from a magazine or blog for teenagers. NO stiff, textbook-style language.
      - VOCABULARY CONTROL: Apart from the target word, all other words must be at or below CEFR B1 level. Do NOT use GRE/SAT vocabulary.
      - EXAMPLE GOOD SENTENCES for Easy: "After a long day, she finally decided to relax at home.", "The team worked together to finish the project on time.", "He enjoys reading books about ancient history."
      `;
      contextualRule = `- CRITICAL LEVEL RULE: Sentences MUST be at an intermediate level (ESL B1). Use clear, relatable contexts without overly complex grammar.
      - AUTHENTICITY RULE: Sentences should sound like something you'd read in a general-interest blog or hear in a podcast.
      - VOCABULARY CONTROL: All non-target words at or below CEFR B1.`;
      scrambledRule = `- CRITICAL LEVEL RULE: Responses MUST be at an intermediate level (ESL B1). Focus on clear, everyday conversational responses.
      - AUTHENTICITY RULE: Must sound natural and conversational, like a dialogue between two friends or classmates.
      - CONTEXT FORMAT: Use relatable everyday questions with compound-sentence replies.
      - EXAMPLE GOOD: Context: "What did you think of the movie?" | Scrambled: "the / plot / was / exciting / but / ending / the / predictable / too"
        Correct Answer: "the plot was exciting but the ending was too predictable."`;
      break;
    case 'medium':
      difficultyInstruction = `
      CRITICAL FOR MEDIUM MODE:
      - Target Audience: Upper-intermediate learners (High School / SAT Prep / ESL B2).
      - Sentences: Mix simple, compound, and complex sentences. Use diverse contexts like news, general science, and literature.
      - AUTHENTICITY: Sentences must read like real journalism, popular science articles, or literary fiction. NO stiff academic jargon unless the target word is academic.
      - VOCABULARY CONTROL: Apart from the target word, all other words must be at or below CEFR B2 level. Do NOT use obscure GRE-level words just to sound impressive.
      - EXAMPLE GOOD SENTENCES for Medium: "The controversial policy sparked heated debates across the nation.", "Despite the circumstance, she remained optimistic about the future.", "Scientists discovered a new gene that influences human behavior."
      `;
      contextualRule = `- CRITICAL LEVEL RULE: Sentences MUST be at an upper-intermediate level (ESL B2 / High School). They should be rich in context, using varied syntax and general academic or literary vocabulary.
      - AUTHENTICITY RULE: Sentences should read like real newspaper articles or quality nonfiction.
      - VOCABULARY CONTROL: All non-target words at or below CEFR B2. No obscure vocabulary.`;
      scrambledRule = `- CRITICAL LEVEL RULE: Responses MUST be at an upper-intermediate level (ESL B2 / High School). Use well-structured responses that show speaker attitude, opinion, or inference.
      - AUTHENTICITY RULE: Every response must sound like a natural reply in a podcast interview or class discussion.
      - CONTEXT FORMAT: Use opinion-seeking or inference-based prompts with complex replies containing relative clauses or modals.
      - EXAMPLE GOOD: Context: "Do you think the new policy will work?" | Scrambled: "unlikely / it / seems / that / will / succeed / without / support / public"
        Correct Answer: "it seems unlikely that it will succeed without public support."`;
      break;
    case 'hard':
      difficultyInstruction = `
      CRITICAL FOR HARD MODE:
      - Target Audience: Advanced learners (TOEFL iBT / GRE / ESL C1-C2).
      - Sentences: Highly academic, complex syntax (e.g., participial phrases, concessive clauses, appositives), advanced collocations.
      - AUTHENTICITY: Sentences must read like passages from The Economist, Nature, or academic journals. NO pseudo-intellectual filler. Every word must earn its place.
      - VOCABULARY CONTROL: Apart from the target word, other words can be C1-C2 level, but do NOT use obscure Latin-derived words that even native speakers rarely encounter. Precision > pretension.
      - EXAMPLE GOOD SENTENCES for Hard: "Urban expansion inevitably destroys vital natural wildlife habitats.", "Governments must heavily subsidize renewable energy infrastructure development.", "This empirical evidence contradicts the previously established hypothesis."
      `;
      contextualRule = `- CRITICAL LEVEL RULE: Sentences MUST be at the TOEFL iBT Reading/Listening level. They must be rich in context, using advanced academic vocabulary and complex syntax (e.g., participial phrases, concessive clauses, appositives).
      - AUTHENTICITY RULE: Sentences should read like excerpts from The Economist, Scientific American, or academic papers.
      - VOCABULARY CONTROL: Precision over pretension. Do not use obscure words for show.`;
      scrambledRule = `- CRITICAL LEVEL RULE: Responses MUST be at the TOEFL iBT Speaking/Listening level. Use complex responses with embedded clauses, inversions, ellipsis, or advanced collocations.
      - AUTHENTICITY RULE: Responses must sound like educated native speakers in an academic discussion.
      - CONTEXT FORMAT: Use academic or abstract prompts that require nuanced, grammatically sophisticated replies.
      - EXAMPLE GOOD: Context: "Why did the professor reject the hypothesis?" | Scrambled: "had / the / data / been / collected / properly / the / conclusion / would / have / differed"
        Correct Answer: "had the data been collected properly the conclusion would have differed."`;
      break;
  }

  return { diff: difficultyInstruction, contextual: contextualRule, scrambled: scrambledRule };
}

function buildSectionInstructions(contextualRule: string, scrambledRule: string): Record<string, string> {
  return {
    'fill-in-blank': `
    SECTION: Fill-in-the-Blank (Contextual + Definition)
    - EXACTLY 10 QUESTIONS.
    - Generate sentences using the target word. CRITICAL: Sentences must be highly authentic, varied in structure, and reflect real-world usage appropriate for the difficulty level.
    - Provide a short, clear definition (clue).
    - CRITICAL FORMAT RULE: The 'text' field MUST contain the COMPLETE sentence with the target word spelled out in FULL. Do NOT replace the target word with blanks, underscores, or any placeholder.
      CORRECT text example: "The benevolent ruler shared his wealth with the poor."
      WRONG text example: "The b________ ruler shared his wealth with the poor."
    - 'targetWord' is the word to fill in. 'clue' is the definition. The frontend will automatically create the visual blank.
    `,
    'synonym-antonym': `
    SECTION: Synonyms & Antonyms
    - EXACTLY 10 QUESTIONS.
    - Select a 'targetWord' from the list and provide a 'matchWord' (which is either a synonym or an antonym).
    - CRITICAL: Both 'targetWord' and 'matchWord' MUST be valid, standard English words. Do NOT include any translations, special characters, or garbled text.
    - 'correctAnswer' must be exactly "S" (for Synonym) or "A" (for Antonym).
    `,
    'rewrite': `
    SECTION: Sentence Rewrite
    - EXACTLY 5 QUESTIONS.
    - Provide a sentence ('text') that the student must rewrite using the 'targetWord'.
    - 'correctAnswer' is the rewritten version.
    `,
    'contextual': `
    SECTION: Contextual Fill-in-the-Blank (Word Bank)
    - EXACTLY 10 QUESTIONS.
    ${contextualRule}
    - STRICTLY FORBIDDEN: Do NOT use basic, formulaic structures like "The [word] of the..." or "He is a [word] person."
    - CRITICAL VARIETY: Every single sentence must have a completely different grammatical structure. Start sentences with adverbs, dependent clauses, or prepositional phrases, not just the subject.
    - The sentence must contain enough contextual clues that a student can logically deduce the missing word.
    - CRITICAL FORMAT RULE: The 'text' field MUST contain the COMPLETE sentence with the target word spelled out in FULL. Do NOT replace the target word with blanks, underscores, first-letter hints, or any placeholder.
      CORRECT text example: "The new policy sparked heated debates across the nation."
      WRONG text example: "The new policy sparked h________ debates across the nation."
    - 'distractors' array MUST contain EXACTLY 10 words — no more, no fewer. These 10 words are the SAME 10 words used as answers (targetWord) in the 10 questions above. Do NOT include extra words beyond these 10.
    `,
    'scrambled': `
    SECTION: Scrambled Sentences (TOEFL-Style Sentence Reconstruction)
    - EXACTLY 10 QUESTIONS.
    - CRITICAL TOEFL FORMAT: Each question MUST simulate a dialogue context where one speaker makes a statement or asks a question, and the other speaker responds. The RESPONSE sentence is what gets scrambled.
    - The 'text' field MUST contain TWO parts separated by " | ":
      Part 1: A short context cue (the first speaker's question or statement, 5-10 words max).
      Part 2: The scrambled words of the response sentence.
      EXAMPLE text: "Where did you buy that backpack? | store / offers / from / the / it's / that / I / bought / discounts"
    - CRITICAL LENGTH RULE: The response sentence MUST contain between 7 and 12 words. Do NOT exceed 12 words.
    ${scrambledRule}
    - GRAMMAR COMPLEXITY RULES (escalate by difficulty):
      - Basic/Easy: Simple responses using common expressions. (e.g., "It's the store that I bought from.")
      - Medium: Responses with relative clauses, phrasal verbs, or passive voice. (e.g., "The articulate speaker might present on another topic.")
      - Hard: Responses with embedded clauses, inversion, ellipsis, or complex collocations. (e.g., "Had I known his schedule changed, I'd have asked why.")
    - STRICTLY FORBIDDEN: Do NOT use conversational filler ("um", "well", "you know"), basic pronoun-only subjects ("He went..."), or overly simplistic SVO grammar unless in Basic mode. Every word must carry grammatical weight.
    - CRITICAL: The unscrambled, grammatically correct response sentence MUST be provided in the 'correctAnswer' field (NOT including the context cue).
    - CRITICAL SCRAMBLE RULE: You MUST shuffle the words using high entropy. It is strictly forbidden for more than two words to remain in their original grammatical sequence. Do NOT simply move the first word to the end.
    - CRITICAL: DO NOT capitalize any words in the scrambled list. Every word in the 'text' must be strictly lowercase.
    `,
    'creative': `
    SECTION: Bonus Creative Writing
    - Select exactly 5 words from the list for a story.
    `
  };
}

function buildGeneratePrompt(config: GenerationConfig): string {
  const shuffledWordList = [...config.wordList];
  for (let i = shuffledWordList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledWordList[i], shuffledWordList[j]] = [shuffledWordList[j], shuffledWordList[i]];
  }

  const { diff, contextual, scrambled } = buildDifficultyInstructions(config.difficulty);
  const sectionInstructions = buildSectionInstructions(contextual, scrambled);

  const requestedSections = config.sections && config.sections.length > 0
    ? config.sections
    : ['fill-in-blank', 'synonym-antonym', 'rewrite', 'contextual', 'scrambled', 'creative'];

  const sectionsPrompt = requestedSections.map((sec, index) => {
      return sectionInstructions[sec].replace('SECTION:', `SECTION ${index + 1}:`);
  }).join('\n');

  return `
    You are an expert educational content generator. Create a differentiated vocabulary test based on the following words: ${shuffledWordList.join(", ")}.

    CRITICAL: ALL generated content MUST be in standard English. Do not include any Chinese characters, translations, or garbled text.
    CRITICAL: DO NOT include any internal monologue, reasoning, "Wait...", or "Let me fix..." text ANYWHERE in the JSON values. The values must contain ONLY the final requested content.

    ${diff}

    The test MUST follow this EXACT ${requestedSections.length}-Section structure.
    Create ${config.versions} distinct versions (Version A, Version B, etc.).

    Structure & Rules:
    ${sectionsPrompt}

    Return strictly valid JSON matching this exact schema:
    {
      "wordList": ["string"],
      "versions": [
        {
          "versionName": "Version A",
          "theme": "string",
          "sections": [
            {
              "title": "string",
              "type": "fill-in-blank | synonym-antonym | rewrite | contextual | scrambled | creative",
              "instructions": "string",
              "distractors": ["string"],
              "questions": [
                {
                  "id": 1,
                  "text": "string",
                  "targetWord": "string",
                  "clue": "string",
                  "matchWord": "string",
                  "correctAnswer": "string"
                }
              ]
            }
          ]
        }
      ]
    }

    OUTPUT VALIDATION (self-check before returning):
    1. Fill-in-the-Blank: EVERY 'text' field MUST contain the complete target word spelled in full. NO underscores or blanks in text.
    2. All sentences must sound natural to a native English speaker. Read each sentence aloud mentally—if it sounds awkward or textbook-like, rewrite it.
    3. Check that non-target vocabulary matches the difficulty level. Replace any word that feels too hard or too easy.

    NO conversational text, NO internal reasoning, NO markdown. Only the JSON object.
  `;
}

function buildParsePrompt(rawText: string): string {
  return `
    You are a high-precision data parser. Convert raw test text into a clean JSON structure.

    INPUT TEXT:
    """
    ${rawText}
    """

    PARSING INSTRUCTIONS:
    1. Detect the sections present in the text (e.g., Fill-in-blank, Synonyms, Rewrite, Word Bank, Scrambled, Creative).
    2. Extract the questions and answers accurately based on the detected sections.

    Return strictly valid JSON matching this exact schema:
    {
      "wordList": ["string"],
      "versions": [
        {
          "versionName": "Version A",
          "theme": "string",
          "sections": [
            {
              "title": "string",
              "type": "fill-in-blank | synonym-antonym | rewrite | contextual | scrambled | creative",
              "instructions": "string",
              "distractors": ["string"],
              "questions": [
                {
                  "id": 1,
                  "text": "string",
                  "targetWord": "string",
                  "clue": "string",
                  "matchWord": "string",
                  "correctAnswer": "string"
                }
              ]
            }
          ]
        }
      ]
    }

    OUTPUT VALIDATION (self-check before returning):
    1. Fill-in-the-Blank: EVERY 'text' field MUST contain the complete target word spelled in full. NO underscores, NO blanks, NO placeholders in text.
    2. Scrambled Sentences: EVERY 'text' field MUST use the format "Context cue | word / word / word". The context cue and scrambled words MUST be separated by " | ".
    3. Every sentence must sound natural to a native English speaker. Read each sentence aloud mentally—if it sounds awkward or textbook-like, rewrite it.
    4. Check that non-target vocabulary matches the difficulty level. Replace any word that feels too hard or too easy.
    5. Ensure the JSON is COMPLETE and not truncated. All arrays must be properly closed with matching brackets.

    Only the JSON object. No markdown code blocks.
  `;
}

// ==================== JSON Post-Processing ====================

function postProcessResult(result: TestGenerationResult): TestGenerationResult {
  if (result.versions) {
    result.versions.forEach(version => {
      if (version.sections) {
        version.sections.forEach(section => {
          if (section.type === 'contextual') {
            // Enforce exactly 10 distractors matching the 10 question targetWords
            const targetWords = section.questions?.map(q => q.targetWord).filter(Boolean) || [];
            if (targetWords.length === 10) {
              section.distractors = targetWords;
            } else if (section.distractors) {
              // Trim or pad to exactly 10
              if (section.distractors.length > 10) {
                section.distractors = section.distractors.slice(0, 10);
              } else if (section.distractors.length < 10 && targetWords.length > 0) {
                const needed = 10 - section.distractors.length;
                for (let k = 0; k < needed; k++) {
                  section.distractors.push(targetWords[k % targetWords.length]);
                }
              }
            }
            // Shuffle
            if (section.distractors) {
              for (let i = section.distractors.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [section.distractors[i], section.distractors[j]] = [section.distractors[j], section.distractors[i]];
              }
            }
          }
          // Fix blank patterns in both fill-in-blank and contextual sections
          if ((section.type === 'fill-in-blank' || section.type === 'contextual') && section.questions) {
            section.questions.forEach(q => {
              if (q.text && q.targetWord) {
                const lowerText = q.text.toLowerCase();
                const lowerTarget = q.targetWord.toLowerCase();
                // If AI replaced the target word with blanks/underscores, try to fix it
                if (!lowerText.includes(lowerTarget)) {
                  // Match various blank patterns: _____, ______, [blank], (blank), ___word___
                  const blankPattern = /_{2,}|\[blank\]|\(blank\)/i;
                  if (blankPattern.test(q.text)) {
                    q.text = q.text.replace(blankPattern, q.targetWord);
                  } else {
                    // Fallback: insert target word if completely missing
                    q.text = q.text + ` (${q.targetWord})`;
                  }
                }
              }
            });
          }
          if (section.type === 'scrambled' && section.questions) {
            section.questions.forEach(q => {
              if (q.text) {
                // Handle new "context | scrambled" format
                const parts = q.text.split(' | ');
                if (parts.length >= 2) {
                  const contextCue = parts[0];
                  const scrambledPart = parts.slice(1).join(' | ');
                  const words = scrambledPart.split(' / ').map(w => w.trim()).filter(w => w.length > 0);
                  for (let i = words.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [words[i], words[j]] = [words[j], words[i]];
                  }
                  q.text = contextCue + ' | ' + words.join(' / ');
                } else {
                  // Legacy format: no context cue
                  const words = q.text.split(' / ').map(w => w.trim()).filter(w => w.length > 0);
                  for (let i = words.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [words[i], words[j]] = [words[j], words[i]];
                  }
                  q.text = words.join(' / ');
                }
              }
            });
          }
        });
      }
    });
  }
  return result;
}

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

async function parseSSEResponse(response: Response, onProgress?: (text: string) => void): Promise<string> {
  const text = await response.text();
  const lines = text.split('\n');
  let fullText = '';
  let foundData = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data: ')) {
      foundData = true;
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const chunk = parsed.choices?.[0]?.delta?.content || '';
        if (chunk) {
          fullText += chunk;
          onProgress?.(fullText);
        }
      } catch { /* ignore invalid JSON */ }
    }
  }

  if (foundData && fullText) {
    return fullText;
  }

  // Not SSE, try normal JSON
  try {
    const parsed = JSON.parse(text);
    return parsed.choices?.[0]?.message?.content || '{}';
  } catch {
    return extractJSON(text);
  }
}

async function parseGeminiStream(response: Response, onProgress?: (text: string) => void): Promise<string> {
  const text = await response.text();
  let fullText = '';
  // Gemini stream returns JSON objects separated by newlines (NDJSON)
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (chunk) {
        fullText += chunk;
        onProgress?.(fullText);
      }
    } catch { /* ignore invalid JSON lines */ }
  }
  if (fullText) return fullText;

  // Fallback: try parsing as single JSON
  try {
    const parsed = JSON.parse(text);
    return parsed.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  } catch {
    return extractJSON(text);
  }
}

// ==================== Gemini Provider (Auto-detect model) ====================

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

async function detectGeminiModel(apiKey: string): Promise<string> {
  // Strategy 1: Try to list models and pick the best available
  try {
    const res = await proxyFetch(`${GEMINI_API_BASE}/models?key=${apiKey}&pageSize=100`);
    if (res.ok) {
      const data = await res.json();
      const models = (data.models || []) as any[];
      const supported = models.filter(m =>
        m.supportedGenerationMethods?.includes('generateContent')
      );
      // Prefer flash models
      const flash = supported.find(m => m.name?.includes('flash'));
      if (flash) return flash.name.replace('models/', '');
      // Fallback to any gemini model
      const gemini = supported.find(m => m.name?.includes('gemini'));
      if (gemini) return gemini.name.replace('models/', '');
    }
  } catch { /* ignore list failure */ }

  // Strategy 2: Fallback chain — probe each candidate
  const candidates = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash',
    'gemini-pro',
  ];
  for (const model of candidates) {
    try {
      const res = await proxyFetch(`${GEMINI_API_BASE}/models/${model}?key=${apiKey}`);
      if (res.ok) return model;
    } catch { /* ignore probe failure */ }
  }

  // Last resort
  return 'gemini-1.5-flash-latest';
}

const callGemini = async (prompt: string, _modelName: string, apiKey: string, onProgress?: (text: string) => void): Promise<TestGenerationResult> => {
  const model = await detectGeminiModel(apiKey);
  const useStream = !!onProgress;
  const endpoint = useStream ? ':streamGenerateContent' : ':generateContent';
  const url = `${GEMINI_API_BASE}/models/${model}${endpoint}?key=${apiKey}`;

  const response = await proxyFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 400 && body.includes('API key not valid')) {
      throw new Error(`API key invalid (${response.status}). Please check your API key in Settings.`);
    }
    if (response.status === 404) {
      throw new Error(`Model not found (${response.status}). No available Gemini model for this API key.`);
    }
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded (${response.status}). Please try again later.`);
    }
    throw new Error(`Gemini API Error ${response.status}: ${body}`);
  }

  let content: string;
  if (useStream) {
    content = await parseGeminiStream(response, onProgress);
  } else {
    const data = await response.json();
    content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  }
  const jsonText = extractJSON(content);

  try {
    const result = JSON.parse(jsonText) as TestGenerationResult;
    return postProcessResult(result);
  } catch (parseErr: any) {
    console.error("Failed to parse JSON from Gemini response:", content);
    throw new Error(`Failed to parse API response: ${parseErr.message}`);
  }
};

// ==================== OpenAI-Compatible Provider ====================

const PROVIDER_MAX_TOKENS: Record<string, number> = {
  deepseek: 8192,
  openai: 16384,
  kimi: 16384,
  'kimi-code': 8192,
  custom: 8192,
};

const callOpenAICompatible = async (
  prompt: string,
  modelName: string,
  apiKey: string,
  baseUrl: string,
  provider: string,
  onProgress?: (text: string) => void
): Promise<TestGenerationResult> => {
  const url = baseUrl.replace(/\/$/, '') + '/chat/completions';

  const shouldStream = !!onProgress;
  const body: any = {
    model: modelName,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: PROVIDER_MAX_TOKENS[provider] || 8192,
  };
  if (shouldStream) {
    body.stream = true;
  }

  const response = await proxyFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`API Error ${response.status} from ${provider}:`, errorBody);
    if (response.status === 401 || response.status === 403) {
      throw new Error(`API key invalid or unauthorized (${response.status}). Please check your API key in Settings.`);
    }
    if (response.status === 402) {
      throw new Error(`Insufficient balance (${response.status}). Your API account has no remaining credit. Please recharge or switch to a different provider in Settings.`);
    }
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded (${response.status}). Please try again later.`);
    }
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }

  let content: string;
  if (shouldStream) {
    content = await parseSSEResponse(response, onProgress);
  } else {
    const data = await response.json();
    content = data.choices?.[0]?.message?.content || '{}';
  }
  const jsonText = extractJSON(content);

  try {
    const result = JSON.parse(jsonText) as TestGenerationResult;
    return postProcessResult(result);
  } catch (parseErr: any) {
    console.error("Failed to parse JSON from API response:", content);
    const trimmed = content.trim();
    if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
      throw new Error(`AI response was truncated (incomplete JSON). The model ran out of output tokens. Try reducing the number of sections or words, or switching to a model with a larger context window.`);
    }
    throw new Error(`Failed to parse API response: ${parseErr.message}`);
  }
};

// ==================== Unified Dispatch ====================

async function callAI(prompt: string, aiConfig: AIConfig, onProgress?: (text: string) => void): Promise<TestGenerationResult> {
  switch (aiConfig.provider) {
    case 'gemini':
      return callGemini(prompt, aiConfig.model, aiConfig.apiKey, onProgress);
    case 'deepseek':
    case 'openai':
    case 'kimi':
    case 'kimi-code':
    case 'custom':
      return callOpenAICompatible(prompt, aiConfig.model, aiConfig.apiKey, aiConfig.baseUrl || '', aiConfig.provider, onProgress);
    default:
      throw new Error(`Unsupported provider: ${aiConfig.provider}`);
  }
}

// ==================== Public API ====================

export const generateVocabTest = async (config: GenerationConfig, onProgress?: (text: string) => void): Promise<TestGenerationResult> => {
  const aiConfig = config.aiConfig || getStoredConfig();
  const prompt = buildGeneratePrompt(config);
  return withRetry(() => callAI(prompt, aiConfig, onProgress));
};

export const parseTestFromText = async (rawText: string, aiConfig?: AIConfig, onProgress?: (text: string) => void): Promise<TestGenerationResult> => {
  const resolvedConfig = aiConfig || getStoredConfig();
  const prompt = buildParsePrompt(rawText);
  return withRetry(() => callAI(prompt, resolvedConfig, onProgress));
};
