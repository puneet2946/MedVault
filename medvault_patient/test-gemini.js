const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY environment variable is not configured.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function run() {
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    console.log(`Testing Gemini API with model: ${model}...`);
    const response = await ai.models.generateContent({
      model,
      contents: 'Respond with the single word: PONG',
    });
    console.log('SUCCESS:', response.text.trim());
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

run();
