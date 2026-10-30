import fs from 'node:fs';
import path from 'node:path';

// Asset 1 is the background; every other SVG is an overlay supplied by the artist.
const source = 'assets/Tiles';
const target = 'public/lovopoly/catalog';
const catalogPath = 'src/data/lovopolyPlaces.json';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
// The JSON owns titles, descriptions and category pools. Sync only updates artwork.
const used = new Set();
for (const place of catalog.places) {
  const folder = place.sourceFolder || (Number.isInteger(place.originalSlot) ? String(place.originalSlot) : `${place.category}/${place.id.split('-').at(-1)}`);
  if(!path.resolve(source,folder).startsWith(path.resolve(source)+path.sep))throw Error(`Invalid source folder: ${folder}`);
  const files = fs.readdirSync(`${source}/${folder}`);
  const base = files.find(f => /^asset\s*1\.svg$/i.test(f))
    || files.find(f => /\.png$/i.test(f) && !f.includes('background'));
  if (!base) throw Error(`Missing base artwork: ${folder}`);
  const animations = files.includes('compiled-overlay.svg') ? ['compiled-overlay.svg']
    : files.filter(f => /\.svg$/i.test(f) && f !== base && f !== 'complete-scene.svg');
  place.image = `/lovopoly/catalog/${folder}/${base}`;
  place.animations = animations.map(f => ({src: `/lovopoly/catalog/${folder}/${f}`}));
  for (const file of [base, ...animations]) {
    const relative = `${folder}/${file}`;
    used.add(relative);
    fs.mkdirSync(`${target}/${folder}`, {recursive: true});
    fs.copyFileSync(`${source}/${relative}`, `${target}/${relative}`);
  }
}
// Remove obsolete generated copies only, never the user's source artwork.
for (const file of fs.readdirSync(target, {recursive: true})) {
  const relative = file.replaceAll('\\', '/');
  const absolute = path.resolve(target, file);
  if (!absolute.startsWith(path.resolve(target) + path.sep)) throw Error('Invalid output path');
  if (fs.statSync(absolute).isFile() && !used.has(relative)) fs.unlinkSync(absolute);
}
catalog.version = 2;
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Synced ${catalog.places.length} places and ${used.size} runtime assets.`);
