/** Helper upload/hapus file ke Google Drive lewat Apps Script */

export const APPS_SCRIPT_UPLOAD_URL =
  process.env.NEXT_PUBLIC_APPS_SCRIPT_UPLOAD_URL ||
  'https://script.google.com/macros/s/AKfycbzsgVLOdolmwHPN8M5dUmvsjN4uAf6UJqxw5qKPv5lRVpuOS9-LpG0TS2ZsSbyNOayd/exec';

export type UploadJenis = 'dokumen' | 'galeri';

export type UploadResult = {
  success: boolean;
  fileId?: string;
  name?: string;
  url?: string;
  directUrl?: string;
  error?: string;
  [key: string]: unknown;
};

export type DeleteResult = {
  success: boolean;
  fileId?: string;
  message?: string;
  warning?: string;
  error?: string;
};

/** Ambil fileId dari URL Drive / string id */
export function extractDriveFileId(value: string | undefined | null): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  let m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m?.[1]) return m[1];

  m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m?.[1]) return m[1];

  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m?.[1]) return m[1];

  if (/^[a-zA-Z0-9_-]{25,}$/.test(s)) return s;

  return null;
}

export function getUploadedFileUrl(result: UploadResult): string {
  const directValue = [
    result.viewUrl,
    result.webViewLink,
    result.url,
    result.fileUrl,
    result.link,
    result.directUrl,
    result.downloadUrl,
  ].find((value) => typeof value === 'string' && value.trim());
  if (directValue) return String(directValue).trim();
  if (result.fileId) return `https://drive.google.com/uc?export=download&id=${result.fileId}`;
  return '';
}

export function getDrivePreviewUrl(value: string | undefined | null): string {
  if (!value) return '#';
  const trimmed = String(value).trim();
  if (!trimmed) return '#';
  if (trimmed.includes('/preview') || trimmed.includes('/view')) return trimmed;
  const match = trimmed.match(/(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{10,})/);
  if (match?.[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return trimmed;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadToDrive(
  file: File,
  jenis: UploadJenis
): Promise<UploadResult> {
  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) {
    return { success: false, error: 'Ukuran file maksimal 20 MB.' };
  }

  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  if (jenis === 'dokumen' && !documentTypes.includes(file.type)) {
    return { success: false, error: 'Dokumen harus berupa PDF atau berkas Office.' };
  }

  if (jenis === 'galeri' && !file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    return { success: false, error: 'File galeri harus berupa gambar atau video.' };
  }

  const base64 = await fileToBase64(file);

  const res = await fetch(APPS_SCRIPT_UPLOAD_URL, {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      data: base64,
      jenis,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    return {
      success: false,
      error:
        res.status === 404
          ? 'URL deployment Apps Script tidak ditemukan. Perbarui NEXT_PUBLIC_APPS_SCRIPT_UPLOAD_URL dengan URL Web App terbaru.'
          : `Upload gagal (${res.status}): ${text.slice(0, 200)}`,
    };
  }

  let json: UploadResult;
  try {
    json = JSON.parse(text);
  } catch {
    return { success: false, error: 'Response Apps Script tidak valid: ' + text.slice(0, 200) };
  }

  const uploadedUrl = getUploadedFileUrl(json);
  if (!json.success && !uploadedUrl) return json;

  return {
    ...json,
    success: true,
    url: uploadedUrl || json.url,
  };
}

/** Hapus file di Google Drive via Apps Script */
export async function deleteFromDrive(fileIdOrUrl: string): Promise<DeleteResult> {
  const fileId = extractDriveFileId(fileIdOrUrl);
  if (!fileId) {
    return { success: false, error: 'fileId tidak valid' };
  }

  try {
    const res = await fetch(APPS_SCRIPT_UPLOAD_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete',
        fileId,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      return {
        success: false,
        fileId,
        error: `Gagal hapus Drive (${res.status}): ${text.slice(0, 200)}`,
      };
    }

    let json: DeleteResult;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        success: false,
        fileId,
        error: 'Response Apps Script tidak valid: ' + text.slice(0, 200),
      };
    }

    return {
      success: !!json.success,
      fileId,
      message: json.message,
      warning: json.warning,
      error: json.error,
    };
  } catch (err) {
    return {
      success: false,
      fileId,
      error: (err as Error).message || 'Gagal menghubungi Apps Script',
    };
  }
}