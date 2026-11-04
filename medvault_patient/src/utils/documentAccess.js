import { createClient } from './supabase/client.js';

/**
 * Generates a short-lived (5-minute) signed URL for an authenticated user's private medical record.
 * Never persists the signed URL to the database.
 * Preserves Storage RLS policies.
 *
 * @param {string} storagePath - The relative path in the medical-records bucket (<uid>/records/<uuid>.<ext>)
 * @param {number} [expiresIn=300] - Expiration in seconds (default 300 = 5 minutes)
 * @returns {Promise<{ signedUrl: string|null, error: Error|null }>}
 */
export async function getSignedDocumentUrl(storagePath, expiresIn = 300) {
  if (!storagePath) {
    return { signedUrl: null, error: new Error('Storage path is required to view document.') };
  }

  const supabase = createClient();

  try {
    // 1. Verify active authenticated session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session?.user?.id) {
      return { signedUrl: null, error: new Error('Please sign in to access your medical records.') };
    }

    const currentUserId = sessionData.session.user.id;

    // 2. Validate path ownership convention before network call (<userId>/records/...)
    if (!storagePath.startsWith(`${currentUserId}/`)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Security Warning] User attempted to generate signed URL for path not matching auth.uid():', {
          currentUserId,
          targetPath: storagePath,
        });
      }
      return { signedUrl: null, error: new Error('Access denied: You do not have permission to view this document.') };
    }

    // 3. Request signed URL from private medical-records bucket
    const { data, error } = await supabase.storage
      .from('medical-records')
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Document Access Debug] createSignedUrl failed:', {
          storagePath,
          errorCode: error?.statusCode,
          errorMessage: error?.message,
        });
      }
      return {
        signedUrl: null,
        error: new Error(error?.message || 'Unable to generate secure view link for document.'),
      };
    }

    return { signedUrl: data.signedUrl, error: null };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Document Access Debug] Unexpected exception in getSignedDocumentUrl:', err);
    }
    return { signedUrl: null, error: new Error(err.message || 'An unexpected error occurred.') };
  }
}

/**
 * Downloads a private document directly via authenticated blob download,
 * triggering a browser save dialog with the original or sensible filename.
 *
 * @param {string} storagePath - Relative path in medical-records bucket.
 * @param {string} [filename='medical_record'] - Suggested filename for download.
 * @returns {Promise<{ success: boolean, error: Error|null }>}
 */
export async function downloadDocument(storagePath, filename = 'medical_record') {
  if (!storagePath) {
    return { success: false, error: new Error('Storage path is required to download document.') };
  }

  const supabase = createClient();

  try {
    // 1. Verify active session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session?.user?.id) {
      return { success: false, error: new Error('Please sign in to download your records.') };
    }

    const currentUserId = sessionData.session.user.id;
    if (!storagePath.startsWith(`${currentUserId}/`)) {
      return { success: false, error: new Error('Access denied: You do not have permission to download this document.') };
    }

    // 2. Fetch authenticated blob directly from Storage
    const { data: blob, error } = await supabase.storage
      .from('medical-records')
      .download(storagePath);

    if (error || !blob) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Document Access Debug] Storage download failed:', error);
      }
      return {
        success: false,
        error: new Error(error?.message || 'Unable to download file from secure storage.'),
      };
    }

    // 3. Trigger browser download via object URL
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename || 'medical_record';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up memory
    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 1000);

    return { success: true, error: null };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Document Access Debug] Unexpected exception during download:', err);
    }
    return { success: false, error: new Error(err.message || 'Download failed.') };
  }
}
