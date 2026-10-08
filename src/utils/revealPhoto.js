export const readFileData = file => new Promise((resolve,reject) => {
  const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read the photo.')); reader.readAsDataURL(file);
});
export async function readRevealPhoto(file) {
  if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 20*1024*1024) throw new Error('Choose a JPG, PNG or WebP photo up to 20 MB.');
  const original = await readFileData(file);
  const image = new Image(); image.src = original;
  try { await image.decode(); } catch { throw new Error('This photo could not be opened. Try another picture.'); }
  if (file.size <= 4*1024*1024) return original;
  const scale = Math.min(1,2400/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(image.naturalWidth*scale); canvas.height = Math.round(image.naturalHeight*scale);
  const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0,0,canvas.width,canvas.height); context.drawImage(image,0,0,canvas.width,canvas.height);
  for (const quality of [.92,.82,.7,.55]) { const url = canvas.toDataURL('image/jpeg',quality); if (url.length <= 5.5*1024*1024) return url; }
  throw new Error('Choose a smaller photo.');
}
