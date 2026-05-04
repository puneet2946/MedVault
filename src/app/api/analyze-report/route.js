import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client inside the function to ensure process.env is read on every request
// (useful during development when env vars change)

export async function POST(req) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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

    // Use gemini-1.5-pro since it is multimodal and highly capable for document/image reasoning
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType
        }
      }
    ]);

    const responseText = result.response.text();
    
    // Clean up response if it contains markdown formatting
    let jsonString = responseText.trim();
    if (jsonString.startsWith('\`\`\`json')) {
      jsonString = jsonString.slice(7, -3).trim();
    } else if (jsonString.startsWith('\`\`\`')) {
       jsonString = jsonString.slice(3, -3).trim();
    }

    const data = JSON.parse(jsonString);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error analyzing report:', error);
    return NextResponse.json(
      { error: 'Failed to analyze the report. Please try again later.' },
      { status: 500 }
    );
  }
}
