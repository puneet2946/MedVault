// Supabase Edge Function: analyze-medical-report
// Analyzes uploaded patient medical records using Google Gemini Multimodal API.
//
// Security & Architecture:
// - Verifies caller's JWT using Supabase Auth; never trusts client-supplied patient_id.
// - Enforces ownership: medical_record must belong to verified auth.uid().
// - Downloads file from private Storage bucket using privileged service_role client.
// - Calls Google Gemini securely with server-side GEMINI_API_KEY (never exposed to client).
// - Validates structured JSON and saves results into public.report_analyses.
// - Never logs sensitive clinical text or patient health details.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  medical_record_id: string;
}

interface Measurement {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: "normal" | "low" | "high" | "inconclusive" | "unavailable";
}

interface JargonExplanation {
  term: string;
  explanation: string;
}

interface StructuredFindings {
  report_type: string;
  report_date: string | null;
  concise_summary: string;
  key_findings: string[];
  measurements: Measurement[];
  out_of_range_observations: string[];
  medical_terms_explained: JargonExplanation[];
  suggested_questions_for_doctor: string[];
  limitations_and_disclaimer: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[Config Error] Supabase environment variables missing in Edge Function runtime.");
    return new Response(
      JSON.stringify({ error: "Edge function server configuration error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!geminiApiKey) {
    console.error("[Config Error] GEMINI_API_KEY secret is not set in Supabase Edge Function secrets.");
    return new Response(
      JSON.stringify({
        error: "GEMINI_API_KEY secret is not configured in Supabase. Please set it using: supabase secrets set GEMINI_API_KEY=...",
        code: "GEMINI_KEY_MISSING",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // 2. Authenticate caller JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify JWT with Supabase Auth
    const { data: userData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !userData?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized session. Please re-authenticate." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // 3. Parse and validate request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body. Expected { medical_record_id }." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { medical_record_id } = body;
    if (!medical_record_id || typeof medical_record_id !== "string") {
      return new Response(
        JSON.stringify({ error: "medical_record_id is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Query medical_record and guarantee ownership by caller
    const { data: record, error: recordError } = await adminClient
      .from("medical_records")
      .select("*")
      .eq("id", medical_record_id)
      .eq("patient_id", userId)
      .maybeSingle();

    if (recordError || !record) {
      return new Response(
        JSON.stringify({ error: "Medical record not found or access denied." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Check if a completed analysis already exists for this medical record
    const { data: existingAnalysis } = await adminClient
      .from("report_analyses")
      .select("*")
      .eq("medical_record_id", medical_record_id)
      .eq("patient_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingAnalysis && existingAnalysis.analysis_status === "completed") {
      return new Response(
        JSON.stringify({
          cached: true,
          analysis: existingAnalysis,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Validate file format and size
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];

    let effectiveMime = record.mime_type;
    if (!allowedMimeTypes.includes(effectiveMime)) {
      if (record.storage_path?.endsWith(".pdf")) effectiveMime = "application/pdf";
      else if (record.storage_path?.endsWith(".png")) effectiveMime = "image/png";
      else if (record.storage_path?.endsWith(".jpg") || record.storage_path?.endsWith(".jpeg")) effectiveMime = "image/jpeg";
      else if (record.storage_path?.endsWith(".webp")) effectiveMime = "image/webp";
    }

    if (!allowedMimeTypes.includes(effectiveMime)) {
      return new Response(
        JSON.stringify({ error: `Unsupported document format (${record.mime_type}). Only PDF, JPEG, PNG, and WebP are supported.` }),
        { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MAX_SIZE_BYTES = 20 * 1024 * 1024;
    if (record.file_size > MAX_SIZE_BYTES) {
      return new Response(
        JSON.stringify({ error: "Document exceeds maximum analysis size of 20MB." }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update processing status to processing
    await adminClient
      .from("medical_records")
      .update({ processing_status: "processing" })
      .eq("id", medical_record_id);

    // 7. Download document from private Storage bucket
    const { data: fileBlob, error: downloadError } = await adminClient.storage
      .from("medical-records")
      .download(record.storage_path);

    if (downloadError || !fileBlob) {
      console.error("[Storage Error] Could not download file from storage:", downloadError?.message);
      await adminClient
        .from("medical_records")
        .update({ processing_status: "failed" })
        .eq("id", medical_record_id);

      return new Response(
        JSON.stringify({ error: "Could not retrieve document from secure storage." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileBuffer = await fileBlob.arrayBuffer();
    const base64Content = arrayBufferToBase64(fileBuffer);

    // 8. Medically cautious system prompt
    const systemPrompt = `You are a clinical document extraction and patient communication assistant for MedVault.
Your role is strictly to extract, organize, and explain information from the attached medical document for the patient's personal records.

CRITICAL MEDICAL & SAFETY RULES:
1. DO NOT diagnose diseases or condition status.
2. DO NOT recommend starting, stopping, modifying, or adjusting any medication or therapy.
3. DO NOT invent or assume values, units, or reference ranges. If any value or reference range is not clearly stated or is unreadable, set value or reference_range to "unavailable".
4. Distinguish the laboratory's printed reference range from general knowledge; only cite reference ranges printed on the report itself.
5. In measurements: status MUST be one of "normal", "low", "high", "inconclusive", or "unavailable".
6. Always explain medical terms in plain, compassionate, patient-friendly language.
7. Include helpful questions the patient can bring to their licensed healthcare provider.
8. Include an explicit disclaimer stating this analysis is an AI-generated organization aid, not medical advice or diagnosis, and requires clinician review.

OUTPUT FORMAT:
Respond with ONLY valid JSON matching this exact structure:
{
  "report_type": "string (e.g. Complete Blood Count, Lipid Panel, MRI Lumbar Spine, Prescription)",
  "report_date": "string or null (e.g. 2024-03-15 if printed on report)",
  "concise_summary": "string (2-3 sentences summarizing what this document is and its main scope)",
  "key_findings": ["string", "string"],
  "measurements": [
    {
      "name": "string (e.g. Hemoglobin, Total Cholesterol)",
      "value": "string (e.g. 13.5)",
      "unit": "string (e.g. g/dL, mg/dL)",
      "reference_range": "string (e.g. 12.0 - 15.5)",
      "status": "normal" | "low" | "high" | "inconclusive" | "unavailable"
    }
  ],
  "out_of_range_observations": ["string describing values marked abnormal on the report"],
  "medical_terms_explained": [
    {
      "term": "string",
      "explanation": "string in simple layperson terms"
    }
  ],
  "suggested_questions_for_doctor": ["string", "string"],
  "limitations_and_disclaimer": "This summary was generated by MedVault AI for informational and organizational purposes only. It is not a clinical diagnosis or medical treatment plan. All results must be reviewed by your qualified physician."
}`;

    // 9. Call Google Gemini API (gemini-2.5-flash)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: effectiveMime,
                data: base64Content,
              },
            },
            {
              text: systemPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!geminiResponse.ok) {
      console.error("[Gemini API Error] Status:", geminiResponse.status);
      await adminClient
        .from("medical_records")
        .update({ processing_status: "failed" })
        .eq("id", medical_record_id);

      return new Response(
        JSON.stringify({
          error: "AI analysis service was unable to process the document. Please try again later.",
          status: geminiResponse.status,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("Empty response received from AI model.");
    }

    // 10. Parse and sanitize structured output
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse structured JSON from AI response.");
      }
    }

    // Sanitize and enforce required schema fields
    const validatedFindings: StructuredFindings = {
      report_type: parsed.report_type || "Medical Report",
      report_date: parsed.report_date || null,
      concise_summary: parsed.concise_summary || "Report extracted and organized for patient records.",
      key_findings: Array.isArray(parsed.key_findings) ? parsed.key_findings : [],
      measurements: Array.isArray(parsed.measurements)
        ? parsed.measurements.map((m: any) => ({
            name: String(m.name || "Test"),
            value: String(m.value || "unavailable"),
            unit: String(m.unit || ""),
            reference_range: String(m.reference_range || "unavailable"),
            status: ["normal", "low", "high", "inconclusive", "unavailable"].includes(m.status)
              ? m.status
              : "inconclusive",
          }))
        : [],
      out_of_range_observations: Array.isArray(parsed.out_of_range_observations)
        ? parsed.out_of_range_observations
        : [],
      medical_terms_explained: Array.isArray(parsed.medical_terms_explained)
        ? parsed.medical_terms_explained.map((j: any) => ({
            term: String(j.term || ""),
            explanation: String(j.explanation || ""),
          }))
        : [],
      suggested_questions_for_doctor: Array.isArray(parsed.suggested_questions_for_doctor)
        ? parsed.suggested_questions_for_doctor.map(String)
        : [],
      limitations_and_disclaimer:
        parsed.limitations_and_disclaimer ||
        "This summary was generated by MedVault AI for informational and organizational purposes only. It is not a clinical diagnosis or treatment recommendation. Always consult your qualified healthcare provider.",
    };

    // 11. Save analysis into public.report_analyses (update existing if present, else insert)
    let savedAnalysis: any = null;

    if (existingAnalysis?.id) {
      const { data, error: updateError } = await adminClient
        .from("report_analyses")
        .update({
          model_provider: "google",
          model_name: "gemini-2.5-flash",
          summary: validatedFindings.concise_summary,
          structured_findings: validatedFindings,
          analysis_status: "completed",
        })
        .eq("id", existingAnalysis.id)
        .select()
        .single();

      if (updateError) {
        console.error("[Database Error] Could not update report_analyses:", updateError.message);
        throw new Error("Failed to update report analysis in database.");
      }
      savedAnalysis = data;
    } else {
      const { data, error: insertError } = await adminClient
        .from("report_analyses")
        .insert({
          patient_id: userId,
          medical_record_id: medical_record_id,
          model_provider: "google",
          model_name: "gemini-2.5-flash",
          summary: validatedFindings.concise_summary,
          structured_findings: validatedFindings,
          analysis_status: "completed",
        })
        .select()
        .single();

      if (insertError) {
        console.error("[Database Error] Could not insert report_analyses:", insertError.message);
        throw new Error("Failed to store report analysis in database.");
      }
      savedAnalysis = data;
    }

    // 12. Update medical_records processing_status to completed
    await adminClient
      .from("medical_records")
      .update({ processing_status: "completed" })
      .eq("id", medical_record_id);

    return new Response(
      JSON.stringify({
        cached: false,
        analysis: savedAnalysis,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    console.error("[Unhandled Exception in analyze-medical-report]", errorMsg);

    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
