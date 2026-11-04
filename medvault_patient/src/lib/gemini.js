import { GoogleGenAI } from '@google/genai';

/**
 * Centralized Gemini model configuration.
 * Configured model: gemini-2.5-flash (fast, multimodal, cost-effective, officially supported).
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Standard medical disclaimer enforcing healthcare safety guidelines.
 */
export const MEDICAL_AI_DISCLAIMER =
  'MedVault AI clinical extractions are intended for patient health records and organization only. ' +
  'They do not constitute a clinical medical diagnosis, prognosis, or personalized treatment plan. ' +
  'All observations and extracted values must be reviewed by a licensed healthcare professional.';

/**
 * Medically cautious system prompt for report extraction.
 */
export const CLINICAL_EXTRACTION_SYSTEM_PROMPT = `You are a clinical document extraction and patient communication assistant for MedVault AI.
Your role is strictly to extract, organize, and explain information from the attached medical document for the patient's personal records.

CRITICAL MEDICAL & SAFETY RULES:
1. DO NOT diagnose diseases, clinical syndromes, or condition status.
2. DO NOT recommend starting, stopping, modifying, or adjusting any medication or therapy.
3. DO NOT invent or assume values, units, or reference ranges. If any value or reference range is not clearly stated or is unreadable, set value or reference_range to "unavailable".
4. Distinguish the laboratory's printed reference range from general medical knowledge; only cite reference ranges printed on the report itself.
5. In measurements: status MUST be one of "normal", "low", "high", "inconclusive", or "unavailable".
6. Always explain medical terms in plain, compassionate, patient-friendly language.
7. Include helpful questions the patient can bring to their licensed healthcare provider.
8. Include an explicit disclaimer stating this analysis is an AI-generated organization aid, not medical advice or diagnosis, and requires clinician review.

OUTPUT FORMAT:
Respond with ONLY valid JSON matching this exact structure:
{
  "report_type": "string (e.g. Complete Blood Count, Lipid Panel, MRI Lumbar Spine, Prescription)",
  "report_date": "string or null",
  "concise_summary": "string (2-3 sentences summarizing document scope)",
  "key_findings": ["string"],
  "measurements": [
    {
      "name": "string",
      "value": "string",
      "unit": "string",
      "reference_range": "string",
      "status": "normal" | "low" | "high" | "inconclusive" | "unavailable"
    }
  ],
  "out_of_range_observations": ["string"],
  "medical_terms_explained": [
    {
      "term": "string",
      "explanation": "string"
    }
  ],
  "suggested_questions_for_doctor": ["string"],
  "limitations_and_disclaimer": "MedVault AI clinical extractions are intended for patient health records and organization only. They do not constitute a clinical medical diagnosis or treatment plan. Always consult your qualified physician."
}`;

/**
 * Returns an authenticated GoogleGenAI client using process.env.GEMINI_API_KEY.
 * Never exposes the key or logs it to console.
 */
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Health check that verifies server-side connectivity to Google Gemini API.
 * Never leaks the API key or internal secrets in the response.
 *
 * @returns {Promise<{ status: string, connected: boolean, model: string, latencyMs?: number, error?: string, timestamp: string }>}
 */
export async function checkGeminiHealth() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        status: 'unconfigured',
        connected: false,
        model: GEMINI_MODEL,
        error: 'GEMINI_API_KEY environment variable is not configured.',
        timestamp,
      };
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: 'Respond with a single JSON object: {"status": "ok"}',
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const latencyMs = Date.now() - startTime;
    let isOk = false;

    try {
      const parsed = JSON.parse(response.text || '{}');
      isOk = parsed.status === 'ok';
    } catch {
      isOk = !!response.text;
    }

    return {
      status: isOk ? 'healthy' : 'degraded',
      connected: true,
      model: GEMINI_MODEL,
      latencyMs,
      timestamp,
    };
  } catch (err) {
    // Avoid logging or returning sensitive error details
    const sanitizedError =
      err instanceof Error && err.message.includes('fetch failed')
        ? 'Network connectivity to Google AI services failed.'
        : 'Google Gemini API request failed.';

    return {
      status: 'unhealthy',
      connected: false,
      model: GEMINI_MODEL,
      error: sanitizedError,
      timestamp,
    };
  }
}

