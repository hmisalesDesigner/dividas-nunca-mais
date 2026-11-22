# NFScanner — Guia de Continuidade para Claude

> **Projeto:** Dívidas Nunca Mais!
> **Repositório:** `hmisalesDesigner/dividas-nunca-mais` · branch `main`
> **Publicação:** GitHub Pages → `https://hmisalesdesigner.github.io/dividas-nunca-mais/`
> **Versão atual:** NFScanner v29.11 · Site (Cashback e Pontos) v1.5 · Extensão v1.2.0
> **Idioma:** PT-BR · Tema escuro obrigatório

---

## 1. Visão geral

App de finanças pessoais focado em supermercado. HTML/CSS/JS puro, single-file (`nfscanner.html`, ~3 980 linhas). Sem framework, sem bundler. O app pai (`index.html`) carrega o NFScanner em iframe via `js/app.js`.

Dados persistidos em **Google Drive** (arquivo `nfscanner-data.json`) e **localStorage** como fallback. Não usa backend próprio.

---

## 2. Estrutura de arquivos

```
dividas-nunca-mais/
├── index.html              # App pai "Dívidas Nunca Mais"
├── nfscanner.html          # App principal (~568 KB, single-file, Chart.js embutido)
├── js/app.js               # Carrega nfscanner.html em iframe (atualizar ?v= ao bumpar)
├── css/main.css            # Estilos do app pai
└── extensao-nfscanner/     # Extensão Chrome (bridge.js, sync.js, manifest.json)
```

**Ao publicar uma nova versão:**
1. Bumpar versão no `<title>` de `nfscanner.html` (ex.: `NFScanner v29.6`)
2. Atualizar `?v=29.6` nos `iframe src=` em `js/app.js` (são 2 ocorrências, linhas ~162 e ~174)
3. Commit + push em `main`

---

## 3. Banco de dados (emulado)

```js
// Linha 436
var DB = {
  notas_fiscais:[], itens:[], estabelecimentos:[], estoque:[],
  devolucoes:[], marcas:[], lista_compras:[], produtos:[],
  alertas_preco:[], catalogo_itens:[], configuracoes:[],
  metas:{}, _migr:{}, _seq:{}
};
```

Pseudo-ORM `sb.from(tabela).select/insert/update/upsert/eq` imita Supabase.

**Persistência:**
- `scheduleDriveSave()` → `saveLocal()` (localStorage) + `saveToDrive()` (Google Drive API multipart/PATCH)
- `loadFromDrive()` carrega via `Object.keys(parsed).forEach(...)` (NÃO `Object.keys(DB)` — isso descartava tabelas novas; já corrigido em v28.6)
- `onDbReady()` (linha 614) roda migrações idempotentes (`migrarCategoriasV1`, `migrarQualidade`, flags em `DB._migr`)

**Backup:**
- `exportarBackupArquivo()` (linha 3780): tabelas `['notas_fiscais','itens','estabelecimentos','estoque','devolucoes','marcas','lista_compras','produtos','catalogo_itens','alertas_preco']` + `_cat_pos`
- Backups de teste disponíveis em `/mnt/user-data/attachments/` (o principal: `23ddf43f-NFScanner_backup_2026-11-14.json`)

---

## 4. Navegação e abas

Botões `.nb` na sidebar (linhas 376–400). Função `go(tab)` (linha 2344) despacha:

```js
var fn = {
  dashboard:pgDash, importar:pgImp, analise:pgAnal, resumo:pgRes,
  comparativos:pgComp, supermercados:pgSup, estoque:pgEst, lista:pgLista,
  devolucoes:pgDev, cadastros:pgCad, marcas:pgMarcas, backup:pgBack,
  np:pgNP, buscar:pgBuscar, auditoria:pgAuditoria, periodos:pgPeriodos,
  onde:pgOnde, livro:pgLivro, catalogo:pgCatalogo, itens:pgItens,
  insights:pgInsights
}[tab];
```

`TABS[tab]` (linha 2350) dá o título exibido. Para **adicionar uma aba nova**:
1. Novo `<button class="nb" onclick="go('nomeAba')">` na sidebar (após linha ~384)
2. Entrada no mapa `fn` dentro de `go()` (linha 2355)
3. Função `pgNomeAba()` async
4. Mapa `TABS` (mesma área) com o título legível

---

## 5. Funções-chave (localização)

| Função | Linha | O que faz |
|--------|-------|-----------|
| `nfsItemKey(desc)` | 1352 | Tokens normalizados e ordenados → chave única do item |
| `nfsAgrupaItens(itens, notasPorId)` | 1356 | Agrupa itens → retorna array com `{key, nome, categoria, marca, vezes, linhas, qtd, total, min, max, medio, ultimo, ultimaData, lojaBarata, pontos, unidade, variantes}` |
| `pontos` (campo) | 1361/1368 | Array `[{d:Date, loja, cnpj, q, vu, vt, un}]` **ordenado por data** — série temporal para gráficos |
| `livroAgrupa(itens,notasPorId)` | 1572 | Agrupamento difuso adicional (stopwords, prefixos, superset) |
| `catNomeItem(key,auto)` | 1683 | Nome real do item (do catálogo ou sugestão) |
| `catCodItem(key)` | 1687 | Código do item (ex.: `#001`) |
| `CAT_SUGESTOES` | 1773 | Dicionário estático de 891 nomes interpretados manualmente |
| `catSugFinal(x)` | logo após CAT_SUGESTOES | Retorna sugestão final para um item |
| `secaoLivro(cat)` | 1623 | Cor por seção (retorna objeto `{nome, cats, bg, fg}`) |
| `SECOES_LIVRO` | 1609 | 12 seções com cores e categorias |
| `livroBotoes()` | 1628 | Gera botões de filtro por seção (reaproveitável) |
| `criarGraficoComFonte(canvasEl, cfg)` | 806 | Wrapper Chart.js (instâncias em `CHARTS`; `killCharts()` ao trocar aba) |
| `nfsKpi(ic,lb,val,sub,cor,pq,click,tip,icone)` | 1132 | Card KPI reutilizável |
| `trendHtml(pct, goodWhenUp, tip)` | 2402 | Badge de variação % (seta verde/vermelha) |
| `abrirItem(key,true)` | 1911 | Abre detalhe completo do item (modal) |
| `itensMelhores(notas,grupos)` | ~1440 | Painel automático: melhores dias/supermercados |
| `bscNorm(s)` | 1879 | Normaliza string para busca tolerante |
| `normProdName(s)` | 2660 | Normaliza nome de produto |
| `brl(n)` | 793 | Formata R$ |
| `setPage(h)` / `setActs(h)` | 797-798 | Seta conteúdo / botões de ação |
| `openMo(title,body,foot)` / `closeMo()` | 939/943 | Abre/fecha modal |
| `drAbre(titulo,body,foot)` | 2276 | Abre drill-down |
| `spin()` | 796 | Mostra spinner |
| `nfsFiltraPeriodo(notas,p)` | 1382 | Filtra notas por período |
| `nfsSerie(notas,g)` | 1175 | Agrupa notas em série temporal |
| `nfsDt(s)` | 1134 | Parse de data string → Date |

---

## 6. Variáveis globais importantes

| Variável | Linha | Uso |
|----------|-------|-----|
| `DB` | 436 | Banco de dados emulado |
| `COR` | 779 | Mapa `{categoria: '#hexcor'}` |
| `CORES` | 437 | Paleta fixa `['#1A73E8','#34A853','#FBBC04','#EA4335','#9C27B0','#FF6F00']` |
| `CHARTS` | 788 | Instâncias Chart.js ativas |
| `ICONS` | 2364 | SVGs inline (wallet, percent, receipt, cal, trophy, swap, store, box, layers, clock, up, down) |
| `_drg` | 2234 | Array de filtros drill-down |
| `_dr` | 2234 | Estado do drill: `{f, tab, ord, hist, view, per, q}` |
| `_per` | (dentro de periodos) | `{g:'dia'}` — granularidade selecionada |
| `_livro` | (dentro de livro) | Estado do livro: `{sec, dados, q}` |
| `SECOES_LIVRO` | 1609 | 12 seções do livro com cores |
| `CAT_SUGESTOES` | 1773 | 891 sugestões de nome real |

---

## 7. Sistema de eventos/notificações

- `eventosGasto(notas)`, `evVistos()`, `evMarcar(id)`, `evPendentes()` — geração e controle
- `atualizarBadges()` — badges amarelos nos botões `.nb`
- `evSom(tipo)` — WebAudio (confete/alerta)
- `evFila()` → `evFechar()` — exibe uma notificação por vez, espera **25 segundos** entre elas, e só continua se ainda estiver na aba Períodos
- Pop-ups: `.ev-pop` (parabéns com confete) e `.ev-box` (alerta com giroflex)

---

## 8. Gráficos (Chart.js)

Chart.js está embutido (minificado no topo do arquivo, linhas 1-430). Configurações globais:

```js
Chart.defaults.devicePixelRatio = Math.max(window.devicePixelRatio||1, 2.5);
Chart.defaults.font.weight = '500';
```

Wrapper: `criarGraficoComFonte(canvasEl, cfg)` — registra em `CHARTS`. `killCharts()` destrói todas ao trocar de aba.

---

## 9. CSS — Classes principais

| Classe | Uso |
|--------|-----|
| `.kpi` / `.kpi-top` / `.kpi-ic` / `.v2` / `.s` | Cards KPI |
| `.pm-wrap` / `.pm-filtros` / `.pm-tab` / `.pm-b` | Painel produtos mais comprados |
| `.filtros-linha` / `.fl-l` | Linha de filtros |
| `.dr-ban` / `.dr-filtros` | Banner e filtros drill-down |
| `.mcal*` | Mini calendário |
| `.mt-grid` / `.mt-c` / `.mt-edit` | Grid de metas |
| `.nb-badge` | Badge de notificação na sidebar |
| `.ev-pop` / `.ev-box` / `.confete` / `.giro` | Pop-ups e animações |
| `.lv-sec` / `.lv-b` / `.lv-bar` | Livro de Preços (seções, botões, barras) |
| `.livro-card .pv` | Preço visual no livro |
| `.ins-g3` / `.ins-rec` | Insights (grid 3 colunas, recomendação) |
| `.pill-cat` | Pílula colorida de categoria |
| `.trend` / `.trend-up` / `.trend-down` | Badge de variação |
| `.stabs` / `.stab` | Sub-abas dentro de modais |
| Scrollbars temáticas | Globais, cores escuras |

---

## 10. Padrões de código a seguir

1. **Sem framework** — vanilla JS, ES5 compatível (`function`, `var`, `.forEach`, sem arrow functions exceto onde já existe)
2. **Funções async** — apenas nas `pg*()` e operações de banco (`await sb.from(...)`)
3. **IDs `g('id')`** em vez de `document.getElementById`
4. **`esc(str)`** para escapar HTML
5. **`brl(n)`** para formatar valores monetários
6. **Tema escuro** — fundos `#121212`, `#1e1e1e`, `#232323`; textos `#e0e0e0`, `#b0b0b0`; destaques `#8AB4F8`, `#81C784`; **NUNCA fundo claro**
7. **Sem dependências externas** — tudo inline
8. **Nomes de função prefixados** pela aba (ex.: `catNomeItem` = Catálogo, `livroAgrupa` = Livro, `perMeta` = Períodos, `insListaVariacao` = Insights, `anaEconomiaLista` = Análise)

---

## 11. Testes com Playwright

Harness em `/tmp/pw/harness.js` que:
1. Aponta para `file:///home/claude/dividas-nunca-mais/nfscanner.html`
2. Carrega o backup `23ddf43f-NFScanner_backup_2026-11-14.json`
3. Injeta os dados simulando `loadFromDrive()`
4. Navega para a aba desejada (argumento CLI)
5. Detecta `PAGEERR`, fundos claros e baixo contraste
6. Salva screenshot em `/tmp/pw/dark_<tab>.png`

**Uso:** `node /tmp/pw/harness.js <nomeAba>`

Scripts de teste adicionais: `t285.js` (sugestões), `t287.js` (salvar/dup), `tev.js` (eventos), `tdr.js` (drill/modais).

---

## 12. Fluxo de deploy

```bash
# 1. Editar nfscanner.html
# 2. Testar com Playwright
node /tmp/pw/harness.js <aba>

# 3. Bumpar versão no <title> de nfscanner.html e no ?v= em js/app.js
# 4. Copiar para espelho
cp nfscanner.html /mnt/user-data/outputs/dividas-nunca-mais/
cp js/app.js /mnt/user-data/outputs/dividas-nunca-mais/js/

# 5. Commit e push
git add nfscanner.html js/app.js
git commit -m "NFScanner vXX.X: descrição curta"
git push origin main
```

---

## 13. Preferências do usuário

- Respostas breves e diretas, em PT-BR
- Autorizado a agir sem pedir permissão
- **NUNCA aceitar nem armazenar login/senha**
- **NÃO guardar CPF, nome completo ou endereço na memória**
- Cor verde = preço caiu (bom para o consumidor, lógica invertida da bolsa)
- Cor vermelha = preço subiu (ruim para o consumidor)

---

## 14. Histórico de versões (últimas 20)

| Versão | Commit | Resumo |
|--------|--------|--------|
| Site v1.5 + Ext 1.2.0 | `b1e9845` | Sorteios do Nota Paraná lidos pela extensão na aba MEUS BILHETES + botão "📥 Importar do portal"; corrige ordenação dos sorteios |
| Site v1.4 | `6c9450d` | Nota Paraná: 🎰 Sorteios (bilhetes, prazo do prêmio) |
| Site v1.3 | `ae179e3` | Nota Paraná vira cashback (migração automática `migrarProgramas`) |
| Site v1.2 | `5dcec24` | Botão 🔄 Atualizar (Dashboard), resgate de cashback, ⏳ Vencimentos |
| Site v1.0–1.1 | `c7be890`…`0d769af` | Versão do site visível, Pontos/Cashback nos pop-ups, conferência de pontos vencidos |
| v29.11 | `1b923fc` | Catálogo: "O nome da nota está bom" |
| v29.10 | `220d970` | Catálogo mostra itens que faltam + nomes órfãos |
| v29.9 | `1387c55` | Catálogo guia até itens sem nome |
| v29.8 | `0d65cd7` | Corrige rolagem lateral em Cotações |
| v29.7 | `7e03c7a` | Cotações: cards compactos + mapa de calor |
| v29.6 | `d232d0b` | Nova aba Cotações |
| v29.5 | `dccde96` | Gráficos com texto nítido (alta resolução `devicePixelRatio ≥ 2.5`) |
| v29.4 | `1d91771` | Botões de categoria do Livro ao lado da busca |
| v29.3 | `42f3c7e` | Barras de rolagem temáticas; Produtos mais comprados mais largo |
| v29.2 | `fceb1a5` | Top Marcas em gráfico (barras horizontais, 8 marcas) |
| v29.1 | `805228a` | Intervalo maior entre avisos (25s); Maior dia em 2 linhas |
| v29.0 | `ff2bbe8` | Grande ajuste de todas as abas (dashboard, períodos, metas, alertas, onde gasto, livro, insights, análise, resumo, comparativos, melhores dias) |
| v28.7 | `9d1531a` | Catálogo: trava contra duplicação, busca por nome real |
| v28.6 | `827a1b3` | Corrige perda do Catálogo ao recarregar do Drive |
| v28.5 | `7348744` | 891 sugestões reais de nome no dicionário estático |
| v28.4 | `de73065` | Sugestão só aparece quando difere do nome da nota |
| v28.3 | `edd5a70` | Catálogo com mais contraste e informações |
| v28.2 | `9cdfd58` | Catálogo em cartas com retomada de posição |
| v28.1 | `b355d8a` | Catálogo guarda grafias originais |
| v28.0 | `b256fba` | Nova aba Catálogo |
| v27.10 | `2726496` | Faixa lateral colorida corrigida |
| v27.9 | `9b8801a` | Acabamento arredondado no Livro |
| v27.8 | `e99cbb2` | Faixa lateral colorida por seção |
| v27.7 | `97fece0` | Livro ordena por letra+média |
| v27.6 | `cc86965` | Livro sem negrito, valores alinhados |
| v27.5 | `b27ecac` | Livro menos poluído + fusão de itens |

---

## 15. Aba Cotações (CONCLUÍDA em v29.6–v29.8; plano original abaixo, só para referência)

**Pedido literal do usuário:**
> "é muito importante o NFScanner mostrar uma aba com os gráficos dos preços dos itens, como acontece na B3 bolsa de valores. Isso me ajudará a ver como está o desempenho do preço dos itens, desde a sua primeira compra até hoje. Devem ser cards pequenos horizontais para caber todos os itens já cadastrados pelas notas fiscais lidas."

### Plano de implementação:

1. **Registrar aba** `go('cotacoes')`, rótulo `📈 Cotações`:
   - Novo `<button class="nb">` na sidebar (após itens/insights, ~linha 381)
   - Entrada `cotacoes:pgCotacoes` no mapa `fn` em `go()` (linha 2355)

2. **Função `pgCotacoes()`** usando `nfsAgrupaItens()`:
   - Para cada item com **2+ pontos de preço**, desenhar um **sparkline** (SVG inline, mais leve que Chart.js por card)
   - `pontos[].vu` ao longo do tempo é a série temporal pronta

3. **Card horizontal compacto:**
   - Código + nome real à esquerda (`catCodItem(key)` + `catNomeItem(key,true)`)
   - Sparkline no meio (SVG `<polyline>`)
   - Preço atual + variação % desde primeira compra à direita
   - **Verde = preço caiu** (bom), **Vermelho = preço subiu** (ruim) — lógica invertida da bolsa

4. **Filtros e ordenação:**
   - Botões de seção (reaproveitar `livroBotoes()` / `secaoLivro()`)
   - Campo de busca
   - Ordenação: maior alta, maior queda, mais comprados, A–Z

5. **Clique no card** → `abrirItem(key,true)` para ver detalhe completo

6. **Itens com 1 compra apenas**: não têm variação — confirmar com o usuário se exibe como card sem sparkline ou se oculta

### Dados disponíveis:

```js
// nfsAgrupaItens() retorna por item:
{
  key: 'chave interna',
  pontos: [ // JÁ ORDENADO POR DATA
    { d: Date, loja: 'Supermercado X', cnpj: '...', q: 1, vu: 5.99, vt: 5.99, un: 'UN' },
    { d: Date, loja: 'Supermercado Y', cnpj: '...', q: 2, vu: 4.99, vt: 9.98, un: 'UN' },
    ...
  ],
  nome: 'Nome mais frequente',
  categoria: 'Categoria mais frequente',
  marca: '...',
  min: 4.99,
  max: 5.99,
  medio: 5.49,
  ultimo: 4.99,
  ultimaData: Date,
  unidade: 'UN'
}
```

---

## 16. Outras pendências menores

| Item | Status |
|------|--------|
| Itens em categoria errada (ex.: "Abob Cabotcha" em "Café, Chá e Achocolatados") | Mencionado, não autorizado |
| Alerta de expiração de créditos do Nota Paraná | Ideia pendente |
| Números individuais dos bilhetes (`#lista-bilhetes`, vem por AJAX) | Não usado pelo modelo do app; só se for pedido |
| Dividir `nfscanner.html` em arquivos menores | Sugerido, pendente |

---

## 17. Limitações conhecidas

- `nome_real` está preso à chave interna (`nfsItemKey`); se a regra de agrupamento mudar, nomes já escritos podem ficar órfãos
- Tributos federal/estadual/municipal não vêm discriminados nas notas (só total, Lei 12.741/2012)
- 5 notas não trazem tributo informado pela SEFAZ (diferença de R$ 164,30)
- "Outros" em Pagamentos vem assim do portal (27 notas) — não dá para afirmar que é Pix
- Chart.js embutido (~430 linhas minificadas) faz o arquivo ser grande; saídas de Bash que incluem o topo do arquivo podem ser enormes — redirecionar output

---

## 18. Dicas operacionais

- **Saída grande do Bash**: grep/read no `nfscanner.html` pode gerar outputs de 190 KB+ (Chart.js minificado no topo). Use `--line-number` e faixas de linha.
- **Backups para teste**: carregar `23ddf43f-NFScanner_backup_2026-11-14.json` no harness Playwright.
- **Duas ocorrências de `?v=`** em `js/app.js` — ambas precisam ser atualizadas.
- **`killCharts()`** é chamada automaticamente em `go()` — mas ao criar gráficos fora de Chart.js (ex.: SVG sparklines), não precisa registrar em `CHARTS`.
- **Nunca usar fundo claro** — todo CSS novo deve respeitar o tema escuro (#121212 base).

---

## 19. Site pai — Cashback e Pontos (`js/beneficios.js`, v1.4)

App multi-arquivo (`js/data.js`, `utils.js`, `beneficios.js`, `app.js`, `auth.js`; `css/main.css`). `DB` inteiro vai para o Drive (`dividas-nunca-mais-data.json`) e localStorage (`dnm_db`); `agendarSync()` com debounce de 1,5 s. Versão do site: const `SITE_VERSION` em `js/utils.js` (bumpar a cada publicação; aparece no logo e no cabeçalho do Cashback).

**Programas** (`DB.programas`): `tipo` `'pontos'` (`saldo` em pts, opcional `saldoCashback` em R$, `lotes[{quantidade,expiracao}]`) ou `'cashback'` (`saldo` em R$). Históricos: `DB.historicoSaldo[id]`, `DB.historicoCashback[id]`. `DB.resgates` (campo `tipoSaldo`), `DB.vencimentos` ({id, programaId, quantidade, tipoSaldo, descricao, data}).

**Regras já implementadas:**
- Pop-ups de saldo têm escolha Pontos × Cashback (R$) (`popupModo`).
- Ao atualizar saldo, `confirmarVencidos` confere lotes vencidos (subtração) e registra em Vencimentos; queda restante pergunta resgate × vencimento.
- Resgatar tem escolha Pontos/Cashback; ⏳ Vencimentos lista e soma o que já expirou.
- Botão 🔄 Atualizar só no Dashboard (`atualizarSite()`: envia pendências → `carregarDoDrive()` → `migrarProgramas()` → re-render).
- **Nota Paraná é cashback do governo (R$), sem pontos**; `migrarProgramas()` corrige programas antigos (idempotente). Tem 🎰 Sorteios (`sorteios[]` no programa): 1 bilhete na primeira compra do período + 1 a cada R$ 200 em notas (até R$ 10.000/nota); bilhete só vale no sorteio do período; prêmio cancelado após 1 ano (`somaUmAno`). Prêmio **não** soma no saldo.

**Testes:** Playwright em `/tmp/pw/` (`ben_test.js`, `ben_all.js`, `ben_mig.js`, `ben_sor.js`); carregar backup `dividas-nunca-mais-backup-2026-11-22-corrigido.json`, stub do OAuth Google. Proxy do sandbox bloqueia CDN/Google (inofensivo).

**Commits:** trailers `Co-Authored-By: Claude <modelo que fez o trabalho> <noreply@anthropic.com>` e `Claude-Session: …` (o modelo varia por sessão — não fixar em um nome).

**Sorteios (v1.5):** resolvidos pela extensão — ver §20. `ordenarSorteios(p)` ordena do mais recente para o mais antigo (o comparador da v1.4 fazia o contrário e nunca devolvia 0 em empate).

**Pendências:** (1) alerta de expiração de créditos do Nota Paraná (ideia); (3) itens em categoria errada no NFScanner (não autorizado); (4) dividir `nfscanner.html` em arquivos menores (sugerido).

**Privacidade:** nunca guardar login/senha, CPF, nome completo ou endereço em memória/docs.

---

## 20. Extensão do Chrome — Sorteios (v1.2.0)

`extensao-nfscanner/` já rodava em `https://notaparana.pr.gov.br/nfprweb/*` com
`credentials: 'include'`, usando a sessão que o **usuário** abriu. O Claude nunca digita senha.

**`sync.js`** — `init()` despacha por rota: `/nfprweb/Bilhete` → `initSorteios()`; `/nfprweb/Extrato` → fluxo antigo de notas.

| Função | O que faz |
|--------|-----------|
| `colunasSorteio(tabela)` | Mapeia as colunas pelo **texto do `<th>`** (não por índice fixo). `premiados` é testado antes de `bilhetes`, senão "Qtde de Bilhetes Premiados" cai no lugar errado |
| `lerSorteios()` | Lê `#sorteios tbody tr`. Confere o Nº da célula contra o atributo `rel` da `<tr>` e autocorrige offset de −1/+1 (há linhas em que o `<td class="sorteio">` do ícone pode não vir, deslocando tudo) |
| `coletarSorteios()` | Lê a página atual, clica os links numéricos de `#pag-sorteio` e junta por Nº — imune a o plugin do portal **esconder** ou **remover** as linhas fora da página |
| `periodoISO('AGO/2026')` | → `{inicio:'2026-08-01', fim:'2026-08-31'}` |

Grava em `chrome.storage.local` → `nfs.sorteios[]` e `nfs.lastSyncSorteios`.

**Colunas do portal:** Nº · Tipo · Período das Notas · Limite para adesão · Data Loteria Federal · Data do sorteio · Soma das Notas · Qtde de Bilhetes · Qtde de Bilhetes Premiados · Situação · Ver Notas. A coluna "Resultado" está comentada no HTML (em `thead` **e** `tbody`, então não desalinha).

A tabela `#sorteios` vem **renderizada pelo servidor**. Só `#lista-bilhetes` (números dos bilhetes) vem por AJAX (`SorteioNFPR`, `urlAjax:'Bilhete'`, `paramPesquisa`) — e o modelo do app não usa isso.

**`bridge.js`** — novo recado `NFS_GET_SORTEIOS` → `{type:'NFS_SORTEIOS', sorteios, lastSync}`. `NFS_PING` agora também devolve `sorteios` (contagem) e `lastSyncSorteios`. Escreve `nfs_last_sync_sorteios` no `localStorage` do site.

**`js/beneficios.js`** — `nfsExtPergunta(type, extra, timeout)` (postMessage com `reqId` e timeout de 4 s), `nfsExtInstalada()`, `importarSorteiosDoPortal(id)`. O upsert casa por `nr`, com fallback em `inicio`+`fim` (pega sorteios lançados à mão antes), e **nunca** sobrescreve `premio` nem um `nome` editado à mão (`origem !== 'portal'`). O botão "🏆 Ganhei" só aparece quando `premiados == null || premiados > 0`.

**Validação:** a fórmula `bilhetesPorValor()` (1 + ⌊valor/200⌋) foi conferida contra os 10 períodos já fechados do portal e acerta todos os 10.

**Testes:** `/tmp/tsor/` — `test.js` (parser contra o HTML real), `e2e.js` (extensão → ponte → upsert → reimportação idempotente), `pagina.js` (pior caso: paginação que remove linhas do DOM). jsdom **não** preenche `ev.source` em `postMessage` da mesma janela, então `e2e.js` afrouxa só essa checagem do `bridge.js`.
