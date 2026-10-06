# Meal Tracker

A progressive web app (PWA) for hitting your daily calorie and macro goals. Add it to your iPhone's Home Screen and it works like a regular app.

- **Log food in plain English.** Type what you ate ("2 scrambled eggs, toast with butter, black coffee") and Claude breaks it into items with calories, protein, carbs, and fat. You can adjust any number before adding it.
- **Exercise-adjusted targets.** Add the active calories you burned (from Apple Health via a Shortcut, or typed in) and the app adds a share of them (50% by default, adjustable) to that day's calorie target. Protein stays fixed; the extra goes to carbs and fat.
- **Daily dashboard.** Calories remaining, progress bars for each macro, food grouped by meal, and arrows to look back at earlier days. Tap an entry to edit or delete it.

## Getting it on your phone

The app is deployed to GitHub Pages by GitHub Actions on every push to the default branch.

1. **One-time:** in the GitHub repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**. (GitHub Pages on a private repository needs a paid GitHub plan; otherwise make the repo public.)
2. Re-run the latest **Test & Deploy** workflow from the **Actions** tab (or push any change).
3. Open `https://<your-github-username>.github.io/meal-tracker/` in **Safari** on your iPhone, tap **Share → Add to Home Screen**, and open it from the new icon.
4. Tap the gear icon, set your goals, and paste in an **Anthropic API key** from [console.anthropic.com](https://console.anthropic.com). Analyzing a meal typically costs a few cents or less.

## Apple Health

Web apps can't read Apple Health directly, so a small Shortcut copies your calories burned:

1. In the **Shortcuts** app, create a shortcut named **Meal Tracker Burned** with these actions:
   - **Find Health Samples** where Type is *Active Energy* and Start Date is *Today*
   - **Calculate Statistics**: *Sum* of Health Samples
   - **Round Number** to *Ones Place*
   - **Copy to Clipboard**
2. In the app, tap **Update** on the "kcal burned" card → **Run shortcut**, switch back, and tap **Paste**.

You can also put the shortcut on your Home Screen or Action button, or just type the number from the Fitness app.

## Choosing your goals

Set **Calories** to what you'd eat on a rest day (your target at a *sedentary* activity level). Calories burned are added on top, so a target that already assumes exercise would count it twice.

## Your data

Everything (log, goals, API key) is stored on your device in the app's local storage. Your API key is sent only to `api.anthropic.com`. Use **Settings → Backup → Export** now and then. If you delete the Home Screen app, its data goes with it.

## Development

```sh
npm install
npm run dev      # local dev server
npm test         # unit tests
npm run build    # production build in dist/
```

Built with Preact, TypeScript, Vite, and vite-plugin-pwa.
