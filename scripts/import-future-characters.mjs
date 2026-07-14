import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import YAML from 'yaml';

const root = resolve(import.meta.dirname, '..');
const records = JSON.parse(readFileSync(join(root, 'src/data/future-characters.json'), 'utf8'));
const outputDir = join(root, 'src/content/characters');
const translit = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
const slugify = (name) => name.toLocaleLowerCase('ru').split('').map((char) => translit[char] ?? char).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

mkdirSync(outputDir, { recursive: true });
for (const record of records) {
  const slug = record.slug ?? slugify(record.name);
  const aliases = [...new Set([record.name, record.sourceName].filter(Boolean))];
  const data = {
    name: record.name,
    slug,
    role: record.role ?? 'Неизвестно',
    group: record.group ?? 'Баровия',
    status: record.status ?? 'Ещё не встречен',
    aliases,
    featured: false,
    currentRelation: { positive: 0, negative: 0 },
    relationLabel: 'Коэл ещё не встречал этого персонажа.',
    tags: ['будущий персонаж', (record.group ?? 'Баровия').toLocaleLowerCase('ru')],
    relatedCharacters: [],
    relatedSessions: [],
    relationHistory: [],
  };
  const body = 'Коэл ещё не встречал этого персонажа. Запись сохранена в архиве заранее и будет дополнена после первой встречи.';
  writeFileSync(join(outputDir, `${slug}.md`), `---\n${YAML.stringify(data).trim()}\n---\n\n${body}\n`);
}

console.log(`Imported ${records.length} future characters from Roll20 assets.`);
