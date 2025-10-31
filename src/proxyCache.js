import { loadAggregatedProxies } from "./proxyService.js";
import { validateProxies } from "./proxyValidator.js";

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
const DEFAULT_VALIDATION_OPTIONS = {
  targetUrl: "https://www.youtube.com/",
  timeoutMs: 7000,
  concurrency: 100,
  maxFailureSamples: 25,
  maxProxies: 5000,
  maxDurationMs: null
};

export class ProxyCache {
  constructor({
    refreshIntervalMs = FIVE_MINUTES_IN_MS,
    fetchTimeoutMs = 15000,
    validation = {}
  } = {}) {
    this.refreshIntervalMs = refreshIntervalMs;
    this.fetchTimeoutMs = fetchTimeoutMs;
    this.validationOptions = {
      ...DEFAULT_VALIDATION_OPTIONS,
      ...validation
    };
    if (
      this.validationOptions.maxDurationMs === null ||
      this.validationOptions.maxDurationMs === undefined
    ) {
      this.validationOptions.maxDurationMs = Math.max(
        60_000,
        Math.floor(this.refreshIntervalMs * 0.85)
      );
    }
    this.state = {
      raw: {
        proxies: [],
        quantidade: 0,
        erros: [],
        ultimaAtualizacao: null,
        ultimaTentativa: null,
        ultimoErro: null
      },
      validated: {
        proxies: [],
        quantidade: 0,
        quantidadeBruta: 0,
        erros: [],
        validacao: null,
        ultimaAtualizacao: null,
        ultimaTentativa: null,
        ultimoErro: null,
        ultimoErroValidacao: null,
        limiteConfigurado: this.validationOptions.maxProxies ?? null,
        limiteAplicado: 0,
        concorrenciaConfigurada: this.validationOptions.concurrency,
        timeoutConfiguradoMs: this.validationOptions.timeoutMs,
      duracaoMaxMs: this.validationOptions.maxDurationMs
      },
      validationProgress: null
    };
    this._timer = null;
    this._refreshPromise = null;
    this._validatedProxySet = new Set();
    this._validatedListeners = new Set();
  }

  async start() {
    try {
      await this.refresh();
    } catch (error) {
      console.error("Falha inicial ao atualizar proxies:", error);
    }

    this._timer = setInterval(() => {
      this.refresh().catch((error) => {
        console.error("Falha durante atualização agendada de proxies:", error);
      });
    }, this.refreshIntervalMs);

    // Permite que o processo encerre naturalmente mesmo com o timer ativo.
    this._timer.unref?.();
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  isRefreshing() {
    return Boolean(this._refreshPromise);
  }

  async refresh() {
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    const attemptStartedAt = new Date();
    const attemptIso = attemptStartedAt.toISOString();

    this._refreshPromise = (async () => {
      let aggregated;

      try {
        aggregated = await loadAggregatedProxies({
          timeoutMs: this.fetchTimeoutMs
        });
      } catch (error) {
        const message = extractErrorMessage(error);
        this.state.raw = {
          ...this.state.raw,
          ultimaTentativa: attemptIso,
          ultimoErro: message
        };
        this.state.validated = {
          ...this.state.validated,
          ultimaTentativa: attemptIso,
          ultimoErro: message
        };
        this.state.validationProgress = null;
        this._validatedProxySet.clear();
        this._emitValidatedUpdate();
        throw error;
      }

      this.state.raw = {
        proxies: aggregated.proxies,
        quantidade: aggregated.proxies.length,
        erros: aggregated.erros,
        ultimaAtualizacao: attemptIso,
        ultimaTentativa: attemptIso,
        ultimoErro: null
      };
      this.state.validated = {
        ...this.state.validated,
        proxies: [],
        quantidade: 0,
        quantidadeBruta: aggregated.proxies.length,
        erros: aggregated.erros,
        validacao: null,
        ultimaTentativa: attemptIso,
        ultimoErro: null,
        ultimoErroValidacao: null,
        limiteConfigurado: this.validationOptions.maxProxies ?? null,
        limiteAplicado: 0,
        concorrenciaConfigurada: this.validationOptions.concurrency,
        timeoutConfiguradoMs: this.validationOptions.timeoutMs,
        duracaoMaxMs: this.validationOptions.maxDurationMs
      };
      this._validatedProxySet = new Set();

      this._emitValidatedUpdate();

      const maxProxies = this.validationOptions.maxProxies;
      const validationCandidates =
        typeof maxProxies === "number" && maxProxies > 0
          ? aggregated.proxies.slice(0, maxProxies)
          : aggregated.proxies;
      const validationAbortController = new AbortController();
      const maxValidationDurationMs =
        this.validationOptions.maxDurationMs ??
        Math.max(60_000, Math.floor(this.refreshIntervalMs * 0.85));
      this.validationOptions.maxDurationMs = maxValidationDurationMs;
      const validationTimeoutHandle = setTimeout(() => {
        validationAbortController.abort();
      }, maxValidationDurationMs);
      const total = validationCandidates.length;
      this.state.validated.duracaoMaxMs = maxValidationDurationMs;
      this.state.validationProgress = {
        total,
        testados: 0,
        aprovados: 0,
        reprovados: 0,
        restantes: total,
        percentualConcluido: total === 0 ? 100 : 0,
        estado: "em_andamento",
        iniciadoEm: attemptIso,
        atualizadoEm: attemptIso,
        limiteAplicado: total,
        limiteConfigurado: this.validationOptions.maxProxies ?? null,
        duracaoMaxMs: maxValidationDurationMs
      };
      this.state.validated.limiteAplicado = total;
      this.state.validated.quantidadeBruta = aggregated.proxies.length;
      this._emitValidatedUpdate();

      let validationResult;
      try {
        validationResult = await validateProxies(validationCandidates, {
          ...this.validationOptions,
          signal: validationAbortController.signal,
          onProgress: (progress) => {
            this.state.validationProgress = {
              total: progress.total,
              testados: progress.testados,
              aprovados: progress.aprovados,
              reprovados: progress.reprovados,
              restantes: progress.restantes,
              percentualConcluido: progress.percentual,
              estado: validationAbortController.signal.aborted
                ? "cancelado"
                : "em_andamento",
              iniciadoEm: attemptIso,
              atualizadoEm: new Date().toISOString(),
              limiteAplicado: total,
              limiteConfigurado: this.validationOptions.maxProxies ?? null,
              duracaoMaxMs: maxValidationDurationMs
            };
            this._emitValidatedUpdate();
          },
          onProxyApproved: (info) => {
            if (!Array.isArray(this.state.validated.proxies)) {
              this.state.validated.proxies = [];
            }
            if (!this._validatedProxySet.has(info.proxy)) {
              this._validatedProxySet.add(info.proxy);
              this.state.validated.proxies.push(info.proxy);
              this.state.validated.quantidade = info.aprovados;
              this.state.validated.quantidadeBruta = aggregated.proxies.length;
              this.state.validated.limiteAplicado = total;
              this.state.validated.ultimaTentativa = new Date().toISOString();
              this._emitValidatedUpdate();
            }
          }
        });
        clearTimeout(validationTimeoutHandle);
      } catch (error) {
        clearTimeout(validationTimeoutHandle);
        const message = extractErrorMessage(error);
        this.state.validated = {
          ...this.state.validated,
          quantidadeBruta: aggregated.proxies.length,
          erros: aggregated.erros,
          ultimaTentativa: attemptIso,
          ultimoErroValidacao: message
        };

        if (this.state.validationProgress) {
          this.state.validationProgress = {
            ...this.state.validationProgress,
            atualizadoEm: new Date().toISOString(),
            estado: "falha"
          };
        }

        this._emitValidatedUpdate();
        throw error;
      }

      const uniqueValidated = Array.from(new Set(validationResult.ativos));
      const wasAborted = Boolean(validationResult.abortado);
      this._validatedProxySet = new Set(uniqueValidated);

      this.state.validated = {
        proxies: uniqueValidated,
        quantidade: uniqueValidated.length,
        quantidadeBruta: aggregated.proxies.length,
        erros: aggregated.erros,
        validacao: {
          testados: validationResult.testados,
          aprovados: validationResult.aprovados,
          reprovados: validationResult.testados - validationResult.aprovados,
          duracaoMs: validationResult.duracaoMs,
          concluidoEm: validationResult.concluidoEm,
          urlAlvo: validationResult.urlAlvo,
          timeoutMs: validationResult.timeoutMs,
          concorrencia: validationResult.concorrencia,
          amostrasFalha: validationResult.falhas,
          estado: wasAborted ? "cancelado" : "concluido",
          abortado: wasAborted
        },
        ultimaAtualizacao: attemptIso,
        ultimaTentativa: attemptIso,
        ultimoErro: null,
        ultimoErroValidacao: wasAborted
          ? "Validação interrompida após atingir o tempo máximo configurado."
          : null,
        limiteConfigurado: this.validationOptions.maxProxies ?? null,
        limiteAplicado: total,
        concorrenciaConfigurada: this.validationOptions.concurrency,
        timeoutConfiguradoMs: this.validationOptions.timeoutMs,
        duracaoMaxMs: this.validationOptions.maxDurationMs
      };

      this.state.validationProgress = null;
      this._emitValidatedUpdate();

      return {
        raw: this.getRawSnapshot(),
        validated: this.getValidatedSnapshot()
      };
    })().finally(() => {
      this._refreshPromise = null;
    });

    return this._refreshPromise;
  }

  addValidatedListener(listener) {
    this._validatedListeners.add(listener);
    return () => {
      this._validatedListeners.delete(listener);
    };
  }

  _emitValidatedUpdate() {
    if (this._validatedListeners.size === 0) {
      return;
    }

    const snapshot = this.getValidatedSnapshot();
    for (const listener of this._validatedListeners) {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("Falha ao notificar listener de validação:", error);
      }
    }
  }

  updateValidationOptions(partial = {}) {
    const applied = {};

    if (Object.prototype.hasOwnProperty.call(partial, "maxProxies")) {
      const rawValue = partial.maxProxies;
      if (rawValue === null) {
        applied.maxProxies = null;
      } else if (rawValue === undefined) {
        // noop
      } else {
        const numeric = Number(rawValue);
        if (!Number.isFinite(numeric) || numeric < 0) {
          throw new Error("Valor inválido para limite de proxies.");
        }
        if (numeric === 0) {
          applied.maxProxies = null;
        } else {
          const rounded = Math.floor(numeric);
          if (rounded <= 0) {
            throw new Error("Limite de proxies deve ser maior ou igual a 1 ou zero para ilimitado.");
          }
          applied.maxProxies = rounded;
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(partial, "concurrency")) {
      const numeric = Number(partial.concurrency);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        throw new Error("Concorrência deve ser um número inteiro positivo.");
      }
      applied.concurrency = Math.max(1, Math.round(numeric));
    }

    if (Object.prototype.hasOwnProperty.call(partial, "timeoutMs")) {
      const numeric = Number(partial.timeoutMs);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        throw new Error("Timeout deve ser um número maior que zero.");
      }
      applied.timeoutMs = Math.max(1, Math.round(numeric));
    }

    if (Object.keys(applied).length === 0) {
      return {
        maxProxies: this.validationOptions.maxProxies ?? null,
        concurrency: this.validationOptions.concurrency,
        timeoutMs: this.validationOptions.timeoutMs
      };
    }

    this.validationOptions = {
      ...this.validationOptions,
      ...applied
    };

    this.state.validated = {
      ...this.state.validated,
      limiteConfigurado: this.validationOptions.maxProxies ?? null,
      concorrenciaConfigurada: this.validationOptions.concurrency,
      timeoutConfiguradoMs: this.validationOptions.timeoutMs,
      duracaoMaxMs: this.validationOptions.maxDurationMs
    };

    if (this.state.validationProgress) {
      this.state.validationProgress = {
        ...this.state.validationProgress,
        limiteConfigurado: this.validationOptions.maxProxies ?? null,
        duracaoMaxMs: this.validationOptions.maxDurationMs
      };
    }

    this._emitValidatedUpdate();

    return {
      maxProxies: this.validationOptions.maxProxies ?? null,
      concurrency: this.validationOptions.concurrency,
      timeoutMs: this.validationOptions.timeoutMs,
      maxDurationMs: this.validationOptions.maxDurationMs
    };
  }

  getRawSnapshot() {
    return {
      quantidade: this.state.raw.quantidade,
      proxies: this.state.raw.proxies,
      erros: this.state.raw.erros,
      ultimaAtualizacao: this.state.raw.ultimaAtualizacao,
      ultimaTentativa: this.state.raw.ultimaTentativa,
      ultimoErro: this.state.raw.ultimoErro,
      proximaAtualizacaoEmSegundos: this._calculateNextRefreshSeconds(
        this.state.raw.ultimaAtualizacao
      ),
      atualizando: this.isRefreshing()
    };
  }

  getValidatedSnapshot() {
    return {
      quantidade: this.state.validated.quantidade,
      quantidadeBruta: this.state.validated.quantidadeBruta,
      proxies: this.state.validated.proxies,
      erros: this.state.validated.erros,
      validacao: this.state.validated.validacao,
      ultimaAtualizacao: this.state.validated.ultimaAtualizacao,
      ultimaTentativa: this.state.validated.ultimaTentativa,
      ultimoErro: this.state.validated.ultimoErro,
      ultimoErroValidacao: this.state.validated.ultimoErroValidacao,
      limiteConfigurado: this.state.validated.limiteConfigurado,
      limiteAplicado: this.state.validated.limiteAplicado,
      concorrenciaConfigurada: this.state.validated.concorrenciaConfigurada,
      timeoutConfiguradoMs: this.state.validated.timeoutConfiguradoMs,
      duracaoMaxMs: this.state.validated.duracaoMaxMs,
      validacaoParcial: this.state.validationProgress,
      proximaAtualizacaoEmSegundos: this._calculateNextRefreshSeconds(
        this.state.raw.ultimaAtualizacao ?? this.state.validated.ultimaAtualizacao
      ),
      atualizando: this.isRefreshing()
    };
  }

  getSnapshot() {
    return this.getValidatedSnapshot();
  }

  _calculateNextRefreshSeconds(referenceIso) {
    if (!referenceIso) {
      return null;
    }

    const referenceMs = Date.parse(referenceIso);
    if (Number.isNaN(referenceMs)) {
      return null;
    }

    const diff = this.refreshIntervalMs - (Date.now() - referenceMs);
    return Math.max(Math.round(diff / 1000), 0);
  }
}

function extractErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
