# Receptsajt (Cookidoo-import)

Statisk, gratis receptsajt utan ramverk. Varje recept får en svensk och en engelsk sida med
schema.org/Recipe (JSON-LD) och Thermomix-inställningarna sist i stegtexten.

## Lägga till ett recept
1. Kopiera `recipes/asiatisk-gryta-linser.json` till `recipes/<ny-slug>.json` och fyll i.
   - `steps[].setting`: `{ "min", "sec", "temp", "speed", "reverse" }` (alla valfria) eller `null` för steg utan inställning.
   - Texten i `text` skrivs utan inställning – den läggs på automatiskt.
2. Bygg: `node build.cjs` (valfritt: `BASE_URL=https://din-sajt.example node build.cjs` för absoluta URL:er/canonical).
3. Kontrollera: `node validate.cjs`.
4. Committa och pusha – hostingen bygger själv.

URL:er: `/recept/<slug>/` (svenska) och `/recept/<slug>/en/` (engelska).

## Ändra formatet på inställningarna
Allt ligger i `formatSetting()` och `UNITS` överst i `build.cjs`
(t.ex. flytta "reverse" eller byta `↺` mot något annat).

## Deploy (gratis)
- **Netlify:** Add new site → Import from Git → välj repot. `netlify.toml` sätter build och `dist`.
- **GitHub Pages:** Settings → Pages → Source: "GitHub Actions". Workflowen `.github/workflows/pages.yml` bygger vid push till `main`.
