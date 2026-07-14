import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = join(root, 'source');

const decodeXml = (value = '') => value
  .replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&apos;', "'")
  .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

const normalizeText = (value) => value
  .replaceAll('\r', '')
  .replace(/[\u2028\u2029]/g, '\n\n')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const docxText = (filename) => normalizeText(execFileSync('/usr/bin/textutil', ['-convert', 'txt', '-stdout', join(source, filename)], { encoding: 'utf8', maxBuffer: 10_000_000 }));

const yamlString = (value) => JSON.stringify(value);
const frontmatter = (data) => `---\n${Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : yamlString(value)}`).join('\n')}\n---\n\n`;

const diaryMeta = {
  22: {
    slug: 'session-22', cover: '/images/diary/session-22.png',
    excerpt: 'Первый день с новой группой: видение у водопада, погоня и бой у дома Ирины.',
    characters: ['koel', 'irina', 'tana', 'niko', 'albedo'], places: ['barovia-village'],
    tags: ['бой', 'нежить', 'видение', 'доверие', 'выбор'],
  },
  34: {
    slug: 'session-34', cover: '/images/diary/session-34.png',
    excerpt: 'Праздник в Валлаки, казнь невиновного и речь о достоинстве, которое не может отнять страх.',
    characters: ['koel', 'tana', 'niko', 'albedo', 'esher', 'vargas', 'irina'], places: ['vallaki'],
    tags: ['праздник', 'Валлаки', 'власть', 'выбор', 'свобода'],
    externalLinks: ['https://youtu.be/dBsdeL1wLlw?si=PJqMuP5PmXug9OPM'],
  },
  39: {
    slug: 'session-39', cover: '/images/diary/session-39.png',
    excerpt: 'После боя группа заняла таверну Мартиковых. Разговор с Эшером изменил доверие между ними.',
    characters: ['koel', 'esher', 'niko', 'irina', 'alastor', 'eragon', 'rahadin', 'veliar'], places: ['martikov-tavern', 'vallaki'],
    tags: ['отдых', 'доверие', 'вино', 'шрамы', 'близость', 'Равенлофт'],
  },
};

const diaryText = docxText('Дневник Коэла Ворна.docx');
const matches = [...diaryText.matchAll(/^Серия\s+(\d+)\s+-\s+(.+)$/gm)];
const diaryDir = join(root, 'src/content/diary');
mkdirSync(diaryDir, { recursive: true });
for (let index = 0; index < matches.length; index += 1) {
  const match = matches[index];
  const session = Number(match[1]);
  const title = match[2].trim().replace(/^./, (letter) => letter.toLocaleUpperCase('ru'));
  const start = match.index + match[0].length;
  const end = matches[index + 1]?.index ?? diaryText.length;
  let body = diaryText.slice(start, end).trim();
  body = body.replace(/^https?:\/\/\S+\s*/m, '').trim();
  const meta = diaryMeta[session];
  if (!meta) continue;
  writeFileSync(join(diaryDir, `${meta.slug}.md`), frontmatter({ title, slug: meta.slug, session, date: '', excerpt: meta.excerpt, cover: meta.cover, characters: meta.characters, places: meta.places, tags: meta.tags, externalLinks: meta.externalLinks ?? [] }) + body + '\n');
}

let backstory = docxText('Коэл Ворн — предыстория.docx');
const storyMarker = 'История Коэла Ворна';
backstory = backstory.slice(backstory.indexOf(storyMarker) + storyMarker.length).trim();
backstory = backstory.replace(new RegExp(`^${storyMarker}\\s*`), '').trim();
backstory = backstory
  .replace(/^Слабости и привязанности$/gm, '# Слабости и привязанности')
  .replace(/^(Страхи|Слабости|Привязанности)$/gm, '## $1')
  .replace(/^(\d+)\.\s+(.+)$/gm, '### $1. $2');
const libraryDir = join(root, 'src/content/library');
mkdirSync(libraryDir, { recursive: true });
writeFileSync(join(libraryDir, 'backstory.md'), frontmatter({ title: 'История Коэла Ворна', slug: 'backstory', kind: 'Предыстория', summary: 'Происхождение хранителя врат, Орден Осквернённых Душ, путь в Баровию, страхи, слабости и привязанности.', sourceFile: '/documents/koel-vorn-backstory.docx', tags: ['Коэл', 'предыстория', 'хранитель врат', 'Баровия', 'страхи', 'слабости', 'привязанности'] }) + backstory + '\n');

const worldviewDir = join(root, 'src/content/worldview');
const sections = [
  { category: 'Страхи', start: '## Страхи', end: '## Слабости', prefix: 'fear', icon: '◇', order: 10 },
  { category: 'Слабости', start: '## Слабости', end: '## Привязанности', prefix: 'weakness', icon: '†', order: 20 },
  { category: 'Привязанности', start: '## Привязанности', end: null, prefix: 'bond', icon: '❧', order: 30 },
];
for (const section of sections) {
  const start = backstory.indexOf(section.start) + section.start.length;
  const end = section.end ? backstory.indexOf(section.end) : backstory.length;
  const content = backstory.slice(start, end);
  const entries = [...content.matchAll(/^###\s+(\d+)\.\s+(.+)\n+([\s\S]*?)(?=^###\s+\d+\.|$)/gm)];
  for (const match of entries) {
    const number = Number(match[1]);
    const title = match[2].trim();
    const body = match[3].trim();
    const summary = body.split(/(?<=[.!?])\s+/)[0].slice(0, 220);
    const slug = `${section.prefix}-${number}`;
    const topicTags = {
      'fear-1': ['страхи', 'Баровия', 'приговор'], 'fear-2': ['страхи', 'ошибка', 'суждение'], 'fear-3': ['страхи', 'Страд', 'чудовища'],
      'weakness-1': ['слабости', 'контроль'], 'weakness-2': ['слабости', 'границы', 'решение'], 'weakness-3': ['слабости', 'незавершённость'],
      'bond-1': ['привязанности', 'Розмари', 'доверие'], 'bond-2': ['привязанности', 'принципы'], 'bond-3': ['привязанности', 'Веся', 'незавершённость'],
    };
    writeFileSync(join(worldviewDir, `${slug}.md`), frontmatter({ title, slug, icon: section.icon, summary, order: section.order + number, category: section.category, tags: topicTags[slug] ?? [section.category.toLocaleLowerCase('ru')] }) + body + '\n');
  }
}

const translit = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
const slugify = (name) => name.toLocaleLowerCase('ru').split('').map((char) => translit[char] ?? char).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const aliases = { 'Варгас Валлакович':'vargas', 'Розмари':'rosemary', 'Велиар':'veliar', 'Эшер':'esher', 'Рахадин':'rahadin', 'Аластор':'alastor', 'Альбедо':'albedo', 'Эрагон':'eragon', 'Ирина':'irina', 'Нико':'niko', 'Тана':'tana' };
const protectedSlugs = new Set(['koel','niko','tana','albedo','esher','irina','alastor','eragon','vargas','rahadin','veliar','rosemary']);
const roles = { 'Исмарк':'Бургомистр', 'Ирина':'Воительница', 'Варгас Валлакович':'Бургомистр', 'Леди Фиона Вахтер':'Аристократка', 'Розмари':'Реформатор', 'Мадам Ева':'Предсказательница', 'Страд фон Зарович':'Господин Равенлофта', 'Рахадин':'Камергер', 'Эшер':'Воин', 'Альбедо':'Мистик', 'Тана':'Следопыт', 'Нико':'Странник' };
const locationHeaders = new Set(['Янтарный храм','Малая Баровия','Логово вервольфов','Валлаки','Театр','Крецк','Южный лагерь вистан','Северный лагерь вистан','Замок Равенлофт','Кладбище']);

const xlsx = join(source, 'Пятая кровь — отношения.xlsx');
const sharedXml = execFileSync('/usr/bin/unzip', ['-p', xlsx, 'xl/sharedStrings.xml'], { encoding:'utf8', maxBuffer:2_000_000 });
const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => decodeXml([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((text) => text[1]).join('')));
const sheetXml = execFileSync('/usr/bin/unzip', ['-p', xlsx, 'xl/worksheets/sheet1.xml'], { encoding:'utf8', maxBuffer:3_000_000 });
const rows = [...sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((row) => {
  const values = {};
  const populatedCells = row[1].replace(/<c[^>]*\/>/g, '');
  for (const cell of populatedCells.matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
    const column = cell[1].match(/r="([A-Z]+)\d+"/)?.[1];
    if (!column) continue;
    const type = cell[1].match(/t="([^"]+)"/)?.[1];
    const raw = cell[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
    if (raw === undefined) continue;
    values[column] = type === 's' ? shared[Number(raw)] : Number(raw);
  }
  return values;
});

let group = 'Персонажи игроков';
const characterDir = join(root, 'src/content/characters');
for (const row of rows.slice(2)) {
  const name = row.A;
  if (!name) continue;
  if (locationHeaders.has(name)) { group = name; continue; }
  if (typeof row.B !== 'number' && typeof row.C !== 'number') continue;
  const slug = aliases[name] ?? slugify(name);
  const target = join(characterDir, `${slug}.md`);
  if (protectedSlugs.has(slug)) continue;
  const positive = Math.max(0, Number(row.B ?? 0));
  const negative = Math.min(0, Number(row.B < 0 ? row.B : row.C ?? 0));
  const description = typeof row.E === 'string' ? row.E.trim() : 'Наблюдений пока недостаточно. Отношение сохраняется как точка отсчёта.';
  const label = description.split(/[.!?]/)[0].slice(0, 90) || 'Нейтральное наблюдение';
  const data = {
    name, slug, role: roles[name] ?? 'Неизвестно', group, status: 'Неизвестно', featured: false,
    currentRelation: { positive, negative }, relationLabel: label, lastUpdatedSession: 39,
    tags: [group, positive > 0 ? 'симпатия' : negative < 0 ? 'враждебность' : 'нейтральность'],
    relatedCharacters: [], relatedSessions: [],
    relationHistory: [{ session: 39, positive, negative, note: 'Текущее значение перенесено из таблицы отношений.' }],
  };
  writeFileSync(target, frontmatter(data) + description + '\n');
}

console.log(`Imported ${matches.length} diary entries, backstory and relationship roster from ${basename(xlsx)}.`);
