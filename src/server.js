import http from "node:http";
import { ProxyCache } from "./proxyCache.js";
import { renderHtmlDashboard } from "./htmlDashboard.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const proxyCache = new ProxyCache({
  refreshIntervalMs: 5 * 60 * 1000,
  fetchTimeoutMs: 15000,
  validation: buildValidationOptionsFromEnv()
});

proxyCache.start().catch((error) => {
  console.error("Falha inesperada no cache de proxies:", error);
});

const server = http.createServer(async (req, res) => {
  try {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", "http://localhost");

    if (method === "GET") {
      switch (url.pathname) {
        case "/":
          return handleRoot(res);
        case "/proxies":
          return handleProxiesRequest({ validated: false, url, req, res });
        case "/proxies-validos":
          return handleProxiesRequest({ validated: true, url, req, res });
        case "/proxies-validos/stream":
          return handleValidatedStream(req, res);
        default:
          return handleNotFound(res);
      }
    }

    if (method === "POST" && url.pathname === "/settings") {
      return handleSettings(req, res);
    }

    return handleMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    handleServerError(res, error);
  }
});

server.listen(PORT, () => {
  console.log(`API de agregação de proxies escutando na porta ${PORT}`);
});

function handleRoot(res) {
  return respondWithJson(res, 200, {
    servico: "agregador-de-proxies",
    endpoints: {
      "/proxies": "Lista agregada, sem validação.",
      "/proxies-validos": "Lista validada, aceita ?format=html|json.",
      "/proxies-validos/stream": "Stream SSE com atualizações em tempo real.",
      "/settings": "POST JSON para ajustar maxProxies, concurrency e timeout."
    }
  });
}

async function handleProxiesRequest({ validated, url, req, res }) {
  let refreshSnapshot = null;
  let manualRefreshError = null;

  if (url.searchParams.has("refresh")) {
    try {
      refreshSnapshot = await proxyCache.refresh();
    } catch (error) {
      manualRefreshError =
        error instanceof Error ? error.message : String(error);
    }
  }

  const baseSnapshot = refreshSnapshot
    ? validated
      ? refreshSnapshot.validated
      : refreshSnapshot.raw
    : validated
    ? proxyCache.getValidatedSnapshot()
    : proxyCache.getRawSnapshot();

  const payload = {
    ...baseSnapshot,
    atualizando: proxyCache.isRefreshing()
  };

  if (manualRefreshError) {
    payload.erroAtualizacaoManual = manualRefreshError;
  }

  const hasData =
    payload.quantidade > 0 ||
    payload.ultimaAtualizacao !== null ||
    Boolean(payload.validacaoParcial);
  const statusCode = hasData ? 200 : 503;

  if (validated && shouldRespondWithHtml(url, req)) {
    return respondWithHtml(res, 200, renderHtmlDashboard(payload));
  }

  return respondWithJson(res, statusCode, payload);
}

function shouldRespondWithHtml(url, req) {
  const formatParam = url.searchParams.get("format");
  if (formatParam === "json") {
    return false;
  }
  if (formatParam === "html") {
    return true;
  }
  return acceptsHtml(req);
}

function handleValidatedStream(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });

  const pushSnapshot = (snapshot) => {
    const payload = {
      ...snapshot,
      atualizando: proxyCache.isRefreshing()
    };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  pushSnapshot(proxyCache.getValidatedSnapshot());
  const unsubscribe = proxyCache.addValidatedListener(pushSnapshot);
  const heartbeat = setInterval(() => {
    res.write(`: keepalive ${Date.now()}\n\n`);
  }, 15000);
  heartbeat.unref?.();

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

async function handleSettings(req, res) {
  try {
    const body = await readJsonBody(req);
    if (!body || typeof body !== "object") {
      throw new Error("Corpo JSON inválido ou ausente.");
    }

    const updates = {};
    if (Object.prototype.hasOwnProperty.call(body, "maxProxies")) {
      updates.maxProxies = body.maxProxies;
    }
    if (Object.prototype.hasOwnProperty.call(body, "concurrency")) {
      updates.concurrency = body.concurrency;
    }
    if (Object.prototype.hasOwnProperty.call(body, "timeoutMs")) {
      updates.timeoutMs = body.timeoutMs;
    }

    const applied = proxyCache.updateValidationOptions(updates);
    return respondWithJson(res, 200, {
      ok: true,
      configuracao: applied,
      mensagem:
        "Configurações atualizadas. Use o botão de atualização para aplicar imediatamente."
    });
  } catch (error) {
    return respondWithJson(res, 400, {
      ok: false,
      erro: error instanceof Error ? error.message : String(error)
    });
  }
}

function handleNotFound(res) {
  return respondWithJson(res, 404, { erro: "Não encontrado" });
}

function handleMethodNotAllowed(res, allowedMethods) {
  res.statusCode = 405;
  res.setHeader("Allow", allowedMethods.join(", "));
  return respondWithJson(res, 405, { erro: "Método não permitido" });
}

function handleServerError(res, error) {
  console.error("Erro ao processar requisição:", error);
  return respondWithJson(res, 500, {
    erro: "Falha ao processar requisição",
    mensagem: error instanceof Error ? error.message : String(error)
  });
}

function respondWithJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function respondWithHtml(res, status, html) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(html);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (chunks.reduce((size, part) => size + part.length, 0) > 1_000_000) {
      throw new Error("Payload muito grande.");
    }
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    throw new Error("JSON malformado.");
  }
}

function acceptsJson(req) {
  const header = req.headers.accept;
  if (!header) {
    return true;
  }
  return header.includes("application/json") || header.includes("*/*");
}

function acceptsHtml(req) {
  const header = req.headers.accept;
  if (!header) {
    return false;
  }
  return header.includes("text/html");
}

function buildValidationOptionsFromEnv() {
  const options = {};

  const target = process.env.VALIDATOR_TARGET_URL;
  if (typeof target === "string" && target.length > 0) {
    options.targetUrl = target;
  }

  const timeout = parsePositiveInteger(process.env.VALIDATOR_TIMEOUT_MS);
  if (timeout !== null) {
    options.timeoutMs = timeout;
  }

  const concurrency = parsePositiveInteger(
    process.env.VALIDATOR_CONCURRENCY
  );
  if (concurrency !== null) {
    options.concurrency = concurrency;
  }

  const maxProxiesEnv = process.env.VALIDATOR_MAX_PROXIES;
  if (maxProxiesEnv !== undefined) {
    const parsedMax = parsePositiveInteger(maxProxiesEnv);
    if (parsedMax !== null) {
      options.maxProxies = parsedMax;
    } else if (Number.parseInt(maxProxiesEnv, 10) === 0) {
      options.maxProxies = null;
    }
  }

  return options;
}

function parsePositiveInteger(value) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}
