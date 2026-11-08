import { readFile, writeFile } from 'node:fs/promises';

// Filenames of the clips uploaded to the R2 category folders.
const folders = JSON.parse(await readFile(new URL('./music-quiz-files.json', import.meta.url), 'utf8'));
const base = 'https://pub-082c7a4ec353488c8d34b6a1250cbee1.r2.dev/';
const songs = Object.entries(folders).flatMap(([category, files]) => files.map(value => {
  const filename = value.replace(/ actions$/, '');
  const label = filename.replace(/\.(mp3|m4a)$/i, '');
  const separator = label.indexOf(' - ');
  if (separator < 1) throw new Error(`Missing artist/title separator: ${filename}`);
  return {
    artist: label.slice(0, separator).trim(),
    title: label.slice(separator + 3).trim(),
    category,
    audio_url: `${base}${encodeURIComponent(category)}/${encodeURIComponent(filename)}`,
  };
}));
await writeFile(new URL('../public/music-quiz-catalog.json', import.meta.url), JSON.stringify(songs, null, 2) + '\n');
console.log(`Updated ${songs.length} songs across ${Object.keys(folders).length} categories.`);
