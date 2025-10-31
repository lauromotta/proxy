# API de Agregação de Proxies

Serviço Node.js que consolida listas públicas de proxies HTTP do
ProxyScrape, https://free-proxy-list.net/en/, do repositório
TheSpeedX/SOCKS-List (lista `http.txt`) e da fresh-proxy-list
(`proxylist.txt`) em uma única resposta JSON.

Todas as listas são deduplicadas antes de serem retornadas ou validadas,
garantindo apenas pares `ip:porta` únicos.

A aplicação atualiza a lista agregada a cada 5 minutos em segundo plano,
valida cada proxy contra https://www.youtube.com/ usando alta
concorrência e expõe apenas os que estiverem respondendo corretamente.

## Demo hospedada

O projeto está disponível em ambiente público:

- Painel em tempo real: https://proxy-webb.onrender.com/proxies-validos  
- JSON dos proxies agregados: https://proxy-webb.onrender.com/proxies  
- JSON dos proxies validados: https://proxy-webb.onrender.com/proxies-validos?format=json  
- Stream SSE: https://proxy-webb.onrender.com/proxies-validos/stream  
- Endpoint de configuração: https://proxy-webb.onrender.com/settings

> Observação: a instância gratuita do Render hiberna após alguns minutos
> sem acessos. Se a página demorar para responder, aguarde alguns
> segundos; o serviço acorda automaticamente e retoma as atualizações.

## Primeiros passos

```powershell
npm start
```

Por padrão o servidor escuta na porta `3000`. Defina a variável de
ambiente `PORT` para alterar a porta.

## API

- `GET /` — informações básicas do serviço e dica de uso.
- `GET /proxies` — lista agregada (sem validação), com:
  - `quantidade`: quantidade de proxies agregados disponíveis.
  - `proxies`: array de strings `ip:porta` (ex.: `"59.203.61.169:3128"`).
  - `erros`: avisos sobre falhas nas fontes upstream.
  - `ultimaAtualizacao`: timestamp ISO da última agregação concluída.
  - `ultimaTentativa`: timestamp da última tentativa (mesmo que falha).
  - `ultimoErro`: mensagem do último erro de agregação.
  - `proximaAtualizacaoEmSegundos`: contagem regressiva até a próxima atualização automática.
  - `atualizando`: indica se um ciclo de atualização está em execução.
  - `erroAtualizacaoManual`: presente quando `refresh=1` falha, mas dados anteriores são reaproveitados.
- `GET /proxies-validos` — lista validada (após testes), com:
  - `quantidade`: número de proxies aprovados nos testes.
  - `quantidadeBruta`: total de proxies agregados antes da validação.
  - `proxies`: proxies aprovados (`ip:porta`), atualizados em tempo real conforme cada teste é concluído.
  - `limiteAplicado`: quantidade máxima de proxies analisados na rodada atual (após aplicar o limite configurado).
  - `limiteConfigurado`: valor do limite definido para validação (`null` indica que não há limite).
  - `concorrenciaConfigurada`: número de testes executados em paralelo.
  - `timeoutConfiguradoMs`: timeout por proxy, em milissegundos.
  - `erros`: avisos das fontes upstream utilizados na última validação.
  - `validacao`: estatísticas da última validação concluída.
  - `validacaoParcial`: progresso em tempo real da validação atual (quando em execução), incluindo o `estado` da tarefa.
  - `ultimaAtualizacao`: timestamp da última validação concluída.
  - `ultimaTentativa`: timestamp da última tentativa de validação.
  - `ultimoErro`: erro de agregação mais recente que impactou a validação.
  - `ultimoErroValidacao`: mensagem do último erro durante a fase de testes.
  - `proximaAtualizacaoEmSegundos`: contagem regressiva até a próxima atualização.
  - `atualizando`: indica se há atualização em andamento.
  - `erroAtualizacaoManual`: presente quando `refresh=1` falha, mas dados anteriores são reaproveitados.
- `GET /proxies-validos/stream` — stream SSE (`text/event-stream`) com snapshots JSON do estado validado. Ideal para dashboards ou scripts em tempo real.

Adicione `refresh=1` à query string (em qualquer um dos endpoints) para
forçar uma nova atualização antes de receber a resposta.

Quando acessado via navegador (Accept `text/html`), `/proxies-validos`
exibe um painel em HTML que consome o stream SSE automaticamente e
atualiza a lista de proxies aprovados em tempo real. Para obter a
resposta JSON nesse endpoint (ou no `/proxies`), use o parâmetro
`?format=json` ou envie o cabeçalho `Accept: application/json`.

O painel também permite ajustar o limite de validação, a concorrência e
o timeout diretamente pela interface; as alterações são aplicadas ao
próximo ciclo (ou imediatamente ao usar “Forçar atualização agora”).

## CLI de validação

Execute manualmente o fluxo de validação e imprima os proxies ativos no
terminal:

```powershell
npm run validate
```

O script busca as listas upstream, valida contra o YouTube em alta
concorrência e exibe os proxies aprovados juntamente com uma amostra das
falhas.

## Configuração

Variáveis de ambiente opcionais:

- `PORT`: porta HTTP do servidor (padrão `3000`).
- `VALIDATOR_CONCURRENCY`: quantidade máxima de verificações simultâneas
  (padrão `100`).
- `VALIDATOR_TIMEOUT_MS`: timeout por proxy em milissegundos
  (padrão `7000`).
- `VALIDATOR_MAX_PROXIES`: limite máximo de proxies que entram na fila
  de validação (padrão `5000`; defina como `0` para desativar o limite).
- `VALIDATOR_TARGET_URL`: URL alvo da validação
  (padrão `https://www.youtube.com/`).
