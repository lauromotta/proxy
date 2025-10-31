export function renderHtmlDashboard(snapshot) {
  const initialState = escapeForScript(snapshot);

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Agregador de Proxies — Painel</title>
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

      :root {
        color-scheme: dark light;
        --bg-1: #0b1120;
        --bg-2: #111b2f;
        --bg-3: #0f172a;
        --surface: rgba(15, 23, 42, 0.86);
        --surface-raised: rgba(17, 25, 40, 0.82);
        --surface-soft: rgba(30, 41, 59, 0.6);
        --surface-border: rgba(56, 189, 248, 0.22);
        --fg: #e2e8f0;
        --muted: #9ca7c3;
        --muted-strong: #d2dcff;
        --accent: #38bdf8;
        --accent-strong: #22d3ee;
        --accent-soft: rgba(56, 189, 248, 0.18);
        --ok: #34d399;
        --warn: #fbbf24;
        --error: #f87171;
        --shadow: 0 28px 60px rgba(8, 24, 54, 0.45);
      }

      @media (prefers-color-scheme: light) {
        :root {
          --bg-1: #e9f2ff;
          --bg-2: #f5f8ff;
          --bg-3: #ffffff;
          --surface: rgba(255, 255, 255, 0.94);
          --surface-raised: rgba(241, 245, 255, 0.92);
          --surface-soft: rgba(235, 241, 255, 0.75);
          --surface-border: rgba(2, 132, 199, 0.22);
          --fg: #0f172a;
          --muted: #52607f;
          --muted-strong: #1f2a44;
          --accent: #0284c7;
          --accent-strong: #0369a1;
          --accent-soft: rgba(2, 132, 199, 0.18);
          --ok: #16a34a;
          --warn: #ca8a04;
          --error: #dc2626;
          --shadow: 0 20px 40px rgba(15, 23, 42, 0.16);
        }
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: linear-gradient(160deg, var(--bg-1) 0%, var(--bg-2) 45%, var(--bg-3) 100%);
        color: var(--fg);
        padding: clamp(24px, 4vw, 48px);
      }

      a {
        color: var(--accent);
      }

      .container {
        max-width: 1240px;
        margin: 0 auto;
        display: grid;
        gap: clamp(20px, 3vw, 32px);
      }

      header {
        display: grid;
        gap: 10px;
        text-align: left;
      }

      header h1 {
        margin: 0;
        font-size: clamp(1.9rem, 4vw, 2.8rem);
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.1;
      }

      header p {
        margin: 0;
        color: var(--muted);
        font-size: clamp(0.95rem, 1.2vw, 1.05rem);
        max-width: 760px;
        line-height: 1.7;
      }

      .endpoint-links {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 10px;
      }

      .endpoint-links a {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid rgba(56, 189, 248, 0.38);
        background: rgba(56, 189, 248, 0.14);
        color: var(--accent);
        font-size: 0.85rem;
        font-weight: 500;
        text-decoration: none;
        transition: transform 0.15s ease, box-shadow 0.2s ease;
      }

      .endpoint-links a:hover,
      .endpoint-links a:focus-visible {
        transform: translateY(-1px);
        box-shadow: 0 10px 24px rgba(14, 165, 233, 0.25);
      }

      .grid {
        display: grid;
        gap: clamp(20px, 2.6vw, 32px);
        grid-template-columns: minmax(0, 1fr);
      }

      @media (min-width: 1080px) {
        .grid {
          grid-template-columns: 380px minmax(0, 1fr);
          align-items: start;
        }
      }

      .panel {
        position: relative;
        background: var(--surface);
        border-radius: 24px;
        padding: clamp(22px, 2.4vw, 30px);
        border: 1px solid var(--surface-border);
        box-shadow: var(--shadow);
        backdrop-filter: blur(22px);
        isolation: isolate;
        overflow: hidden;
        transition: transform 0.25s ease, box-shadow 0.25s ease;
      }

      .panel::before {
        content: "";
        position: absolute;
        inset: 0;
        background: radial-gradient(140% 120% at 110% -10%, var(--accent-soft) 0%, transparent 62%);
        opacity: 0.9;
        z-index: -1;
      }

      .panel--list::before {
        background: radial-gradient(140% 120% at 120% 0%, rgba(88, 101, 242, 0.22), transparent 65%);
      }

      .panel:hover {
        transform: translateY(-2px);
        box-shadow: 0 32px 70px rgba(14, 165, 233, 0.22);
      }

      .panel h2 {
        margin: 0 0 18px;
        font-size: clamp(1.1rem, 1.4vw, 1.25rem);
        letter-spacing: 0.015em;
      }

      .panel--sidebar {
        display: flex;
        flex-direction: column;
        gap: clamp(18px, 2.2vw, 24px);
      }

      .panel--list {
        display: flex;
        flex-direction: column;
        gap: clamp(20px, 2.4vw, 28px);
      }

      .sub-panel {
        background: var(--surface-raised);
        border-radius: 20px;
        padding: clamp(18px, 2.1vw, 22px);
        border: 1px solid var(--surface-border);
        display: flex;
        flex-direction: column;
        gap: clamp(16px, 2vw, 20px);
      }

      .sub-panel h3 {
        margin: 0;
        font-size: 0.88rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: rgba(148, 163, 184, 0.85);
      }

      form {
        display: grid;
        gap: clamp(14px, 2vw, 18px);
      }

      label {
        display: grid;
        gap: 8px;
        font-size: 0.85rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      input[type="number"] {
        padding: 12px 14px;
        font-size: 1rem;
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.25);
        background: rgba(15, 23, 42, 0.35);
        color: inherit;
        transition: border 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
      }

      input[type="number"]:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.18);
        transform: translateY(-1px);
        background: rgba(15, 23, 42, 0.55);
      }

      .button-group {
        display: grid;
        gap: 12px;
      }

      @media (min-width: 560px) {
        .button-group {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      button {
        appearance: none;
        border: none;
        border-radius: 14px;
        padding: 12px 18px;
        font-size: 0.95rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.2s ease;
      }

      button.primary {
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        color: #fff;
        box-shadow: 0 12px 32px rgba(14, 165, 233, 0.35);
      }

      button.primary:hover,
      button.primary:focus-visible {
        transform: translateY(-1px);
        box-shadow: 0 18px 42px rgba(14, 165, 233, 0.45);
      }

      button.secondary {
        background: rgba(148, 163, 184, 0.18);
        color: var(--fg);
        border: 1px solid rgba(148, 163, 184, 0.28);
      }

      button.secondary:hover,
      button.secondary:focus-visible {
        transform: translateY(-1px);
        border-color: rgba(148, 163, 184, 0.45);
        background: rgba(148, 163, 184, 0.24);
      }

      button:disabled {
        opacity: 0.65;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      #settings-feedback {
        min-height: 20px;
        font-size: 0.82rem;
        color: var(--muted);
      }

      .status-grid {
        display: grid;
        gap: clamp(12px, 1.8vw, 18px);
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      }

      .status-card {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        gap: 14px;
        min-height: 160px;
        padding: 18px 20px;
        border-radius: 18px;
        background: var(--surface-soft);
        border: 1px solid var(--surface-border);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }

      .status-card h3 {
        margin: 0;
        font-size: 0.78rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(148, 163, 184, 0.85);
      }

      .status-card .value {
        font-size: clamp(1.6rem, 5vw, 2.4rem);
        font-weight: 700;
        line-height: 1.15;
        color: var(--muted-strong);
      }

      .status-card progress {
        width: 100%;
        height: 12px;
        border-radius: 999px;
        margin-top: 6px;
        background: rgba(148, 163, 184, 0.2);
      }

      .status-card progress::-webkit-progress-bar {
        background: transparent;
      }

      .status-card progress::-webkit-progress-value {
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
      }

      .status-card progress::-moz-progress-bar {
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        max-width: 100%;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.18);
        border: 1px solid rgba(148, 163, 184, 0.28);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        line-height: 1.35;
        color: var(--muted);
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        border-radius: 999px;
        background: rgba(56, 189, 248, 0.18);
        border: 1px solid rgba(56, 189, 248, 0.38);
        color: var(--accent);
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.02em;
      }

      .pill.warn {
        background: rgba(251, 191, 36, 0.16);
        border-color: rgba(251, 191, 36, 0.4);
        color: var(--warn);
      }

      .pill.error {
        background: rgba(248, 113, 113, 0.16);
        border-color: rgba(248, 113, 113, 0.4);
        color: var(--error);
      }

      .list-header {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 6px;
      }

      .list-header h2 {
        margin: 0;
        font-size: clamp(1.15rem, 1.6vw, 1.35rem);
      }

      .list-subtitle {
        margin: 4px 0 0;
        color: var(--muted);
        font-size: 0.9rem;
      }

      .list-container {
        flex: 1;
        max-height: 72vh;
        overflow: auto;
        padding: 20px;
        border-radius: 20px;
        background: var(--surface-raised);
        border: 1px solid var(--surface-border);
        font-family: "Fira Code", "Consolas", "Roboto Mono", monospace;
        font-size: 0.92rem;
        line-height: 1.65;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
      }

      .list-container::-webkit-scrollbar {
        width: 10px;
      }

      .list-container::-webkit-scrollbar-track {
        background: rgba(148, 163, 184, 0.12);
        border-radius: 999px;
      }

      .list-container::-webkit-scrollbar-thumb {
        background: rgba(14, 165, 233, 0.55);
        border-radius: 999px;
      }

      .list-container.empty {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--muted);
        text-align: center;
      }

      .errors {
        background: var(--surface-raised);
        border: 1px solid rgba(248, 204, 21, 0.35);
      }

      .errors h3 {
        color: var(--warn);
      }

      .errors ul {
        margin: 12px 0 0;
        padding-left: 20px;
        display: grid;
        gap: 6px;
        color: var(--warn);
      }

      #error-container.empty {
        text-align: center;
        color: var(--muted);
      }

      footer {
        font-size: 0.85rem;
        color: var(--muted);
        text-align: center;
      }

      code {
        font-family: "Fira Code", "Consolas", monospace;
        background: rgba(148, 163, 184, 0.2);
        color: inherit;
        padding: 2px 6px;
        border-radius: 6px;
      }

      @media (max-width: 960px) {
        header {
          text-align: center;
        }

        header p {
          margin-left: auto;
          margin-right: auto;
        }

        .endpoint-links {
          justify-content: center;
        }
      }

      @media (max-width: 720px) {
        body {
          padding: 20px 16px 36px;
        }

        .panel {
          border-radius: 20px;
        }

        .list-header {
          flex-direction: column;
          align-items: flex-start;
        }
      }

      @media (max-width: 560px) {
        .status-card {
          min-height: 140px;
        }

        .list-container {
          max-height: 60vh;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <h1>Agregador de Proxies — Painel tempo real</h1>
        <p>Lista deduplicada de proxies HTTP coletada a cada 5 minutos.</p>
        <nav class="endpoint-links" aria-label="Endpoints disponíveis">
          <a href="/proxies" target="_blank" rel="noopener noreferrer">/proxies</a>
          <a href="/proxies-validos?format=json" target="_blank" rel="noopener noreferrer">
            /proxies-validos?format=json
          </a>
          <a href="/proxies-validos/stream" target="_blank" rel="noopener noreferrer">
            /proxies-validos/stream
          </a>
          <a href="/settings" target="_blank" rel="noopener noreferrer">/settings</a>
        </nav>
      </header>

      <main class="grid">
        <section class="panel panel--sidebar" aria-label="Configurações">
          <h2>Configuração da validação</h2>
          <form id="settings-form">
            <label>
              Limite de proxies a analisar (0 para ilimitado)
              <input
                type="number"
                id="max-proxies"
                name="maxProxies"
                min="0"
                step="1"
                value="0"
              />
            </label>
            <label>
              Concorrência máxima
              <input
                type="number"
                id="validator-concurrency"
                name="concurrency"
                min="1"
                step="1"
                value="100"
              />
            </label>
            <label>
              Timeout (ms) por proxy
              <input
                type="number"
                id="validator-timeout"
                name="timeoutMs"
                min="1000"
                step="100"
                value="7000"
              />
            </label>
            <div class="button-group">
              <button type="submit" class="primary">Salvar configurações</button>
              <button type="button" class="secondary" id="refresh-button">
                Forçar atualização agora
              </button>
            </div>
            <small id="settings-feedback"></small>
          </form>

          <div class="sub-panel" aria-label="Resumo">
            <h3>Resumo</h3>
            <div class="status-grid">
              <div class="status-card">
                <h3>Proxies aprovados</h3>
                <div class="value" id="approved-count">0</div>
                <div class="badge" id="limit-badge">Limite aplicado: —</div>
              </div>
              <div class="status-card">
                <h3>Proxies agregados</h3>
                <div class="value" id="raw-count">0</div>
                <div class="badge" id="last-refresh">Última atualização: —</div>
              </div>
              <div class="status-card">
                <h3>Progresso</h3>
                <progress id="validation-progress" value="0" max="100"></progress>
                <div class="badge" id="progress-label">Aguardando início</div>
              </div>
              <div class="status-card">
                <h3>Próxima atualização</h3>
                <div class="value" id="next-refresh">—</div>
                <div class="badge" id="refresh-status">Inativo</div>
              </div>
            </div>
          </div>

          <div class="sub-panel errors" aria-label="Erros recentes">
            <h3>Erros recentes</h3>
            <div id="error-container" class="empty">Nenhum erro registrado.</div>
          </div>
        </section>

        <section class="panel panel--list" aria-label="Lista de proxies aprovados">
          <div class="list-header">
            <div>
              <h2>Lista de proxies aprovados</h2>
              <p class="list-subtitle">
                Atualização em tempo real via Server-Sent Events.
              </p>
            </div>
            <span class="pill" id="status-pill">Sem atualização em andamento</span>
          </div>
          <div id="proxy-list" class="list-container empty">
            Aguardando resultados da validação...
          </div>
        </section>
      </main>

      <footer>
        API expõe também os endpoints JSON:
        <code>/proxies</code>,
        <code>/proxies-validos?format=json</code>,
        <code>/proxies-validos/stream</code>,
        <code>/settings</code>.
      </footer>
    </div>

    <script>
      const initialSnapshot = ${initialState};
      const state = {
        snapshot: initialSnapshot,
        eventSource: null,
        reconnectTimer: null
      };

      const numberFormatter = new Intl.NumberFormat("pt-BR");
      const proxyListEl = document.getElementById("proxy-list");
      const approvedCountEl = document.getElementById("approved-count");
      const rawCountEl = document.getElementById("raw-count");
      const lastRefreshEl = document.getElementById("last-refresh");
      const limitBadgeEl = document.getElementById("limit-badge");
      const statusPillEl = document.getElementById("status-pill");
      const errorContainerEl = document.getElementById("error-container");
      const progressBarEl = document.getElementById("validation-progress");
      const progressLabelEl = document.getElementById("progress-label");
      const nextRefreshEl = document.getElementById("next-refresh");
      const refreshStatusEl = document.getElementById("refresh-status");
      const settingsFormEl = document.getElementById("settings-form");
      const settingsFeedbackEl = document.getElementById("settings-feedback");
      const refreshButtonEl = document.getElementById("refresh-button");
      const maxProxiesInput = document.getElementById("max-proxies");
      const concurrencyInput = document.getElementById("validator-concurrency");
      const timeoutInput = document.getElementById("validator-timeout");

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          closeEventSource();
        } else {
          openEventSource();
        }
      });

      settingsFormEl.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(settingsFormEl);
        const payload = {};
        for (const [key, value] of formData.entries()) {
          if (value === "") {
            continue;
          }
          payload[key] = Number(value);
        }

        try {
          settingsFeedbackEl.textContent = "Enviando...";
          settingsFeedbackEl.style.color = "var(--muted)";

          const response = await fetch("/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          const result = await response.json();
          if (!response.ok || !result.ok) {
            const message =
              result?.erro ??
              (\`Falha ao salvar configurações (status \${response.status})\`);
            settingsFeedbackEl.textContent = message;
            settingsFeedbackEl.style.color = "var(--error)";
            return;
          }

          settingsFeedbackEl.textContent = "Configurações salvas. Aplique uma atualização para usar imediatamente.";
          settingsFeedbackEl.style.color = "var(--ok)";
        } catch (error) {
          settingsFeedbackEl.textContent = error.message || "Erro inesperado ao salvar.";
          settingsFeedbackEl.style.color = "var(--error)";
        }
      });

      refreshButtonEl.addEventListener("click", async () => {
        refreshButtonEl.disabled = true;
        refreshButtonEl.textContent = "Atualizando...";
        try {
          const response = await fetch("/proxies-validos?refresh=1&format=json", {
            headers: { Accept: "application/json" }
          });
          const result = await response.json();
          applySnapshot(result);
          refreshButtonEl.textContent = "Atualização concluída";
          setTimeout(() => {
            refreshButtonEl.disabled = false;
            refreshButtonEl.textContent = "Forçar atualização agora";
          }, 1500);
        } catch (error) {
          refreshButtonEl.textContent = "Falha na atualização";
          settingsFeedbackEl.textContent = error.message || "Erro ao forçar atualização.";
          settingsFeedbackEl.style.color = "var(--error)";
          setTimeout(() => {
            refreshButtonEl.disabled = false;
            refreshButtonEl.textContent = "Forçar atualização agora";
          }, 2500);
        }
      });

      function escapeHtml(text) {
        const map = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        };
        return String(text).replace(/[&<>"']/g, (char) => map[char]);
      }

      function formatNumber(value) {
        if (!Number.isFinite(value)) {
          return "0";
        }
        return numberFormatter.format(value);
      }

      function applySnapshot(snapshot) {
        state.snapshot = snapshot;
        updateSettingsInputs(snapshot);
        renderSummary(snapshot);
        renderErrors(snapshot);
        renderProxyList(snapshot);
      }

      function updateSettingsInputs(snapshot) {
        if (snapshot?.limiteConfigurado === null || snapshot?.limiteConfigurado === undefined) {
          maxProxiesInput.value = "0";
        } else {
          maxProxiesInput.value = snapshot.limiteConfigurado;
        }
        if (snapshot?.concorrenciaConfigurada) {
          concurrencyInput.value = snapshot.concorrenciaConfigurada;
        }
        if (snapshot?.timeoutConfiguradoMs) {
          timeoutInput.value = snapshot.timeoutConfiguradoMs;
        }
      }

      function renderSummary(snapshot) {
        approvedCountEl.textContent = formatNumber(snapshot?.quantidade ?? 0);
        rawCountEl.textContent = formatNumber(snapshot?.quantidadeBruta ?? 0);

        const ultimaAtualizacao = snapshot?.ultimaAtualizacao
          ? new Date(snapshot.ultimaAtualizacao).toLocaleString("pt-BR")
          : "—";
        lastRefreshEl.textContent = "Última atualização: " + ultimaAtualizacao;

        const limiteAplicado = snapshot?.limiteAplicado;
        const limiteConfigurado = snapshot?.limiteConfigurado;
        if (typeof limiteAplicado === "number" && limiteAplicado > 0) {
          const label = limiteConfigurado === null
            ? "Sem limite configurado (todos analisados)"
            : \`\${formatNumber(limiteAplicado)} / limite \${formatNumber(limiteConfigurado)}\`;
          limitBadgeEl.textContent = \`Limite aplicado: \${label}\`;
        } else if (limiteConfigurado === null) {
          limitBadgeEl.textContent = "Limite aplicado: sem limite";
        } else {
          limitBadgeEl.textContent = "Limite aplicado: aguardando rodada";
        }

        const proximaAtualizacao = snapshot?.proximaAtualizacaoEmSegundos;
        if (Number.isFinite(proximaAtualizacao)) {
          nextRefreshEl.textContent = formatCountdown(proximaAtualizacao);
        } else {
          nextRefreshEl.textContent = "—";
        }

        const andamento = snapshot?.atualizando;
        statusPillEl.textContent = andamento
          ? "Atualização em andamento"
          : "Sem atualização em andamento";
        statusPillEl.classList.toggle("warn", Boolean(andamento));
        statusPillEl.classList.toggle("error", false);

        refreshStatusEl.textContent = andamento ? "Em atualização" : "Aguardando próxima rodada";

        const parcial = snapshot?.validacaoParcial;
        if (parcial) {
          const percentual = Math.max(0, Math.min(100, Number(parcial.percentualConcluido) || 0));
          progressBarEl.value = percentual;
          progressLabelEl.textContent = \`\${percentual.toFixed(1)}% | Testados \${formatNumber(parcial.testados ?? 0)} de \${formatNumber(parcial.total ?? 0)}\`;
        } else if (snapshot?.validacao?.concluidoEm) {
          progressBarEl.value = 100;
          progressLabelEl.textContent = "Última validação concluída";
        } else {
          progressBarEl.value = 0;
          progressLabelEl.textContent = "Aguardando próxima validação";
        }
      }

      function renderErrors(snapshot) {
        const erros = Array.isArray(snapshot?.erros) ? snapshot.erros : [];
        const mensagens = [];

        if (typeof snapshot?.erroAtualizacaoManual === "string") {
          mensagens.push("Falha ao forçar atualização: " + snapshot.erroAtualizacaoManual);
        }
        if (typeof snapshot?.ultimoErroValidacao === "string") {
          mensagens.push("Erro na validação: " + snapshot.ultimoErroValidacao);
        }
        if (typeof snapshot?.ultimoErro === "string") {
          mensagens.push("Erro de agregação: " + snapshot.ultimoErro);
        }
        for (const item of erros) {
          if (!item) continue;
          if (typeof item === "string") {
            mensagens.push(item);
          } else if (typeof item === "object") {
            const origem = item.origem ? \`[\${item.origem}]\` : "[origem desconhecida]";
            const mensagem = item.mensagem ?? JSON.stringify(item);
            mensagens.push(\`\${origem} \${mensagem}\`);
          }
        }

        if (mensagens.length === 0) {
          errorContainerEl.classList.add("empty");
          errorContainerEl.innerHTML = "Nenhum erro registrado.";
          return;
        }

        errorContainerEl.classList.remove("empty");
        errorContainerEl.innerHTML = "<ul>" + mensagens.map((msg) => "<li>" + escapeHtml(String(msg)) + "</li>").join("") + "</ul>";
      }

      function renderProxyList(snapshot) {
        const proxies = Array.isArray(snapshot?.proxies) ? snapshot.proxies : [];
        if (proxies.length === 0) {
          proxyListEl.classList.add("empty");
          proxyListEl.textContent = "Nenhum proxy aprovado na rodada atual.";
          return;
        }

        proxyListEl.classList.remove("empty");
        proxyListEl.innerHTML = proxies
          .map((proxy, index) => \`\${index + 1}. \${escapeHtml(proxy)}\`)
          .join("<br />");
      }

      function formatCountdown(seconds) {
        const total = Math.max(0, Number(seconds) || 0);
        const minutes = Math.floor(total / 60);
        const secs = total % 60;
        return \`\${minutes.toString().padStart(2, "0")}:\${secs.toString().padStart(2, "0")} min\`;
      }

      function openEventSource() {
        if (state.eventSource) {
          return;
        }

        const source = new EventSource("/proxies-validos/stream");
        state.eventSource = source;

        source.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data);
            applySnapshot(data);
          } catch (error) {
            console.error("Falha ao processar evento SSE:", error);
          }
        });

        source.addEventListener("error", () => {
          closeEventSource();
          scheduleReconnect();
        });
      }

      function closeEventSource() {
        if (!state.eventSource) {
          return;
        }
        state.eventSource.close();
        state.eventSource = null;
      }

      function scheduleReconnect() {
        if (state.reconnectTimer) {
          return;
        }
        state.reconnectTimer = setTimeout(() => {
          state.reconnectTimer = null;
          openEventSource();
        }, 3000);
      }

      function startCountdownTick() {
        setInterval(() => {
          const snapshot = state.snapshot;
          if (!snapshot) return;
          if (!Number.isFinite(snapshot.proximaAtualizacaoEmSegundos)) {
            return;
          }
          if (snapshot.proximaAtualizacaoEmSegundos > 0) {
            snapshot.proximaAtualizacaoEmSegundos -= 1;
            nextRefreshEl.textContent = formatCountdown(snapshot.proximaAtualizacaoEmSegundos);
          }
        }, 1000);
      }

      applySnapshot(initialSnapshot);
      openEventSource();
      startCountdownTick();
    </script>
  </body>
</html>`;
}

function escapeForScript(value) {
  return JSON.stringify(value, (_key, val) => {
    if (val instanceof Date) {
      return val.toISOString();
    }
    return val;
  })
    .replace(/</g, "\\\\u003C")
    .replace(/>/g, "\\\\u003E")
    .replace(/&/g, "\\\\u0026");
}
