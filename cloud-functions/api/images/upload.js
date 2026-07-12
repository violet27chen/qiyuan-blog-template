import { putImageToBlob, putImageToSupabase, isValidFilename } from '../../_lib/blob-images.js';

function extFromContentType(contentType) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('image/jpeg')) return 'jpg';
  if (ct.includes('image/png')) return 'png';
  if (ct.includes('image/webp')) return 'webp';
  if (ct.includes('image/gif')) return 'gif';
  if (ct.includes('image/avif')) return 'avif';
  return '';
}

function safeFilename(name) {
  return String(name || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export async function onRequestPost({ request }) {
  const publishKey = process.env.PUBLISH_KEY || '';
  const token = String(request.headers.get('X-PUBLISH-KEY') || '').trim();
  if (!publishKey || token !== publishKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const headerName = request.headers.get('X-Image-Name');
  const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
  const buffer = await request.arrayBuffer();

  if (!buffer || buffer.byteLength === 0) {
    return new Response(JSON.stringify({ error: 'Empty body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (buffer.byteLength > 5 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'File too large' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ext = extFromContentType(contentType);
  const filename = safeFilename(
    headerName || `product_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext ? `.${ext}` : ''}`,
  );
  if (!isValidFilename(filename)) {
    return new Response(JSON.stringify({ error: 'Invalid filename' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stored =
    (await putImageToBlob(filename, buffer)) ||
    (await putImageToSupabase(filename, buffer, contentType));
  if (!stored) {
    return new Response(JSON.stringify({ error: 'Image upload failed' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ url: `/api/images/${filename}`, filename }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
