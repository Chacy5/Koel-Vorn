import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import YAML from 'yaml';

const root = resolve(import.meta.dirname, '..');
const packageDir = join(root, 'roll20_downloader_package');
const imageDir = join(packageDir, 'roll20_images_named');
const manifestPath = join(imageDir, 'roll20_images_manifest.csv');
const outputDir = join(root, 'public/images/characters/roll20');
const archiveOutputDir = join(root, 'public/images/archives');
const registryPath = join(root, 'src/data/character-images.json');
const reportPath = join(root, 'src/data/character-images-report.json');
const readableReportDir = join(root, 'reports');
const readableReportPath = join(readableReportDir, 'character-images.md');
const supported = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const archiveRecords = JSON.parse(readFileSync(join(root, 'src/data/archives.json'), 'utf8'));

const parseCsv = (text) => {
  const rows = []; let row = [], value = '', quoted = false;
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

const normalize = (value = '') => value.replace(/^\uFEFF/, '').trim().normalize('NFC').toLocaleLowerCase('ru');
const manifestRows = parseCsv(readFileSync(manifestPath, 'utf8')).slice(1);
const assets = manifestRows.map(([name, , file, status]) => ({ name: name?.trim(), file: file?.trim(), status: status?.trim() }))
  .filter((item) => item.name && item.name !== '???' && item.status === 'OK' && supported.has(extname(item.file).toLocaleLowerCase()));

const characterFiles = readdirSync(join(root, 'src/content/characters')).filter((file) => file.endsWith('.md'));
const characters = characterFiles.map((file) => {
  const text = readFileSync(join(root, 'src/content/characters', file), 'utf8');
  const yaml = text.match(/^---\n([\s\S]*?)\n---/)?.[1];
  const data = YAML.parse(yaml ?? '');
  return { id: data.slug, name: data.name, aliases: data.aliases ?? [], existingImage: data.image };
});

const owners = new Map();
for (const character of characters) {
  for (const key of [character.name, ...character.aliases].map(normalize)) {
    if (!key || key === '???') continue;
    owners.set(key, [...new Set([...(owners.get(key) ?? []), character.id])]);
  }
}
const assetsByName = new Map();
for (const asset of assets) {
  const key = normalize(asset.name);
  assetsByName.set(key, [...(assetsByName.get(key) ?? []), asset]);
}

mkdirSync(outputDir, { recursive: true });
mkdirSync(archiveOutputDir, { recursive: true });
const registry = [];
const usedFiles = new Set();
const ambiguous = [];
for (const character of characters) {
  const candidates = [character.name, ...character.aliases];
  let match = null;
  for (const candidate of candidates) {
    const key = normalize(candidate);
    const matchingAssets = assetsByName.get(key) ?? [];
    const matchingOwners = owners.get(key) ?? [];
    if (matchingAssets.length === 1 && matchingOwners.length === 1 && matchingOwners[0] === character.id) {
      match = matchingAssets[0]; break;
    }
    if (matchingAssets.length && matchingOwners.length > 1) ambiguous.push({ character: character.name, candidate, file: matchingAssets[0].file, owners: matchingOwners });
  }
  if (!match) continue;
  const source = join(imageDir, match.file);
  if (!existsSync(source)) continue;
  copyFileSync(source, join(outputDir, match.file));
  usedFiles.add(match.file);
  registry.push({ id: character.id, name: character.name, image: `/images/characters/roll20/${match.file}`, sourceName: match.name, file: match.file });
}
registry.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

for (const record of archiveRecords) {
  const source = join(imageDir, record.file);
  if (!existsSync(source)) throw new Error(`Archive asset not found: ${record.file}`);
  copyFileSync(source, join(archiveOutputDir, record.file));
  usedFiles.add(record.file);
}

const matchedIds = new Set(registry.map((item) => item.id));
const localFiles = readdirSync(imageDir).filter((file) => supported.has(extname(file).toLocaleLowerCase()));
const report = {
  generatedAt: new Date().toISOString(),
  matched: registry,
  existingLocalFallback: characters.filter((item) => !matchedIds.has(item.id) && item.existingImage).map((item) => ({ id: item.id, name: item.name, image: item.existingImage })),
  missing: characters.filter((item) => !matchedIds.has(item.id) && !item.existingImage).map((item) => ({ id: item.id, name: item.name })),
  ambiguous: [...new Map(ambiguous.map((item) => [`${item.character}|${item.file}`, item])).values()],
  archives: archiveRecords.map((item) => ({ title: item.title, file: item.file, location: item.locationLabel })),
  unusedFiles: localFiles.filter((file) => !usedFiles.has(file)).sort((a, b) => a.localeCompare(b, 'ru')),
};
writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
mkdirSync(readableReportDir, { recursive: true });
const markdownList = (items, format) => items.length ? items.map((item) => `- ${format(item)}`).join('\n') : '- Нет';
const readableReport = `# Отчёт по изображениям персонажей

Отчёт генерируется командой \`npm run import:images\` из локальной таблицы \`roll20_images_manifest.csv\`.

## Найдены в пакете Roll20 (${report.matched.length})

${markdownList(report.matched, (item) => `${item.name} — \`${item.file}\``)}

## Используют ранее добавленные локальные изображения (${report.existingLocalFallback.length})

${markdownList(report.existingLocalFallback, (item) => `${item.name} — \`${item.image}\``)}

## Без изображения (${report.missing.length})

${markdownList(report.missing, (item) => item.name)}

## Неоднозначные совпадения (${report.ambiguous.length})

${markdownList(report.ambiguous, (item) => `${item.character} — \`${item.file}\` одновременно подходит: ${item.owners.join(', ')}`)}

## Архивные документы (${report.archives.length})

${markdownList(report.archives, (item) => `${item.title} — \`${item.file}\` (${item.location})`)}

## Неиспользованные файлы (${report.unusedFiles.length})

${markdownList(report.unusedFiles, (file) => `\`${file}\``)}
`;
writeFileSync(readableReportPath, readableReport);
console.log(`Matched ${registry.length} character images and ${report.archives.length} archive files; ${report.missing.length} characters use placeholders; ${report.unusedFiles.length} files unused.`);
