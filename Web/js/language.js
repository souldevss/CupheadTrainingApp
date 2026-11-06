// Language toggle: English ↔ Brazilian Portuguese

const LANG_KEY = "cuphead-training-lang";

const TRANSLATIONS = {
    "en": {
        // Navigation
        "nav.enter-times": "Enter Times",
        "nav.training": "Training",
        "nav.time-table": "Time Table",
        "nav.how-it-works": "How it works",
        "nav.backups": "Backups",
        "nav.export": "⬇ Export Times",
        "nav.import": "⬆ Import Times",
        "nav.attempt-log": "Attempt Log",
        "ui.compact": "Compact mode",
        "ui.compact-on": "Compact mode: On",
        "ui.info-aria": "How it works",
        "ui.language-aria": "Toggle language",
        "ui.switch-to-english": "Switch to English",
        "ui.switch-to-portuguese": "Switch to Portuguese",

        // Bigtitle alt text
        "bigtitle.alt": "Cuphead Training Table",

        // Page title
        "page.title": "Cuphead Training Table",
        "page.title.info": "Cuphead Training Table — Info",
        "page.title.attempts": "Cuphead Training Table — Attempt Log",

        // Info page
        "info.what-title": "What the fork is this website",
        "info.what-text": "This is a personal practice tracker for speedruns. Enter your best times for each level or split, see your rank, and track your progress.",
        "info.ranks-title": "Ranks",
        "info.ranks-intro": "Each level has 19 thresholds, from fastest to slowest:",
        "info.ranks-text": "Rank thresholds are based on the configured WR and F rank times for each level or split.",
        "info.distribution-title": "Distribution Curve",
        "info.distribution-text": "Each rank threshold is computed as:",
        "info.distribution.formula-wr": "WR time (rank 0)",
        "info.distribution.formula-f": "F rank time (rank 18)",
        "info.distribution.formula-i": "rank index (0–18)",
        "info.distribution.formula-exp": "time distribution exponent",
        "info.distribution.explain-i": "where <strong>i</strong> is the rank index (0&thinsp;=&thinsp;WR, 18&thinsp;=&thinsp;F). The exponent controls how the 19 thresholds are spread between WR and F:",
        "info.distribution.linear-desc": "<strong>= 1.0 (linear)</strong> — equal gap between every consecutive rank.",
        "info.distribution.power-desc": "<strong>&gt; 1.0 (used here: 1.35)</strong> — thresholds cluster near WR; gaps grow toward F. Improving from F to D is easier than from S to WR.",
        "info.distribution.graph-desc": "The graph below shows how the curve maps rank index to the fraction of the WR&rarr;F range used for each threshold. Tick marks on the axis show where each rank falls.",
        "info.distribution.graph-near-wr": "near WR",
        "info.distribution.graph-near-f": "near F",
        "info.distribution.graph-linear": "linear",
        "info.distribution.graph-curve": "          curve (exp=1.35)",
        "info.distribution.graph-x-axis": "Rank (WR → F)",
        "info.distribution.graph-y-axis": "Threshold position",
        "info.backup-title": "Back up your data",
        "info.backup-description": "Export your personal times, preferences, boss attempts, and deaths in one backup file. The desktop app also refreshes an automatic backup every 10 minutes at",
        "info.backup-description-end": "Importing adds run history and skips records that are already present.",
        "info.export-all": "Export all data",
        "info.import-backup": "Import backup",

        // Table tooltips
        "tooltip.residual": "Residuals are the time spent outside from levels, like walking in the map, scorecards, cutscenes etc.",
        "tooltip.sob": "Sum of all the best times + Residual",

        // Table headers
        "header.islands": "Islands",
        "header.levels": "Levels",
        "header.residual": "Residual",
        "header.sob": "Sob",
        "header.average-rank": "Average Rank",
        "header.total": "Total",
        "header.isle-times": "Total Times",

        // Personal page
        "personal.placeholder-title": "Coming Soon",
        "personal.placeholder-desc": "This category is not yet supported.",
        "personal.placeholder.section": "Section",
        "personal.placeholder.status": "Status",
        "personal.placeholder.times": "Times",
        "personal.placeholder.label": "Placeholder",
        "personal.placeholder.coming": "Coming soon",
        "personal.rank-distribution": "Rank Distribution",
        "personal.times-count": "times",
        "personal.best": "Best",
        "personal.most": "Most",
        "personal.unknown-rank": "Unknown Rank",
        "personal.no-times": "No times yet",
        "personal.split": "Split",
        "personal.rank-suffix": " Rank",
        "auto.category-hint": "Automatic recording supports <strong>1.1+</strong> and <strong>DLC</strong>. Select either category to see your equipment-verified best times.",
        "host.ready": "Ready",
        "host.loadout-unavailable": "Loadout unavailable — retry once equipment can be read",
        "host.loadout-base": "Run excluded — equip Lobber/Spread, no super or charm",
        "host.loadout-follies": "Run excluded — equip only Peashooter, no super or charm",
        "host.loadout-dlc": "Run excluded — equip Lobber/Spread or Charge/Spread, Chalice charm, no super",
        "info.loadout-title": "Equipment checks",
        "info.loadout-text": "Training records require Lobber + Spread for 1.1+, and Lobber + Spread or Charge + Spread for DLC. Either weapon slot order is accepted. Forest Follies requires only Peashooter, with no super or charm. Other 1.1+ bosses require no super or charm. DLC bosses require the Astral Cookie (Ms. Chalice) charm and no super. Changing equipment during a run or an unreadable loadout excludes that run. DLC boss bests are stored separately for each weapon pair. On the DLC version, Forest Follies and Mausoleum are shared between both pairs. Mausoleum has no weapon, charm, or super restrictions. Previous attempts are accepted as trusted records. Older DLC runs without weapon data count as Lobber + Spread.",
        "host.paused": "Watching paused",
        "host.waiting": "Waiting for Cuphead…",
        "host.closed": "Cuphead closed",
        "host.loading": "Loading…",
        "host.menu": "In menu / overworld",
        "host.memory-error": "Memory read error",
        "host.waiting-memory": "Waiting for game memory…",
        "host.watch": "Watch Cuphead",
        "host.stop-watching": "Stop watching",
        "host.desktop-connected": "Desktop app connected",
        "host.attempt": "Attempt: {boss}",
        "host.clear-logged": "Clear logged — {boss}",
        "host.watching-scene": "Watching — {scene}",
        "backup.downloaded": "Backup downloaded.",
        "backup.preparing": "Preparing backup…",
        "backup.importing": "Importing backup…",
        "backup.full-desktop": "Full backups are available in the desktop app.",
        "backup.import-confirm": "Import {runs} runs and {deaths} deaths? Existing history will be kept and duplicate records skipped. Personal times and preferences in this backup will replace matching settings.",
        "backup.imported": "Backup imported. Existing run history was kept; duplicate runs were skipped.",
        "backup.import-partial": "Run history was imported, but browser data could not be restored: {error}",
        "backup.import-error": "Could not import backup: {error}",
        "backup.invalid": "This file is not a supported Cuphead Training Table backup.",
        "backup.read-error": "Could not read this backup file.",
        "backup.select-error": "Could not read the selected backup file.",
        "backup.storage-missing": "Backup storage data is missing.",
        "times-import.invalid": "Invalid file format: missing categories data",
        "times-import.success": "Successfully imported times from {count} category/sub-option(s)",
        "times-import.empty": "No times found in the import file",
        "times-import.error": "Error importing file: Invalid JSON format",
        "autolog.title": "Attempt Log",
        "autolog.category": "Category",
        "autolog.subtitle": "Choose a boss to see how your clear times and deaths change over attempts.",
        "autolog.clear-all": "Clear all records",
        "autolog.recent": "Recent attempts",
        "autolog.boss-progress": "BOSS PROGRESS",
        "autolog.back": "← All bosses",
        "autolog.progress": "Progress",
        "autolog.attempts": "Attempts",
        "autolog.total-playtime": "Total playtime",
        "autolog.best-clear": "Best clear",
        "autolog.total-deaths": "Total deaths",
        "autolog.avg-10": "Last 10 clear average",
        "autolog.avg-20": "Last 20 clear average",
        "autolog.avg-50": "Last 50 clear average",
        "autolog.clear-times": "Clear times",
        "autolog.death-bars": "Death rate · background bars · 0–100%",
        "autolog.death-rate-value": "Death rate: {percent}%",
        "autolog.time-graph-view": "Time graph view",
        "autolog.averages": "Averages",
        "autolog.all-clears": "All clears",
        "autolog.average-block-size": "Average block size",
        "autolog.average-window": "Smooth the trend",
        "autolog.average-window-aria": "Gaussian smoothing strength",
        "autolog.individual-clears": "Individual clears",
        "autolog.up-to-50-average": "More smoothing",
        "autolog.gaussian-label": "Gaussian smoothing · {count}",
        "autolog.gaussian-aria": "Clear times with Gaussian smoothing and death rates",
        "autolog.gaussian-time": "Smoothed time",
        "autolog.gaussian-death-rate": "Smoothed death rate: {percent}%",
        "autolog.rolling-average-label": "Rolling average of {count} clears",
        "autolog.zoom-in": "Zoom in",
        "autolog.zoom-out": "Zoom out",
        "autolog.group-range": "Group {start}–{end}",
        "autolog.deaths": "Deaths",
        "autolog.death-block-size": "Death rate block size",
        "autolog.individual-clear-times": "Individual clear times",
        "autolog.avg-block": "Average time for each block of {count} clears",
        "autolog.all-times-aria": "All recorded run times",
        "autolog.average-times-aria": "Average clear times for each group of {count} clears with rank thresholds",
        "autolog.group": "Group",
        "autolog.death-per-attempts": "Death percentage per {count} attempts",
        "autolog.percentage": "Percentage",
        "autolog.death-chart-aria": "Death percentage per group of {count} attempts",
        "autolog.attempts-range": "Attempts {start}–{end}",
        "autolog.deaths-in-attempts": "{deaths} deaths in {count} attempts",
        "autolog.no-runs": "No runs recorded yet.",
        "autolog.no-clear-times": "No clear times recorded yet.",
        "autolog.need-clears": "Need {count} clears for the first {count}-clear average.",
        "autolog.no-deaths": "No deaths recorded yet.",
        "autolog.clear-number": "Clear {number}",
        "autolog.individual-clear": "Individual clear time",
        "autolog.average": "Average",
        "autolog.clears-range": "Clears {start}–{end}",
        "autolog.run-times": "Run times",
        "autolog.attempt-count": "{count} attempts",
        "autolog.clear-count": "{count} clears",
        "autolog.no-attempts": "No attempts recorded yet.",
        "autolog.when": "When",
        "autolog.clear-time": "Clear time",
        "autolog.delete": "Delete",
        "autolog.delete-run-aria": "Delete this run",
        "autolog.delete-death-aria": "Delete this death",
        "autolog.delete-attempt-confirm": "Delete this recorded attempt?",
        "autolog.delete-death-confirm": "Delete this death record?",
        "autolog.delete-all-confirm": "Delete all run and death records? This cannot be undone.",
        "autolog.no-live-stats": "Open this page inside the desktop app to see live stats.",
        "autolog.boss-attempts": "{attempts} attempts · {clears} clears",
        "autolog.attempts-label": "Attempts",
        "autolog.clears-label": "Clears",
        "autolog.deaths-label": "Total deaths",
        "result.clear": "Clear",
        "result.fail": "Fail",
        "result.death": "Death",
    },
    "pt-BR": {
        // Navigation
        "nav.enter-times": "Inserir Tempos",
        "nav.training": "Treino",
        "nav.time-table": "Tabela de Tempos",
        "nav.how-it-works": "Como funciona",
        "nav.backups": "Backups",
        "nav.export": "⬇ Exportar Tempos",
        "nav.import": "⬆ Importar Tempos",
        "nav.attempt-log": "Registro de tentativas",
        "ui.compact": "Modo compacto",
        "ui.compact-on": "Modo compacto: ativado",
        "ui.info-aria": "Como funciona",
        "ui.language-aria": "Trocar idioma",
        "ui.switch-to-english": "Mudar para inglês",
        "ui.switch-to-portuguese": "Mudar para português",

        // Bigtitle alt text
        "bigtitle.alt": "Tabela de Treino Cuphead",

        // Page title
        "page.title": "Tabela de Treino Cuphead",
        "page.title.info": "Tabela de Treino Cuphead — Info",
        "page.title.attempts": "Tabela de Treino Cuphead — Registro de tentativas",

        // Info page
        "info.what-title": "Que resenha é essa",
        "info.what-text": "Esta é uma ferramenta pessoal para praticar speedruns. Registre seus melhores tempos por fase ou trecho, veja seu rank e acompanhe seu progresso.",
        "info.ranks-title": "Ranks",
        "info.ranks-intro": "Cada nível tem 19 limiares, do mais rápido ao mais lento:",
        "info.ranks-text": "Os limites de rank usam os tempos WR e F configurados para cada nível ou split.",
        "info.distribution-title": "Curva de Distribuição",
        "info.distribution-text": "Cada limiar de rank é calculado como:",
        "info.distribution.formula-wr": "tempo WR (rank 0)",
        "info.distribution.formula-f": "tempo rank F (rank 18)",
        "info.distribution.formula-i": "índice do rank (0–18)",
        "info.distribution.formula-exp": "expoente de distribuição de tempo",
        "info.distribution.explain-i": "onde <strong>i</strong> é o índice do rank (0&thinsp;=&thinsp;WR, 18&thinsp;=&thinsp;F). O expoente controla como os 19 limiares são distribuídos entre WR e F:",
        "info.distribution.linear-desc": "<strong>= 1.0 (linear)</strong> — mesmo intervalo entre cada rank consecutivo.",
        "info.distribution.power-desc": "<strong>&gt; 1.0 (usado aqui: 1.35)</strong> — limiares se agrupam perto do WR; intervalos crescem em direção ao F. Melhorar de F para D é mais fácil que de S para WR.",
        "info.distribution.graph-desc": "O gráfico abaixo mostra como a curva mapeia o índice do rank para a fração do intervalo WR&rarr;F usada em cada limiar. As marcas no eixo mostram onde cada rank se encontra.",
        "info.distribution.graph-near-wr": "perto do WR",
        "info.distribution.graph-near-f": "perto do F",
        "info.distribution.graph-linear": "linear",
        "info.distribution.graph-curve": "          curva (exp=1,35)",
        "info.distribution.graph-x-axis": "Rank (WR → F)",
        "info.distribution.graph-y-axis": "Posição do limite",
        "info.backup-title": "Faça backup dos seus dados",
        "info.backup-description": "Exporte seus tempos pessoais, preferências, tentativas contra chefes e mortes em um único arquivo de backup. O aplicativo para desktop também atualiza um backup automático a cada 10 minutos em",
        "info.backup-description-end": "A importação adiciona o histórico de partidas e ignora registros que já existem.",
        "info.export-all": "Exportar todos os dados",
        "info.import-backup": "Importar backup",

        // Table tooltips
        "tooltip.residual": "O tempo residual é gasto fora das fases, como ao andar pelo mapa, ver placares e assistir a cenas.",
        "tooltip.sob": "Soma de todos os melhores tempos + Residual",

        // Table headers
        "header.islands": "Ilhas",
        "header.levels": "Níveis",
        "header.residual": "Residual",
        "header.sob": "Soma dos melhores",
        "header.average-rank": "Rank médio",
        "header.total": "Total",
        "header.isle-times": "Tempos totais",

        // Personal page
        "personal.placeholder-title": "Em Breve",
        "personal.placeholder-desc": "Esta categoria ainda não é suportada.",
        "personal.placeholder.section": "Seção",
        "personal.placeholder.status": "Status",
        "personal.placeholder.times": "Tempos",
        "personal.placeholder.label": "Placeholder",
        "personal.placeholder.coming": "Em breve",
        "personal.rank-distribution": "Distribuição de ranks",
        "personal.times-count": "tempos",
        "personal.best": "Melhor",
        "personal.most": "Mais comum",
        "personal.unknown-rank": "Rank desconhecido",
        "personal.no-times": "Nenhum tempo registrado",
        "personal.split": "Trecho",
        "personal.rank-suffix": " Rank",
        "auto.category-hint": "O registro automático funciona em <strong>1.1+</strong> e na <strong>DLC</strong>. Selecione uma dessas categorias para ver seus melhores tempos com equipamento verificado.",
        "host.ready": "Pronto",
        "host.loadout-unavailable": "Equipamento indisponível — tente novamente quando a leitura funcionar",
        "host.loadout-base": "Tentativa excluída — equipe Lobber/Spread, sem super ou amuleto",
        "host.loadout-follies": "Tentativa excluída — equipe apenas Peashooter, sem super ou amuleto",
        "host.loadout-dlc": "Tentativa excluída — equipe Lobber/Spread ou Charge/Spread, amuleto da Chalice, sem super",
        "info.loadout-title": "Verificação de equipamento",
        "info.loadout-text": "Os registros de treino exigem Lobber + Spread em 1.1+ e Lobber + Spread ou Charge + Spread na DLC. A ordem dos espaços de armas não importa. Forest Follies exige apenas Peashooter, sem super ou amuleto. Os outros chefes de 1.1+ exigem nenhum super ou amuleto. Os chefes da DLC exigem o Biscoito Astral (Ms. Chalice), sem super. Trocar o equipamento durante uma tentativa ou não conseguir ler o equipamento exclui essa tentativa. Os melhores tempos dos chefes da DLC são separados por combinação de armas. Na versão DLC, Forest Follies e Mausoleum são compartilhados entre as duas combinações. Mausoleum não tem restrições de arma, amuleto ou super. As tentativas anteriores são aceitas como registros confiáveis. Tentativas antigas da DLC sem dados de armas entram em Lobber + Spread.",
        "host.paused": "Monitoramento pausado",
        "host.waiting": "Aguardando Cuphead…",
        "host.closed": "Cuphead fechado",
        "host.loading": "Carregando…",
        "host.menu": "No menu / mapa",
        "host.memory-error": "Erro ao ler a memória do jogo",
        "host.waiting-memory": "Aguardando a memória do jogo…",
        "host.watch": "Monitorar Cuphead",
        "host.stop-watching": "Parar monitoramento",
        "host.desktop-connected": "Aplicativo para desktop conectado",
        "host.attempt": "Tentativa: {boss}",
        "host.clear-logged": "Vitória registrada — {boss}",
        "host.watching-scene": "Monitorando — {scene}",
        "backup.downloaded": "Backup baixado.",
        "backup.preparing": "Preparando backup…",
        "backup.importing": "Importando backup…",
        "backup.full-desktop": "Backups completos estão disponíveis no aplicativo para desktop.",
        "backup.import-confirm": "Importar {runs} partidas e {deaths} mortes? O histórico existente será mantido e os registros duplicados serão ignorados. Os tempos pessoais e as preferências deste backup substituirão as configurações correspondentes.",
        "backup.imported": "Backup importado. O histórico existente foi mantido e as partidas duplicadas foram ignoradas.",
        "backup.import-partial": "O histórico foi importado, mas não foi possível restaurar os dados do navegador: {error}",
        "backup.import-error": "Não foi possível importar o backup: {error}",
        "backup.invalid": "Este arquivo não é um backup compatível com a Tabela de Treino de Cuphead.",
        "backup.read-error": "Não foi possível ler este arquivo de backup.",
        "backup.select-error": "Não foi possível ler o arquivo selecionado.",
        "backup.storage-missing": "Os dados de armazenamento estão ausentes no backup.",
        "times-import.invalid": "Formato de arquivo inválido: faltam os dados das categorias",
        "times-import.success": "Tempos importados de {count} categoria(s)/opção(ões)",
        "times-import.empty": "Nenhum tempo encontrado no arquivo de importação",
        "times-import.error": "Erro ao importar arquivo: formato JSON inválido",
        "autolog.title": "Registro de tentativas",
        "autolog.category": "Categoria",
        "autolog.subtitle": "Escolha um chefe para acompanhar a evolução dos tempos de conclusão e das mortes.",
        "autolog.clear-all": "Limpar todos os registros",
        "autolog.recent": "Tentativas recentes",
        "autolog.boss-progress": "PROGRESSO DO CHEFE",
        "autolog.back": "← Todos os chefes",
        "autolog.progress": "Progresso",
        "autolog.attempts": "Tentativas",
        "autolog.total-playtime": "Tempo total de jogo",
        "autolog.best-clear": "Melhor conclusão",
        "autolog.total-deaths": "Total de mortes",
        "autolog.avg-10": "Média das últimas 10 conclusões",
        "autolog.avg-20": "Média das últimas 20 conclusões",
        "autolog.avg-50": "Média das últimas 50 conclusões",
        "autolog.clear-times": "Tempos de conclusão",
        "autolog.death-bars": "Taxa de mortes · barras ao fundo · 0–100%",
        "autolog.death-rate-value": "Taxa de mortes: {percent}%",
        "autolog.time-graph-view": "Visualização do gráfico de tempo",
        "autolog.averages": "Médias",
        "autolog.all-clears": "Todas as conclusões",
        "autolog.average-block-size": "Tamanho do bloco da média",
        "autolog.average-window": "Suavizar a tendência",
        "autolog.average-window-aria": "Intensidade da suavização gaussiana",
        "autolog.individual-clears": "Conclusões individuais",
        "autolog.up-to-50-average": "Mais suavização",
        "autolog.gaussian-label": "Suavização gaussiana · {count}",
        "autolog.gaussian-aria": "Tempos de conclusão com suavização gaussiana e taxas de mortes",
        "autolog.gaussian-time": "Tempo suavizado",
        "autolog.gaussian-death-rate": "Taxa de mortes suavizada: {percent}%",
        "autolog.rolling-average-label": "Média móvel de {count} conclusões",
        "autolog.zoom-in": "Ampliar",
        "autolog.zoom-out": "Reduzir",
        "autolog.group-range": "Grupo {start}–{end}",
        "autolog.deaths": "Mortes",
        "autolog.death-block-size": "Tamanho do bloco de mortes",
        "autolog.individual-clear-times": "Tempos de cada conclusão",
        "autolog.avg-block": "Tempo médio a cada bloco de {count} conclusões",
        "autolog.all-times-aria": "Todos os tempos de partida registrados",
        "autolog.average-times-aria": "Médias de conclusão em grupos de {count}, com limites de rank",
        "autolog.group": "Grupo",
        "autolog.death-per-attempts": "Porcentagem de mortes a cada {count} tentativas",
        "autolog.percentage": "Porcentagem",
        "autolog.death-chart-aria": "Porcentagem de mortes por grupo de {count} tentativas",
        "autolog.attempts-range": "Tentativas {start}–{end}",
        "autolog.deaths-in-attempts": "{deaths} mortes em {count} tentativas",
        "autolog.no-runs": "Nenhuma partida registrada.",
        "autolog.no-clear-times": "Nenhum tempo de conclusão registrado.",
        "autolog.need-clears": "São necessárias {count} conclusões para exibir a primeira média desse tamanho.",
        "autolog.no-deaths": "Nenhuma morte registrada.",
        "autolog.clear-number": "Conclusão {number}",
        "autolog.individual-clear": "Tempo individual de conclusão",
        "autolog.average": "Média",
        "autolog.clears-range": "Conclusões {start}–{end}",
        "autolog.run-times": "Tempos das partidas",
        "autolog.attempt-count": "{count} tentativas",
        "autolog.clear-count": "{count} conclusões",
        "autolog.no-attempts": "Nenhuma tentativa registrada.",
        "autolog.when": "Data",
        "autolog.clear-time": "Tempo de conclusão",
        "autolog.delete": "Excluir",
        "autolog.delete-run-aria": "Excluir esta partida",
        "autolog.delete-death-aria": "Excluir esta morte",
        "autolog.delete-attempt-confirm": "Excluir esta tentativa registrada?",
        "autolog.delete-death-confirm": "Excluir este registro de morte?",
        "autolog.delete-all-confirm": "Excluir todos os registros de partidas e mortes? Esta ação não pode ser desfeita.",
        "autolog.no-live-stats": "Abra esta página no aplicativo para desktop para ver as estatísticas ao vivo.",
        "autolog.boss-attempts": "{attempts} tentativas · {clears} conclusões",
        "autolog.attempts-label": "Tentativas",
        "autolog.clears-label": "Conclusões",
        "autolog.deaths-label": "Total de mortes",
        "result.clear": "Vitória",
        "result.fail": "Derrota",
        "result.death": "Morte",
    }
};

function getActiveLanguage()
{
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "pt-BR" || stored === "en") return stored;
    return "en";
}

function setActiveLanguage(lang)
{
    localStorage.setItem(LANG_KEY, lang);
    applyLanguage(lang);
}

function t(key)
{
    const lang = getActiveLanguage();
    const dict = TRANSLATIONS[lang];
    return (dict && dict[key] !== undefined) ? dict[key] : key;
}

function tf(key, values = {})
{
    return Object.entries(values).reduce((text, [name, value]) =>
        text.replaceAll(`{${name}}`, String(value)), t(key));
}

function translateWatcherStatus(status)
{
    if (!status) return t("host.ready");
    const exact = {
        "Ready": "host.ready",
        "Waiting for Cuphead…": "host.waiting",
        "Cuphead closed": "host.closed",
        "Loading…": "host.loading",
        "In menu / overworld": "host.menu",
        "Memory read error": "host.memory-error",
        "Waiting for game memory…": "host.waiting-memory",
        "Watching paused": "host.paused",
        "Loadout unavailable — retry once equipment can be read": "host.loadout-unavailable",
        "Run excluded — equip Lobber/Spread, no super or charm": "host.loadout-base",
        "Run excluded — equip only Peashooter, no super or charm": "host.loadout-follies",
        "Run excluded — equip Lobber/Spread or Charge/Spread, Chalice charm, no super": "host.loadout-dlc"
    };
    if (exact[status]) return t(exact[status]);
    if (status.startsWith("Attempt: ")) return tf("host.attempt", { boss: status.slice(9) });
    if (status.startsWith("Clear logged — ")) return tf("host.clear-logged", { boss: status.slice(15) });
    if (status.startsWith("Watching — ")) return tf("host.watching-scene", { scene: status.slice(11) });
    const timed = status.match(/^(.*?) \| (.+)$/);
    if (timed) return `${timed[1]} | ${timed[2]}`;
    return status;
}

function applyLanguage(lang)
{
    document.documentElement.lang = lang === "pt-BR" ? "pt-BR" : "en";

    // Update page title
    const isInfoPage = document.body.dataset.page === "info";
    document.title = isInfoPage ? t("page.title.info")
        : document.body.dataset.page === "attempt-log" ? t("page.title.attempts")
        : t("page.title");

    // Swap bigtitle image
    const bigtitle = document.getElementById("bigtitle");
    if (bigtitle) {
        bigtitle.src = lang === "pt-BR"
            ? "assets/bigtitle_pt-br.png"
            : "assets/bigtitle_en.png";
        bigtitle.alt = t("bigtitle.alt");
    }

    // Translate nav links with data-i18n
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        el.textContent = t(key);
    });

    // Translate info page content
    document.querySelectorAll("[data-i18n-content]").forEach(el => {
        const key = el.getAttribute("data-i18n-content");
        const translated = t(key);
        // Use innerHTML for translations that contain HTML tags
        if (translated.includes("<") || translated.includes("&")) {
            el.innerHTML = translated;
        } else {
            el.textContent = translated;
        }
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach(el => {
        el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
    });
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
        el.setAttribute("title", t(el.dataset.i18nTitle));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
    });

    // Update lang toggle button flag image
    const langBtn = document.getElementById("lang-toggle-btn");
    if (langBtn) {
        const img = langBtn.querySelector("img");
        if (img) {
            if (lang === "pt-BR") {
                img.src = "https://flagcdn.com/w40/us.png";
                img.srcset = "https://flagcdn.com/w80/us.png 2x";
                img.alt = t("ui.switch-to-english");
            } else {
                img.src = "https://flagcdn.com/w40/br.png";
                img.srcset = "https://flagcdn.com/w80/br.png 2x";
                img.alt = t("ui.switch-to-portuguese");
            }
        }
    }

    // Re-render graph labels on info page
    const canvas = document.getElementById("curve-graph");
    if (canvas && typeof redrawCurveGraph === "function") {
        redrawCurveGraph();
    }

    if (typeof window.refreshAutologLanguage === "function") window.refreshAutologLanguage();
    if (typeof window.refreshHostLanguage === "function") window.refreshHostLanguage();

    // Re-render table on time table page
    if (typeof activeCategory !== "undefined" && activeCategory && document.body.dataset.page === "time-table" && typeof renderTimeTable === "function") {
        renderTimeTable();
    }

    // Re-render personal times page
    if (typeof activeCategory !== "undefined" && activeCategory && document.body.dataset.page === "personal-times" && typeof renderPersonalTimesPage === "function") {
        if (window.autoTrainingPage && typeof renderAutoTimesPage === "function") renderAutoTimesPage();
        else renderPersonalTimesPage();
    }
}

// Initialize on page load
applyLanguage(getActiveLanguage());
