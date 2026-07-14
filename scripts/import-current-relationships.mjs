import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import YAML from 'yaml';

const root = resolve(import.meta.dirname, '..');
const sourceFile = join(root, 'source/Текущие отношения — персонажи.csv');
const scaleFile = join(root, 'source/Текущие отношения — градация.csv');
const characterDir = join(root, 'src/content/characters');

const parseCsv = (text) => {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(value); value = ''; }
    else if (char === '\n') { row.push(value.replace(/\r$/, '')); rows.push(row); row = []; value = ''; }
    else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
};

const translit = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
const slugify = (name) => name.toLocaleLowerCase('ru').split('').map((char) => translit[char] ?? char).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const slugs = {
  'Нико':'niko','Альбедо':'albedo','Тана':'tana','Эрагон':'eragon','Аластор (команда)':'alastor',
  'Велиар':'veliar','Ирина':'irina','Варгас Валлакович':'vargas','Аластор (реформатор)':'alastor-reformer',
  'Розмари':'rosemary','Эшер':'esher','Рахадин':'rahadin',
};
const roles = { 'Аластор (команда)':'Следопыт команды', 'Аластор (реформатор)':'Реформатор' };
const imageAliases = {
  irina: ['Ирина Коляна'],
  ismark: ['Исмарк Колянович'],
  esher: ['Эшер Беласко'],
  sholdar: ['Шольдар Шольдарович'],
  zuleyka: ['Зулейка Торанеску'],
  'gadof-blinskiy': ['Гадоф "GodOff" Блинский'],
  'otets-donovich': ['Отец Донавич [МЕРТВ]'],
  doru: ['Дору (порождение) [МЕРТВ]'],
  arrabel: ['Араббель'],
};
const parseNumber = (value) => value?.trim() === '' ? null : Number(value);
const relation = (...values) => {
  const numbers = values.filter((value) => typeof value === 'number' && !Number.isNaN(value));
  return { positive: Math.max(0, ...numbers), negative: Math.min(0, ...numbers) };
};
const parsePrevious = (value) => {
  if (!value?.trim()) return null;
  const numbers = [...value.matchAll(/[+-]?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  return numbers.length ? relation(...numbers) : null;
};
const sameRelation = (a, b) => a && b && a.positive === b.positive && a.negative === b.negative;

const rows = parseCsv(readFileSync(sourceFile, 'utf8'));
let group = 'Персонажи игроков';
let imported = 0;
for (const row of rows) {
  const [name, primaryRaw, secondaryRaw, previousRaw, descriptionRaw] = row;
  if (!name || name === 'Имя' || name === 'Персонажи игроков') continue;
  const primary = parseNumber(primaryRaw);
  const secondary = parseNumber(secondaryRaw);
  if (primary === null && secondary === null) { group = name.trim(); continue; }

  const slug = slugs[name] ?? slugify(name);
  const path = join(characterDir, `${slug}.md`);
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const parsed = existing.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const data = parsed ? YAML.parse(parsed[1]) : {};
  const oldBody = parsed?.[2]?.trim() ?? '';
  const description = descriptionRaw?.trim() || oldBody || 'Наблюдений пока недостаточно.';
  const current = relation(primary, secondary);
  const previous = parsePrevious(previousRaw);
  const history = Array.isArray(data.relationHistory) ? data.relationHistory.filter((point) => point.label !== 'Текущее обновление') : [];
  if (previous && !history.some((point) => sameRelation(point, previous))) {
    history.push({ label: 'Предыдущее значение из таблицы', ...previous, note: 'Значение до текущего обновления.' });
  }
  history.push({ label: 'Текущее обновление', ...current, note: description });

  const aliases = [...new Set([...(data.aliases ?? []), name.replace(/\s*\([^)]*\)\s*$/, ''), ...(imageAliases[slug] ?? [])])];
  const tags = [...new Set([...(data.tags ?? []), group.toLocaleLowerCase('ru'), current.negative < 0 ? 'напряжение' : current.positive > 0 ? 'симпатия' : 'нейтральность'])];
  const relationLabel = description.split(/(?<=[.!?])\s+/)[0].slice(0, 180);
  const status = name === 'Тана' ? 'Погиб' : name === 'Веся' ? 'Погибла' : data.status ?? 'Неизвестно';
  const output = {
    ...data,
    name,
    slug,
    aliases,
    role: roles[name] ?? data.role ?? 'Неизвестно',
    group,
    status,
    featured: data.featured ?? false,
    currentRelation: current,
    relationLabel,
    tags,
    relatedCharacters: data.relatedCharacters ?? [],
    relatedSessions: data.relatedSessions ?? [],
    relationHistory: history,
  };
  writeFileSync(path, `---\n${YAML.stringify(output).trim()}\n---\n\n${description}\n`);
  imported += 1;
}

const scaleLines = parseCsv(readFileSync(scaleFile, 'utf8')).flat().map((line) => line.trim()).filter(Boolean);
const scale = scaleLines.map((line) => {
  const match = line.match(/^"?([+-]?\d+)\s+—\s+([^:]+):\s*(.+?)"?$/);
  return match ? { value: Number(match[1]), label: match[2], description: match[3] } : null;
}).filter(Boolean);
writeFileSync(join(root, 'src/data/relation-scale.json'), `${JSON.stringify(scale, null, 2)}\n`);
console.log(`Imported ${imported} current character relationships with complete notes.`);
