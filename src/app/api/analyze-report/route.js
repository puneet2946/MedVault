import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Models to try in order — if the primary is overloaded (503) or rate limited (429), fall back to the next
const MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-pro'];

export async function POST(req) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server configuration error: GEMINI_API_KEY is not set.' },
      { status: 500 }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');
    const mimeType = file.type;

    // We only want to accept images and pdfs
    if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
       return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF or an Image.' }, { status: 400 });
    }

    // Prepare the prompt
    const prompt = `You are a helpful, empathetic, and expert medical assistant. I have provided a medical report (either a lab result, clinical note, or imaging report). 
Please read it carefully and provide a simplified explanation for a patient who does not have a medical background.

Structure your response strictly in the following JSON format:
{
  "summary": "A 1-2 sentence high-level summary of the report's overall conclusion.",
  "keyFindings": [
    "Finding 1 in simple terms",
    "Finding 2 in simple terms"
  ],
  "jargonBuster": [
    { "term": "Medical Term 1", "explanation": "Simple explanation" },
    { "term": "Medical Term 2", "explanation": "Simple explanation" }
  ],
  "nextSteps": "Any suggested next steps mentioned in the report (e.g., follow-up, diet change). If none are mentioned, state 'Discuss these findings with your doctor.'"
}

Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.`;

    const contentPayload = [
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
    ];

    // Try each model in order until one succeeds
    let lastError = null;
    for (const modelName of MODELS) {
      try {
        console.log(`Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(contentPayload);
        const responseText = result.response.text();

        // Clean up response if it contains markdown formatting
        let jsonString = responseText.trim();
        if (jsonString.startsWith('\`\`\`json')) {
          jsonString = jsonString.slice(7, -3).trim();
        } else if (jsonString.startsWith('\`\`\`')) {
          jsonString = jsonString.slice(3, -3).trim();
        }

        const data = JSON.parse(jsonString);
        console.log(`Success with model: ${modelName}`);
        return NextResponse.json(data);
      } catch (err) {
        lastError = err;
        const status = err?.status || err?.response?.status;
        console.warn(`Model ${modelName} failed (status: ${status}): ${err.message}`);

        // Only fall back on transient / overload errors (503, 429, 500)
        if (status === 503 || status === 429 || status === 500) {
          continue; // try next model
        }

        // For non-transient errors (e.g. 400 bad request, 401 auth), stop immediately
        throw err;
      }
    }

    // All models failed with transient errors
    throw lastError;
  } catch (error) {
    console.error('Error analyzing report:', error);

    const status = error?.status || error?.response?.status;
    let userMessage = 'Failed to analyze the report. Please try again later.';

    if (status === 401 || status === 403) {
      userMessage = 'API key is invalid or expired. Please check your configuration.';
    } else if (status === 429) {
      userMessage = 'Too many requests. Please wait a moment and try again.';
    } else if (status === 503) {
      userMessage = 'All AI models are currently experiencing high demand. Please try again in a few minutes.';
    }

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
