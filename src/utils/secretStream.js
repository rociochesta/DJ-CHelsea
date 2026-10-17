export function streamPosition(stream, now = Date.now()) {
  const position = Math.max(0, Number(stream?.position) || 0);
  return position + (stream?.playing ? Math.max(0, now - (Number(stream.updatedAt) || now)) / 1000 : 0);
}

export function streamUrl(value) {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:') throw new Error('Use a direct HTTPS video URL.');
  return url.href;
}
