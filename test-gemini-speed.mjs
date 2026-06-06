const API_KEY = 'AIzaSyAa_HHfNhC2iKs770JQwuZYaW8I_M3seQo';
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

async function test(endpoint, label) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}${endpoint}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say hello in one word.' }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 10 }
      })
    });
    const ms = Date.now() - start;
    const body = await res.text();
    console.log(`${label}: ${ms}ms | status=${res.status} | body=${body.slice(0, 120)}`);
  } catch (e) {
    console.log(`${label}: ERROR — ${e.message}`);
  }
}

console.log('=== Testing Gemini API Speed ===\n');

// Test 1: List models
await test('/models/gemini-1.5-flash-latest', 'flash-latest');

// Test 2: Stream endpoint
const start = Date.now();
const res = await fetch(`${BASE}/models/gemini-1.5-flash-latest:streamGenerateContent?key=${API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: 'Count from 1 to 5.' }] }],
    generationConfig: { temperature: 0.1 }
  })
});
const text = await res.text();
console.log(`streamGenerateContent: ${Date.now() - start}ms | chunks=${text.split('\n').filter(l => l.trim()).length}`);

// Test 3: Non-stream (what we currently use)
const start2 = Date.now();
const res2 = await fetch(`${BASE}/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: 'Count from 1 to 5.' }] }],
    generationConfig: { temperature: 0.1 }
  })
});
await res2.text();
console.log(`generateContent: ${Date.now() - start2}ms`);

console.log('\n=== Done ===');
