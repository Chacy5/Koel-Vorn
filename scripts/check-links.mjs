import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const htmlFiles = [];
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).forEach((entry) => entry.isDirectory() ? walk(join(dir, entry.name)) : entry.name.endsWith('.html') && htmlFiles.push(join(dir, entry.name)));
walk(root);

const failures = [];
for (const source of htmlFiles) {
  const html = readFileSync(source, 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const original = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|#)/.test(original)) continue;
    let [pathname, fragment] = original.split('#');
    pathname = pathname.split('?')[0];
    if (pathname === '/Koel-Vorn' || pathname === '/Koel-Vorn/') pathname = '';
    else if (pathname.startsWith('/Koel-Vorn/')) pathname = pathname.slice('/Koel-Vorn/'.length);
    else continue;
    pathname = decodeURIComponent(pathname);
    const target = extname(pathname) ? join(root, pathname) : join(root, pathname, 'index.html');
    if (!existsSync(target)) { failures.push(`${source.replace(root, '')}: ${original}`); continue; }
    if (fragment && target.endsWith('.html')) {
      const targetHtml = readFileSync(target, 'utf8');
      const id = decodeURIComponent(fragment);
      if (!targetHtml.includes(`id="${id}"`)) failures.push(`${source.replace(root, '')}: missing #${id} in ${pathname || '/'}`);
    }
  }
}

if (failures.length) {
  console.error(`Broken internal links: ${failures.length}\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`Verified internal links across ${htmlFiles.length} generated pages.`);
