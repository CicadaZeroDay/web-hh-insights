// Static-site generator for WEB-HH Insights (GitHub Pages).
// Fetches the public blog feed from web-hh.com and renders an index + per-article
// teaser pages, each with dofollow links back to the canonical article and hubs.
// Runs in GitHub Actions — no secrets, no DB access.

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const SITE = 'https://web-hh.com';
const FEED = `${SITE}/api/blog/list?limit=50`;
const OUT = 'docs';
const BRAND = 'WEB-HH Insights';

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function pick(obj) {
  if (!obj) return { text: '', locale: 'en' };
  if (obj.ru) return { text: obj.ru, locale: 'ru' };
  if (obj.en) return { text: obj.en, locale: 'en' };
  if (obj.ua) return { text: obj.ua, locale: 'ua' };
  return { text: '', locale: 'en' };
}

const HUBS = (locale) => `
  <p class="hubs">
    <a href="${SITE}/${locale}/vacancies">Свежие вакансии</a> ·
    <a href="${SITE}/${locale}/best-remote-jobs">Лучшие удалённые</a> ·
    <a href="${SITE}/${locale}/highest-paying-jobs">Самые высокооплачиваемые</a>
  </p>`;

const CSS = `
  :root{color-scheme:light dark}
  *{box-sizing:border-box}
  body{font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:760px;margin:0 auto;padding:2rem 1.2rem;color:#16181d;background:#fbfbfc}
  @media(prefers-color-scheme:dark){body{color:#e8eaed;background:#15171b}a{color:#7db1ff}}
  h1{font-size:1.9rem;line-height:1.2;margin:.2rem 0 1rem}
  h2{font-size:1.15rem;margin:1.6rem 0 .3rem}
  a{color:#1256d6;text-decoration:none}a:hover{text-decoration:underline}
  .lead{font-size:1.05rem;color:#5b6069}
  .card{padding:1rem 0;border-bottom:1px solid #e6e7ea}
  @media(prefers-color-scheme:dark){.card{border-color:#2a2d33}}
  .card p{margin:.3rem 0;color:#5b6069}
  .hubs{font-size:.95rem;margin-top:1.4rem}
  footer{margin-top:2.5rem;font-size:.9rem;color:#8a8f98}
  .back{display:inline-block;margin-bottom:1rem}
`;

function page({ title, body, canonical }) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
<style>${CSS}</style></head><body>${body}
<footer>© ${BRAND} · материалы и вакансии — на <a href="${SITE}/">web-hh.com</a></footer>
</body></html>`;
}

async function main() {
  const res = await fetch(FEED, { headers: { 'user-agent': 'web-hh-insights-generator' } });
  if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
  const json = await res.json();
  const articles = (json.articles || []).filter((a) => a && a.slug);
  if (articles.length === 0) throw new Error('empty feed');

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(`${OUT}/a`, { recursive: true });

  const items = [];
  for (const a of articles) {
    const t = pick(a.title);
    const ex = pick(a.excerpt);
    const locale = t.locale === 'ua' ? 'ua' : t.locale;
    const fullUrl = `${SITE}/${locale}/blog/${a.slug}`;
    const title = t.text || a.slug;

    const body = `
      <a class="back" href="./../index.html">← ${esc(BRAND)}</a>
      <h1>${esc(title)}</h1>
      ${ex.text ? `<p class="lead">${esc(ex.text)}</p>` : ''}
      <p>Полная версия статьи — с деталями, цифрами и примерами — на web-hh.com:
        <a href="${fullUrl}">${esc(title)}</a>.</p>
      <p>WEB-HH — джоб-борд для арбитража, медиабаинга и крипты: 28&nbsp;000+ активных вакансий,
        отклик в один тап в Telegram.</p>
      ${HUBS(locale)}`;
    writeFileSync(`${OUT}/a/${a.slug}.html`, page({ title: `${title} — ${BRAND}`, body, canonical: fullUrl }));

    items.push(`
      <div class="card">
        <h2><a href="./a/${a.slug}.html">${esc(title)}</a></h2>
        ${ex.text ? `<p>${esc(ex.text.slice(0, 180))}</p>` : ''}
        <a href="${fullUrl}">Читать на web-hh.com →</a>
      </div>`);
  }

  const index = `
    <h1>${esc(BRAND)}</h1>
    <p class="lead">Заметки и разборы о работе в арбитраже трафика, медиабаинге и крипте.
      Все материалы и вакансии — на <a href="${SITE}/">web-hh.com</a>, джоб-борде, где нанимают
      сильные команды ниши.</p>
    ${HUBS('ru')}
    <h2 style="margin-top:2rem">Последние материалы</h2>
    ${items.join('\n')}`;
  writeFileSync(`${OUT}/index.html`, page({ title: `${BRAND} — работа в арбитраже, медиабаинге и крипте`, body: index, canonical: `${SITE}/ru/blog` }));
  writeFileSync(`${OUT}/.nojekyll`, '');
  writeFileSync(`${OUT}/CNAME_DISABLED`, '');

  console.log(`generated ${articles.length} articles + index`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
