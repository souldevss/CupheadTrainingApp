# Web UI source

`Web` is the desktop app's WebView UI. HTML files hold page markup; scripts live in `js/`.

- `style.css`: shared layout, navigation, Training and Time Table.
- `css/autolog.css`: Attempt Log, boss charts, Overall Progress, projection and Run Recap.
- `css/app-shell.css`: desktop frame and animated background.
- `js/autolog.js`: Attempt Log state, boss views, category selection and host updates.
- `js/boss-chart.js`: time/death chart rendering, averages, hover, zoom and animation.
- `js/overall-progress.js`, `js/run-projection.js`, `js/run-recap.js`: their respective views.

Scripts use shared browser globals, so preserve their order in HTML. No frontend build step or Node installation is required to build the app. CSS uses compact rules, and JavaScript retains shared function/variable names.

The standalone website is maintained separately in [CupheadTrainingTable](https://github.com/souldevss/CupheadTrainingTable).
