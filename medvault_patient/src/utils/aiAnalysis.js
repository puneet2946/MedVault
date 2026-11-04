import { createClient } from './supabase/client.js';

/**
 * Retrieves an existing saved analysis from public.report_analyses for a medical record.
 * RLS ensures patients can only select their own analyses.
 *
 * @param {string} medicalRecordId - UUID of the medical record.
 * @returns {Promise<{ analysis: Object|null, error: Error|null }>}
 */
export async function fetchSavedAnalysis(medicalRecordId) {
  if (!medicalRecordId) {
    return { analysis: null, error: new Error('medicalRecordId is required.') };
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('report_analyses')
      .select('*')
      .eq('medical_record_id', medicalRecordId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[AI Analysis Debug] Could not fetch saved analysis:', error.message);
      }
      return { analysis: null, error: new Error(error.message) };
    }

    return { analysis: data, error: null };
  } catch (err) {
    return { analysis: null, error: new Error(err.message || 'Error querying report analysis.') };
  }
}

/**
 * Invokes the Supabase Edge Function `analyze-medical-report` with the caller's JWT.
 * Privileged analysis runs server-side on Supabase Edge runtime with the GEMINI_API_KEY secret.
 *
 * @param {string} medicalRecordId - UUID of the medical record to analyze.
 * @returns {Promise<{ analysis: Object|null, cached: boolean, error: Error|null, isPendingDeployment?: boolean }>}
 */
export async function runMedicalReportAnalysis(medicalRecordId) {
  if (!medicalRecordId) {
    return { analysis: null, cached: false, error: new Error('medicalRecordId is required.') };
  }

  const supabase = createClient();

  try {
    // 1. Verify active authenticated session
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (sessionErr || !token) {
      return {
        analysis: null,
        cached: false,
        error: new Error('Please sign in to analyze your medical records.'),
      };
    }

    // 2. Check first if a completed analysis is already saved in the database
    const { analysis: existing } = await fetchSavedAnalysis(medicalRecordId);
    if (existing && existing.analysis_status === 'completed') {
      return {
        analysis: existing,
        cached: true,
        error: null,
      };
    }

    // 3. Invoke Supabase Edge Function: analyze-medical-report
    const { data, error } = await supabase.functions.invoke('analyze-medical-report', {
      body: { medical_record_id: medicalRecordId },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[AI Analysis Debug] Edge Function invocation returned error:', error);
      }

      let parsedMessage = error.message || '';

      // Try reading body from response context if present
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errBody = await error.context.json();
          if (errBody?.error) {
            parsedMessage = errBody.error;
          }
        } catch {
          // ignore parsing error
        }
      }

      // Check for common Edge function deployment/configuration errors
      const isFunctionNotFound =
        parsedMessage.includes('Failed to send a request to the Edge Function') ||
        parsedMessage.includes('404') ||
        parsedMessage.includes('relay error');

      if (isFunctionNotFound) {
        return {
          analysis: null,
          cached: false,
          isPendingDeployment: true,
          error: new Error(
            'The MedVault AI Edge Function is not yet deployed on your Supabase project. Deploy it using: supabase functions deploy analyze-medical-report'
          ),
        };
      }

      return {
        analysis: null,
        cached: false,
        error: new Error(parsedMessage || 'AI analysis request failed.'),
      };
    }

    if (data?.error) {
      return {
        analysis: null,
        cached: false,
        error: new Error(data.error),
      };
    }

    return {
      analysis: data?.analysis || null,
      cached: !!data?.cached,
      error: null,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[AI Analysis Debug] Exception running analysis:', err);
    }
    return {
      analysis: null,
      cached: false,
      error: new Error(err.message || 'An unexpected error occurred while communicating with MedVault AI.'),
    };
  }
}
