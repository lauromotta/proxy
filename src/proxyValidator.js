import { ProxyAgent, fetch as undiciFetch } from "undici";

const DEFAULT_TARGET_URL = "https://www.youtube.com/";
const DEFAULT_TIMEOUT_MS = 7000;
const DEFAULT_CONCURRENCY = 100;
const DEFAULT_MAX_FAILURE_SAMPLES = 25;

export async function validateProxies(
  proxies,
  {
    targetUrl = DEFAULT_TARGET_URL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    concurrency = DEFAULT_CONCURRENCY,
    maxFailureSamples = DEFAULT_MAX_FAILURE_SAMPLES,
    signal,
    onProgress,
    onProxyApproved
  } = {}
) {
  if (!Array.isArray(proxies) || proxies.length === 0) {
    return {
      ativos: [],
      falhas: [],
      testados: 0,
      aprovados: 0,
      duracaoMs: 0,
      concluidoEm: new Date().toISOString(),
      urlAlvo: targetUrl,
      timeoutMs,
      concorrencia: 0,
      total: 0
    };
  }

  const inicio = Date.now();
  let aborted = Boolean(signal?.aborted);

  const abortListener =
    signal && typeof signal.addEventListener === "function"
      ? () => {
          aborted = true;
        }
      : null;

  if (signal?.aborted) {
    aborted = true;
  }

  if (abortListener) {
    signal.addEventListener("abort", abortListener, { once: true });
  }

  const ativos = [];
  const falhas = [];
  let testados = 0;
  let aprovados = 0;
  const total = proxies.length;

  const trabalhadores = Math.max(
    1,
    Math.min(concurrency, proxies.length)
  );
  let indice = 0;

  async function worker() {
    while (true) {
      if (signal?.aborted) {
        aborted = true;
        break;
      }

      const indiceAtual = indice++;
      if (indiceAtual >= proxies.length) {
        break;
      }

      const proxy = proxies[indiceAtual];

      let resultado;
      try {
        resultado = await checkProxy(proxy, {
          targetUrl,
          timeoutMs,
          abortSignal: signal
        });
      } catch (error) {
        resultado = {
          ok: false,
          motivo: error instanceof Error ? error.message : String(error)
        };
      }

      testados += 1;
      if (resultado.ok) {
        aprovados += 1;
        ativos.push(proxy);
        if (typeof onProxyApproved === "function") {
          onProxyApproved({
            proxy,
            total,
            testados,
            aprovados,
            reprovados: testados - aprovados,
            restantes: total - testados,
            percentual: total === 0 ? 100 : Math.round((testados / total) * 100)
          });
        }
      } else if (falhas.length < maxFailureSamples) {
        falhas.push({
          proxy,
          motivo: resultado.motivo ?? "Falha desconhecida",
          status: resultado.status ?? null
        });
      }

      if (typeof onProgress === "function" && !signal?.aborted) {
        const reprovados = testados - aprovados;
        const restantes = total - testados;
        const percentual =
          total === 0 ? 100 : Math.round((testados / total) * 100);

        onProgress({
          total,
          testados,
          aprovados,
          reprovados,
          restantes,
          percentual
        });
      }
    }
  }

  const trabalhadoresAtivos = Array.from(
    { length: trabalhadores },
    () => worker()
  );
  await Promise.all(trabalhadoresAtivos);

  if (abortListener && signal && typeof signal.removeEventListener === "function") {
    signal.removeEventListener("abort", abortListener);
  }

  return {
    ativos,
    falhas,
    testados,
    aprovados,
    duracaoMs: Date.now() - inicio,
    concluidoEm: new Date().toISOString(),
    urlAlvo: targetUrl,
    timeoutMs,
    concorrencia: trabalhadores,
    total,
    abortado: aborted
  };
}

async function checkProxy(proxy, { targetUrl, timeoutMs, abortSignal }) {
  const proxyUrl = `http://${proxy}`;
  const agent = new ProxyAgent(proxyUrl);
  const controller = new AbortController();

  const signals = [controller.signal];
  if (abortSignal) {
    signals.push(abortSignal);
  }

  const compositeSignal =
    signals.length > 1 && typeof AbortSignal.any === "function"
      ? AbortSignal.any(signals)
      : controller.signal;

  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (abortSignal?.aborted) {
      controller.abort();
      return {
        ok: false,
        motivo: "Validação cancelada"
      };
    }

    const response = await undiciFetch(targetUrl, {
      method: "GET",
      dispatcher: agent,
      signal: compositeSignal,
      redirect: "manual"
    });

    const sucesso =
      (response.status >= 200 && response.status < 400) ||
      response.status === 403 ||
      response.status === 405;

    if (!sucesso) {
      return {
        ok: false,
        status: response.status,
        motivo: `Status ${response.status} recebido do alvo`
      };
    }

    return {
      ok: true,
      status: response.status
    };
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      motivo: mensagem
    };
  } finally {
    clearTimeout(timer);
    await agent.close();
  }
}
