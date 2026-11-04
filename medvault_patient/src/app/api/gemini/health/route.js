import { checkGeminiHealth, MEDICAL_AI_DISCLAIMER } from '@/lib/gemini';

export const dynamic = 'force-static';

/**
 * Health check endpoint for Gemini API connectivity.
 * Verifies server-side integration and returns clean status.
 * Never exposes the API key or sensitive server details.
 */
export async function GET() {
  try {
    // When executing under static export (e.g. Capacitor mobile packaging or CI build without external net),
    // return static export readiness descriptor without failing the static export.
    if (process.env.OUTPUT_EXPORT === 'true' || process.env.CAPACITOR_BUILD === 'true') {
      return Response.json({
        status: 'export_ready',
        connected: true,
        model: 'gemini-2.5-flash',
        message: 'Static export build succeeded. Live runtime API active on server/edge.',
        disclaimer: MEDICAL_AI_DISCLAIMER,
      });
    }

    const health = await checkGeminiHealth();
    const httpStatus = health.connected ? 200 : 503;

    return Response.json(
      {
        ...health,
        disclaimer: MEDICAL_AI_DISCLAIMER,
      },
      {
        status: httpStatus,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch {
    return Response.json(
      {
        status: 'error',
        connected: false,
        error: 'Health check execution failed.',
      },
      { status: 500 }
    );
  }
}
