import fs from 'fs';
import { createReadStream } from 'fs';
import readline from 'readline';

const CSV_PATH = '/Users/bangmar/Downloads/Takeout/已保存/收藏的地点.csv';
const OUT_PATH = './src/data/google-places.json';

function parseCSVLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

async function geocode(name) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'PersonalWebsite/1.0 geocoder' } });
    const data = await res.json();
    if (data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch (e) {}
  return null;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const raw = fs.readFileSync(CSV_PATH, 'utf8');
const lines = raw.split('\n');

const places = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const fields = parseCSVLine(line);
  const title = fields[0]?.trim();
  const url = fields[2]?.trim();
  if (!title || !url) continue;
  places.push({ title, url });
}

console.log(`Found ${places.length} places, geocoding...`);

const results = [];
for (let i = 0; i < places.length; i++) {
  const { title, url } = places[i];
  await sleep(1100); // Nominatim rate limit: 1 req/sec
  const coords = await geocode(title);
  if (coords) {
    results.push({ id: String(i + 1), name: title, coordinates: coords, url });
    process.stdout.write(`[${i + 1}/${places.length}] ✓ ${title}\n`);
  } else {
    process.stdout.write(`[${i + 1}/${places.length}] ✗ ${title} (not found)\n`);
  }
}

fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
console.log(`\nDone: ${results.length}/${places.length} places geocoded → ${OUT_PATH}`);
