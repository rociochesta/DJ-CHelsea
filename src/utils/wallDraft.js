import {validWallVideoUrl} from './wallVideo.js';

export function insertWallEmoji(blocks, selection, emoji) {
  const index = blocks[selection.index]?.type === 'text' ? selection.index : blocks.findIndex(block => block.type === 'text');
  if (index < 0) return { blocks, selection };
  const text = blocks[index].text;
  const start = Math.min(text.length, selection.start ?? text.length);
  const end = Math.min(text.length, selection.end ?? start);
  return {
    blocks: blocks.map((block, i) => i === index ? { ...block, text: text.slice(0, start) + emoji + text.slice(end) } : block),
    selection: { index, start: start + emoji.length, end: start + emoji.length },
  };
}

export function insertWallMedia(blocks, textIndex, start, end, media) {
  const index = blocks[textIndex]?.type === 'text' ? textIndex : blocks.length - 1;
  const text = blocks[index]?.text || '';
  const before = text.slice(0, start ?? text.length);
  const after = text.slice(end ?? start ?? text.length);
  return [...blocks.slice(0, index), { type: 'text', text: before }, ...media,
    { type: 'text', text: after }, ...blocks.slice(index + 1)];
}

export function cleanWallDraft(blocks) {
  return blocks.flatMap(block => block.type === 'text'
    ? block.text.trim() ? [{ type: 'text', text: block.text.trim() }] : []
    : block.type === 'video' ? validWallVideoUrl(block.url) ? [{type:'video',url:block.url}] : []
    : block.type === 'youtube' ? /^[A-Za-z0-9_-]{11}$/.test(block.videoId || '') ? [{type:'youtube',videoId:block.videoId}] : []
    : [{ type: 'image', url: block.url, ...(block.mediaKind === 'doodle' ? { mediaKind: 'doodle' } : {}), ...(block.giphyId ? { giphyId: block.giphyId, sourceUrl: block.sourceUrl } : {}) }]);
}
