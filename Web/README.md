# Web UI source

`Web` is the desktop app's WebView UI. HTML files hold page markup; scripts live in `js/`.

- `js/page-header.js`: shared language selector and page navigation for all five pages.
- `style.css`: shared layout, navigation, Training and Time Table.
- `css/autolog.css`: Attempt Log, boss charts, Overall Progress.
- `css/app-shell.css`: desktop frame and static background.
- `js/autolog.js`: Attempt Log state, boss views, category selection and host updates.
- `js/boss-chart.js`: time and death-rate lines, faint individual-clear dots, averages, hover, and zoom. Smoothing, zoom, axes, and dots use v1.0's 260 ms cubic ease-out transition, retargeted from their current shape when interrupted. Graph animation is explicitly enabled independently of Windows visual-effects settings. Rendering stays capped at about 30 updates per second; idle charts do not animate.
- `js/overall-progress.js`: combined boss progress, using the same eased transitions for boss lines, the death-rate line, and viewport changes.
- `css/app-ui.css`: shared fixed appearance, header, Backups, and common controls.

Scripts use shared browser globals, so preserve their order in HTML. No frontend build step or Node installation is required to build the app. CSS uses compact rules, and JavaScript retains shared function/variable names.

The standalone website is maintained separately in [CupheadTrainingTable](https://github.com/souldevss/CupheadTrainingTable).

Training comparisons use `js/training-comparison.js`. The average is the latest N clears by timestamp; failed runs and deaths are excluded, and partial averages are not displayed.

Boss card artwork is listed in `js/boss-card-data.js`. Compact cards show the boss name across the top, with clears, deaths, and playtime beside the portrait below it.

Cuphead Vogue is bundled in `assets/fonts/`. The language buttons use the local hand-drawn flags in `assets/icons/`.

Light mode uses the hand-drawn light/dark icons beside the flag and is synchronized across pages by `js/appearance.js`. The Info distribution graph is SVG so it remains sharp when resized or zoomed.

Light mode follows the supplied Cuphead layout reference: pale blue surfaces, purple ink and frames, golden title strips, and solid teal offset shadows. Rank and boss colors stay consistent across modes.

Boss names sit in translucent boss-colored boxes over the paper artwork, with neutral lettering, taller frames, and larger text. The original paper artwork is a nine-slice border and fill, reserving space for its printed footer. Boss statistics sit beside the chart. Overall Progress legend buttons pin a boss and focus its improvement and death-rate trends.

The boss statistics sidebar groups averages into one compact table: latest 10, 20, 50, 100, and 200 clears, plus all clears. Each time uses its rank colors; incomplete windows are hidden. Best clear and total playtime use separate gold and blue accents.

Clear all records is beside Recent attempts. It requires confirmation, a typed word, and a final acknowledgement; the final dialog also offers a backup export before deletion.

Recent attempts and the boss Attempts tab show 20 entries at a time. Recent pages are fetched from SQLite on demand; boss lists render only the requested newest entries from the history already used by the charts.

Both attempt lists use `renderAttemptCollection` and `.attempt-card-grid` for the same cards, deletion handling, and Load more controls. Their data sources differ: recent entries are fetched in pages, while boss entries reuse the complete chart history.
