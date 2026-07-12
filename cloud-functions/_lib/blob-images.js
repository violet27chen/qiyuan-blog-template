import { getStore } from '@edgeone/pages-blob';

const STORE_NAME = process.env.BLOB_STORE_NAME || 'resource-images';

function guessContentType(filename) {
  const ext = String(filename).split('.').pop()?.toLowerCase() || '';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'avif') return 'image/avif';
  return 'application/octet-stream';
}

function getStoreInstance() {
  return getStore(STORE_NAME);
}

export async function getImageFromBlob(filename) {
  try {
    const data = await getStoreInstance().get(filename, { type: 'arrayBuffer' });
    return data || null;
  } catch {
    return null;
  }
}

export async function putImageToBlob(filename, buffer) {
  try {
    await getStoreInstance().set(filename, buffer);
    return true;
  } catch {
    return false;
  }
}

export async function getImageFromSupabase(filename) {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
  if (!supabaseUrl || !supabaseKey) return null;

  const response = await fetch(`${supabaseUrl}/storage/v1/object/product-images/${filename}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });
  if (!response.ok) return null;
  return response.arrayBuffer();
}

export async function putImageToSupabase(filename, buffer, contentType) {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
  if (!supabaseUrl || !supabaseKey) return false;

  const response = await fetch(`${supabaseUrl}/storage/v1/object/product-images/${filename}`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': contentType || guessContentType(filename),
    },
    body: buffer,
  });
  return response.ok;
}

export function imageResponse(buffer, filename) {
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': guessContentType(filename),
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}

export function isValidFilename(filename) {
  return !!filename && !filename.includes('..') && !filename.includes('/');
}
