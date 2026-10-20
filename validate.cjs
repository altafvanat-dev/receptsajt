// Kontrollerar att JSON-LD parsar och matchar synlig text samt att råkällan innehåller samma ingredienser/steg.
const fs = require('fs'), path = require('path');
const dec = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
let errors = 0;
const fail = (m) => { errors++; console.log('FEL:', m); };
for (const f of fs.readdirSync('recipes').filter((x) => x.endsWith('.json'))) {
  const r = JSON.parse(fs.readFileSync(path.join('recipes', f), 'utf8'));
  for (const [lang, rel] of [['sv', ''], ['en', 'en']]) {
    const html = fs.readFileSync(path.join('dist', 'recept', r.slug, rel, 'index.html'), 'utf8');
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!m) { fail(`${r.slug}/${lang}: ingen JSON-LD`); continue; }
    let ld; try { ld = JSON.parse(m[1]); } catch (e) { fail(`${r.slug}/${lang}: JSON-LD parsar inte: ${e.message}`); continue; }
    const list = (tag) => [...html.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => dec(x[1]));
    const ing = list('ul'), steps = list('ol'), ldSteps = ld.recipeInstructions.map((s) => s.text);
    const src = lang === 'sv' ? r : r.en;
    if (JSON.stringify(ing) !== JSON.stringify(ld.recipeIngredient)) fail(`${r.slug}/${lang}: ingredienser ≠ JSON-LD`);
    if (JSON.stringify(steps) !== JSON.stringify(ldSteps)) fail(`${r.slug}/${lang}: steg ≠ JSON-LD`);
    if (JSON.stringify(ing) !== JSON.stringify(src.ingredients)) fail(`${r.slug}/${lang}: ingredienser ≠ råkälla`);
    if (steps.length !== src.steps.length) fail(`${r.slug}/${lang}: antal steg ≠ råkälla`);
    if (!new RegExp(`<html lang="${lang}">`).test(html)) fail(`${r.slug}/${lang}: fel html lang`);
    if (!/<h1>/.test(html) || !/og:title/.test(html) || !/name="description"/.test(html)) fail(`${r.slug}/${lang}: saknar h1/og/description`);
    for (const k of ['prepTime', 'cookTime', 'totalTime']) if (!/^PT(\d+H)?(\d+M)?$/.test(ld[k])) fail(`${r.slug}/${lang}: ${k}=${ld[k]}`);
    console.log(`${r.slug}/${lang}: ${ing.length} ingredienser, ${steps.length} steg, JSON-LD OK`);
  }
}
console.log(errors ? `${errors} fel` : 'Allt OK'); process.exit(errors ? 1 : 0);
