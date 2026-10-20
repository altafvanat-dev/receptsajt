// Genererar /dist från /recipes/*.json. Kör: node build.cjs  (BASE_URL=https://... för absoluta URL:er)
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const BASE_URL = (process.env.BASE_URL || '').replace(/\/+$/, '');

// ---- Thermomix-inställningar: ändra formatet här ----
const UNITS = {
  sv: { min: 'min', sec: 'sek', speed: 'hastighet', reverse: '↺' },
  en: { min: 'min', sec: 'sec', speed: 'speed', reverse: 'reverse' },
};
// Ordning på delarna: tid/temperatur/hastighet/reverse
function formatSetting(setting, lang) {
  if (!setting) return '';
  const u = UNITS[lang];
  const time = [setting.min ? `${setting.min} ${u.min}` : '', setting.sec ? `${setting.sec} ${u.sec}` : '']
    .filter(Boolean).join(' ');
  const parts = [
    time,
    setting.temp ? `${setting.temp}°C` : '',
    setting.speed != null ? `${u.speed} ${setting.speed}` : '',
    setting.reverse ? u.reverse : '',
  ].filter(Boolean);
  return parts.join('/');
}

function stepText(step, lang) {
  const s = formatSetting(step.setting, lang);
  return s ? `${step.text.replace(/\.+$/, '')} ${s}.` : step.text;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const iso = (m) => `PT${m >= 60 ? Math.floor(m / 60) + 'H' : ''}${m % 60 || m < 60 ? (m % 60) + 'M' : ''}`;

const T = {
  sv: { prep: 'Förberedelse', cook: 'Tillagning', total: 'Totalt', serv: 'portioner', min: 'min', ing: 'Ingredienser', steps: 'Gör så här', home: 'Alla recept', other: 'English version', otherLang: 'en', locale: 'sv_SE', siteTitle: 'Recept', siteDesc: 'Recept med Thermomix-inställningar.' },
  en: { prep: 'Prep', cook: 'Cook', total: 'Total', serv: 'servings', min: 'min', ing: 'Ingredients', steps: 'Method', home: 'All recipes', other: 'Svenska', otherLang: 'sv', locale: 'en_US', siteTitle: 'Recipes', siteDesc: 'Recipes with Thermomix settings.' },
};

const CSS = `body{font-family:system-ui,sans-serif;line-height:1.5;max-width:42rem;margin:0 auto;padding:1rem;color:#222}
h1{font-size:1.6rem;line-height:1.2}.meta{color:#555}li{margin:.4rem 0}a{color:#0a58ca}nav{margin-bottom:1rem}`;

function head({ lang, title, desc, url, extra = '' }) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="${extra ? 'article' : 'website'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:locale" content="${T[lang].locale}">
${url ? `<meta property="og:url" content="${url}">\n<link rel="canonical" href="${url}">\n` : ''}${extra}<style>${CSS}</style>
</head>
`;
}

function loadRecipes() {
  return fs.readdirSync(path.join(ROOT, 'recipes')).filter((f) => f.endsWith('.json')).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'recipes', f), 'utf8')));
}

function variant(r, lang) {
  const v = lang === 'sv' ? r : r.en;
  return { title: v.title, description: v.description, ingredients: v.ingredients, steps: v.steps.map((s) => stepText(s, lang)) };
}

function recipePage(r, lang) {
  const t = T[lang];
  const v = variant(r, lang);
  const total = r.prepMinutes + r.cookMinutes;
  const rel = lang === 'sv' ? { self: '', other: 'en/', home: '../../' } : { self: '', other: '../', home: '../../../' };
  const svUrl = BASE_URL && `${BASE_URL}/recept/${r.slug}/`;
  const enUrl = BASE_URL && `${BASE_URL}/recept/${r.slug}/en/`;
  const url = lang === 'sv' ? svUrl : enUrl;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: v.title,
    description: v.description,
    inLanguage: lang,
    recipeYield: `${r.servings} ${t.serv}`,
    prepTime: iso(r.prepMinutes),
    cookTime: iso(r.cookMinutes),
    totalTime: iso(total),
    recipeIngredient: v.ingredients,
    recipeInstructions: v.steps.map((text) => ({ '@type': 'HowToStep', text })),
  };
  if (url) ld.url = url;
  const alt = BASE_URL
    ? `<link rel="alternate" hreflang="sv" href="${svUrl}">\n<link rel="alternate" hreflang="en" href="${enUrl}">\n`
    : '';
  const extra = `${alt}<script type="application/ld+json">${JSON.stringify(ld, null, 2).replace(/</g, '\\u003c')}</script>\n`;
  return head({ lang, title: v.title, desc: v.description, url, extra }) + `<body>
<nav><a href="${rel.home}">${t.home}</a> · <a href="${rel.other}" hreflang="${t.otherLang}">${t.other}</a></nav>
<main>
<h1>${esc(v.title)}</h1>
<p class="meta">${r.servings} ${t.serv} · ${t.prep} ${r.prepMinutes} ${t.min} · ${t.cook} ${r.cookMinutes} ${t.min} · ${t.total} ${total} ${t.min}</p>
<p>${esc(v.description)}</p>
<h2>${t.ing}</h2>
<ul>
${v.ingredients.map((i) => `<li>${esc(i)}</li>`).join('\n')}
</ul>
<h2>${t.steps}</h2>
<ol>
${v.steps.map((s) => `<li>${esc(s)}</li>`).join('\n')}
</ol>
</main>
</body>
</html>
`;
}

function indexPage(recipes) {
  const lang = 'sv';
  const li = (r) => `<li><a href="recept/${r.slug}/">${esc(r.title)}</a> (<a href="recept/${r.slug}/en/" hreflang="en">${esc(r.en.title)}</a>)</li>`;
  return head({ lang, title: 'Recept', desc: T.sv.siteDesc, url: BASE_URL && `${BASE_URL}/` }) + `<body>
<main>
<h1>Recept</h1>
<ul>
${recipes.map(li).join('\n')}
</ul>
</main>
</body>
</html>
`;
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

fs.rmSync(DIST, { recursive: true, force: true });
const recipes = loadRecipes();
write(path.join(DIST, 'index.html'), indexPage(recipes));
for (const r of recipes) {
  write(path.join(DIST, 'recept', r.slug, 'index.html'), recipePage(r, 'sv'));
  write(path.join(DIST, 'recept', r.slug, 'en', 'index.html'), recipePage(r, 'en'));
}
console.log(`Byggde ${recipes.length} recept → ${DIST}`);
