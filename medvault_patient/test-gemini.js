const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('REDACTED_GEMINI_API_KEY');
async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('hello');
    console.log('SUCCESS:', result.response.text());
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}
run();
