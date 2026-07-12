import {
  getImageFromBlob,
  getImageFromSupabase,
  imageResponse,
  isValidFilename,
} from '../../_lib/blob-images.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const filename = url.pathname.replace(/^\/api\/images\//, '');

  if (!isValidFilename(filename)) {
    return new Response('Invalid filename', { status: 400 });
  }

  let buffer = await getImageFromBlob(filename);
  if (!buffer) {
    buffer = await getImageFromSupabase(filename);
  }
  if (!buffer) {
    return new Response('Image not found', { status: 404 });
  }

  return imageResponse(buffer, filename);
}
