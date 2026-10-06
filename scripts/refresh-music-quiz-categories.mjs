import { readFile, writeFile } from 'node:fs/promises';

// Filenames collected from the actual Supabase folder listings.
const folders = JSON.parse(await readFile(new URL('./music-quiz-files.json', import.meta.url), 'utf8'));
const base = 'https://lwjxwrbzvvteywewpmlu.supabase.co/storage/v1/object/public/songs/';
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
