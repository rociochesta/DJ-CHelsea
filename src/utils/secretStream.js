export function streamPosition(stream, now = Date.now()) {
  const position = Math.max(0, Number(stream?.position) || 0);
  return position + (stream?.playing ? Math.max(0, now - (Number(stream.updatedAt) || now)) / 1000 : 0);
}

export function streamUrl(value) {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:') throw new Error('Use a direct HTTPS video URL.');
  return url.href;
}

export function srtToVtt(source) {
  const blocks = source.trim().replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/);
  const cues = blocks.map(block => {
    const lines = block.split('\n');
    if (/^\d+$/.test(lines[0].trim())) lines.shift();
    const timing = lines.shift()?.trim().match(/^(\d{2,}:\d{2}:\d{2})[,.](\d{3})\s*-->\s*(\d{2,}:\d{2}:\d{2})[,.](\d{3})$/);
    if (!timing || !lines.length) throw new Error('Check the SRT file. Each subtitle needs a time range and text.');
    return [`${timing[1]}.${timing[2]} --> ${timing[3]}.${timing[4]}`, ...lines].join('\n');
  });
  return 'WEBVTT\n\n' + cues.join('\n\n') + '\n';
}
