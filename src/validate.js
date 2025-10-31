#!/usr/bin/env node

import { loadAggregatedProxies } from "./proxyService.js";
import { validateProxies } from "./proxyValidator.js";

async function main() {
  try {
    console.log("Carregando lista de proxies das fontes upstream...");
    const aggregated = await loadAggregatedProxies({ timeoutMs: 15000 });
    console.log(
      `Obtidos ${aggregated.proxies.length} proxies diferentes (com ${aggregated.erros.length} avisos das fontes).`
    );

    if (aggregated.erros.length > 0) {
      aggregated.erros.forEach((error) => {
        console.warn(
          `Aviso de ${error.origem ?? "origem desconhecida"}: ${error.mensagem}`
        );
      });
    }

    if (aggregated.proxies.length === 0) {
      console.log("Nenhum proxy disponível para validar.");
      return;
    }

    console.log(
      "Validando proxies contra https://www.youtube.com/ com alta concorrência..."
    );

    let ultimoLog = 0;
    const validation = await validateProxies(aggregated.proxies, {
      onProgress: (progresso) => {
        const agora = Date.now();
        const precisaLogar =
          agora - ultimoLog >= 1000 || progresso.testados === progresso.total;

        if (precisaLogar) {
          ultimoLog = agora;
          const linha = `Progresso: ${progresso.testados}/${progresso.total} testados | ${progresso.aprovados} aprovados | ${progresso.reprovados} reprovados | ${progresso.percentual}% concluído`;
          process.stdout.write(`\r${linha}`);
        }
      }
    });

    if (ultimoLog !== 0) {
      process.stdout.write("\n");
    }

    console.log(
      `Validação concluída em ${validation.duracaoMs}ms. ` +
        `${validation.aprovados}/${validation.testados} proxies responderam com sucesso.`
    );

    console.log("\nProxies ativos:");
    validation.ativos.forEach((proxy) => console.log(proxy));

    if (validation.falhas.length > 0) {
      console.log(
        `\nAmostras de falhas (até ${validation.falhas.length} registradas):`
      );
      validation.falhas.forEach((failure) => {
        console.log(
          `  - ${failure.proxy} :: ${failure.motivo}${
            failure.status ? ` (status ${failure.status})` : ""
          }`
        );
      });
    }
  } catch (error) {
    console.error(
      "Falha ao executar o script de validação de proxies:",
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  }
}

main();
