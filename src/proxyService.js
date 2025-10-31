const PROXYSCRAPE_URL =
  "https://api.proxyscrape.com/v4/free-proxy-list/get?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all&skip=0&limit=2000";

const FREE_PROXY_LIST_URL = "https://free-proxy-list.net/en/";
const SPEEDX_HTTP_URL =
  "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt";
const FRESH_PROXY_LIST_URL =
  "https://vakhov.github.io/fresh-proxy-list/proxylist.txt";

export async function fetchProxyScrapeList(signal) {
  const response = await fetch(PROXYSCRAPE_URL, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    signal
  });

  if (!response.ok) {
    throw new Error(
      `Requisição ao ProxyScrape falhou com status ${response.status}`
    );
  }

  const body = await response.text();
  return parseProxyLines(body);
}

export async function fetchFreeProxyList(signal) {
  const response = await fetch(FREE_PROXY_LIST_URL, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    signal
  });

  if (!response.ok) {
    throw new Error(
      `Requisição ao free-proxy-list.net falhou com status ${response.status}`
    );
  }

  const html = await response.text();
  return parseProxiesFromHtml(html);
}

export async function fetchSpeedxHttpList(signal) {
  const response = await fetch(SPEEDX_HTTP_URL, {
    headers: {
      accept: "text/plain",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    signal
  });

  if (!response.ok) {
    throw new Error(
      `Requisição ao repositório TheSpeedX falhou com status ${response.status}`
    );
  }

  const body = await response.text();
  return parseProxyLines(body);
}

export async function fetchFreshProxyList(signal) {
  const response = await fetch(FRESH_PROXY_LIST_URL, {
    headers: {
      accept: "text/plain",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    signal
  });

  if (!response.ok) {
    throw new Error(
      `Requisição ao fresh-proxy-list falhou com status ${response.status}`
    );
  }

  const body = await response.text();
  return parseProxyLines(body);
}

export async function loadAggregatedProxies({ timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const [scrapeList, freeList, speedxList, freshList] =
      await Promise.allSettled([
        fetchProxyScrapeList(controller.signal),
        fetchFreeProxyList(controller.signal),
        fetchSpeedxHttpList(controller.signal),
        fetchFreshProxyList(controller.signal)
      ]);

    const proxies = new Set();
    const erros = [];

    if (scrapeList.status === "fulfilled") {
      scrapeList.value.forEach((p) => proxies.add(p));
    } else {
      erros.push({
        origem: "proxyscrape",
        mensagem: scrapeList.reason instanceof Error
          ? scrapeList.reason.message
          : String(scrapeList.reason)
      });
    }

    if (freeList.status === "fulfilled") {
      freeList.value.forEach((p) => proxies.add(p));
    } else {
      erros.push({
        origem: "free-proxy-list",
        mensagem: freeList.reason instanceof Error
          ? freeList.reason.message
          : String(freeList.reason)
      });
    }

    if (speedxList.status === "fulfilled") {
      speedxList.value.forEach((p) => proxies.add(p));
    } else {
      erros.push({
        origem: "speedx-http",
        mensagem: speedxList.reason instanceof Error
          ? speedxList.reason.message
          : String(speedxList.reason)
      });
    }

    if (freshList.status === "fulfilled") {
      freshList.value.forEach((p) => proxies.add(p));
    } else {
      erros.push({
        origem: "fresh-proxy-list",
        mensagem: freshList.reason instanceof Error
          ? freshList.reason.message
          : String(freshList.reason)
      });
    }

    const deduped = Array.from(proxies);
    shuffleArray(deduped);

    return {
      proxies: deduped,
      erros
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseProxyLines(body) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && isValidProxy(line));
}

function parseProxiesFromHtml(html) {
  const proxies = [];
  const rowRegex =
    /<tr[^>]*>\s*<td>(\d{1,3}(?:\.\d{1,3}){3})<\/td>\s*<td>(\d+)<\/td>/gi;
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const proxy = `${match[1]}:${match[2]}`;
    if (isValidProxy(proxy)) {
      proxies.push(proxy);
    }
  }

  return proxies;
}

function isValidProxy(entry) {
  return /^\d{1,3}(?:\.\d{1,3}){3}:\d{2,5}$/.test(entry);
}

function shuffleArray(array) {
  for (let index = array.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    if (randomIndex !== index) {
      const temp = array[index];
      array[index] = array[randomIndex];
      array[randomIndex] = temp;
    }
  }
}
