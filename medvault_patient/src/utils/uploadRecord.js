import { createClient } from './supabase/client.js';

/**
 * Valid record types allowed in public.medical_records enum check
 */
export const VALID_RECORD_TYPES = [
  'lab_report',
  'prescription',
  'imaging',
  'discharge_summary',
  'vaccination',
  'insurance',
  'other',
];

/**
 * Safely generates a standard UUID v4 string with browser/environment fallbacks.
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Extracts and sanitizes file extension.
 */
export function getSanitizedExtension(file) {
  if (!file) return 'bin';
  const nameParts = file.name ? file.name.split('.') : [];
  let ext = '';
  if (nameParts.length > 1) {
    ext = nameParts.pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  if (!ext) {
    const mimeMap = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'image/heif': 'heif',
    };
    ext = mimeMap[file.type] || 'bin';
  }
  return ext;
}

/**
 * Maps a file or requested type to a valid database record_type enum.
 */
export function resolveRecordType(file, requestedType) {
  if (requestedType && VALID_RECORD_TYPES.includes(requestedType)) {
    return requestedType;
  }
  const ext = getSanitizedExtension(file);
  const isImage = file.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext);
  if (isImage) {
    return 'imaging';
  }
  const isPdf = file.type === 'application/pdf' || ext === 'pdf';
  if (isPdf) {
    return 'lab_report';
  }
  return 'other';
}

/**
 * Uploads a medical record file to Supabase Storage and inserts metadata into public.medical_records.
 * Conforms strictly to storage policy: <authenticated-user-uuid>/records/<document-uuid>.<extension>
 * Automatically rolls back Storage upload if database insert fails.
 *
 * @param {File|Blob} file - The file to upload.
 * @param {Object} [options] - Optional configurations.
 * @param {string} [options.title] - Custom record title.
 * @param {string} [options.recordType] - Specific record_type enum.
 * @param {string} [options.processingStatus='completed'] - Status ('pending' | 'processing' | 'completed' | 'failed').
 * @returns {Promise<{ data: Object|null, error: Error|null }>}
 */
export async function uploadMedicalRecord(file, options = {}) {
  if (!file) {
    return { data: null, error: new Error('No file provided for upload.') };
  }

  // 1. File size validation (max 20MB)
  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return {
      data: null,
      error: new Error('File too large. Maximum file size is 20MB.'),
    };
  }

  if (file.size <= 0) {
    return {
      data: null,
      error: new Error('Invalid file. File size must be greater than 0.'),
    };
  }

  const supabase = createClient();

  // 2. Validate active, non-expired session
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session?.user?.id) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Upload Debug] Auth session check failed:', {
          operation: 'supabase.auth.getSession',
          errorMessage: sessionError?.message || 'No active session',
        });
      }
      return {
        data: null,
        error: new Error('Please sign in to upload records.'),
      };
    }

    const userId = sessionData.session.user.id;

    // 3. Build Storage path strictly conforming to policy:
    // <authenticated-user-uuid>/records/<document-uuid>.<extension>
    const documentId = generateUUID();
    const extension = getSanitizedExtension(file);
    const storagePath = `${userId}/records/${documentId}.${extension}`;

    const originalFilename = (file.name || `record_${documentId}.${extension}`)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 255);

    const title = (
      options.title ||
      file.name?.replace(/\.[^/.]+$/, '') ||
      'Medical Record'
    )
      .trim()
      .slice(0, 255);

    const recordType = resolveRecordType(file, options.recordType);
    const mimeType = file.type || 'application/octet-stream';
    const processingStatus = options.processingStatus || 'completed';

    // 4. Operation A: Upload to Supabase Storage
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Upload Debug] Uploading to Supabase Storage:', {
        operation: 'Supabase Storage upload to storage.objects',
        bucket: 'medical-records',
        storagePath,
        fileSize: file.size,
        mimeType,
      });
    }

    const { error: storageError } = await supabase.storage
      .from('medical-records')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: mimeType,
      });

    if (storageError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Upload Debug] Storage upload operation failed (Operation A):', {
          operation: 'Supabase Storage upload to storage.objects',
          bucket: 'medical-records',
          storagePath,
          statusCode: storageError.statusCode,
          errorCode: storageError.error,
          errorMessage: storageError.message,
        });
      }
      return {
        data: null,
        error: new Error(
          storageError.message?.includes('security policy')
            ? 'Storage permission denied: Path or permissions violate storage security policy.'
            : `Storage upload failed: ${storageError.message || 'Storage error'}`
        ),
      };
    }

    // 5. Operation B: Insert into public.medical_records
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Upload Debug] Inserting row into public.medical_records:', {
        operation: 'INSERT into public.medical_records',
        recordId: documentId,
        patientId: userId,
        recordType,
        storagePath,
      });
    }

    const { data: recordRow, error: dbError } = await supabase
      .from('medical_records')
      .insert({
        id: documentId,
        patient_id: userId,
        title,
        record_type: recordType,
        storage_path: storagePath,
        original_filename: originalFilename,
        mime_type: mimeType,
        file_size: file.size,
        processing_status: processingStatus,
      })
      .select()
      .single();

    if (dbError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Upload Debug] Database insert failed (Operation B):', {
          operation: 'INSERT into public.medical_records',
          errorCode: dbError.code,
          errorMessage: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
        });
      }

      // Rollback: Delete uploaded storage object so bucket stays clean
      try {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Upload Debug] Rolling back uploaded storage object after DB failure:', storagePath);
        }
        const { error: rollbackError } = await supabase.storage
          .from('medical-records')
          .remove([storagePath]);

        if (rollbackError && process.env.NODE_ENV !== 'production') {
          console.warn('[Upload Debug] Storage rollback warning:', rollbackError.message);
        }
      } catch (rollbackEx) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Upload Debug] Storage rollback exception:', rollbackEx);
        }
      }

      return {
        data: null,
        error: new Error(`Database save failed: ${dbError.message || 'Unable to save record metadata'}`),
      };
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Upload Debug] Upload and database insert succeeded:', {
        recordId: recordRow.id,
        storagePath: recordRow.storage_path,
      });
    }

    return {
      data: recordRow,
      error: null,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Upload Debug] Unexpected exception during medical record upload:', err);
    }
    return {
      data: null,
      error: new Error(err.message || 'An unexpected error occurred during upload.'),
    };
  }
}

