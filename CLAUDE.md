# NFScanner — Guia de Continuidade para Claude

> **Projeto:** Dívidas Nunca Mais!
> **Repositório:** `hmisalesDesigner/dividas-nunca-mais` · branch `main`
> **Publicação:** GitHub Pages → `https://hmisalesdesigner.github.io/dividas-nunca-mais/`
> **Versão atual:** NFScanner v29.11 · Site (Cashback e Pontos) v1.19 · Extensão v1.2.0
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
| Site v1.19 | `9c63dcc` | Código da caixa do Dolce Gusto: máscara 4-4-4 enquanto digita/cola (`6WWQ NHA6 79KT`), exige 12 caracteres |
| Site v1.18 | `cba19ec` | Janela de confirmação antes de apagar lote ou vencimento (`pedirConfirmacao` em `js/utils.js`, Cancelar antes de Apagar); "lote manual" recolhido nos programas com código |
| Site v1.17 | `47b075f` | Rótulos do Colar histórico atualizados (o bloco já lança resgates e caixas antigas, não só ganhos e expirados); botão passa a ser "Lançar histórico" |
| Site v1.16 | `3a357ca` | Colar histórico aceita o extrato inteiro de uma vez: ganhos vivos, ganhos já gastos ("Points used"), expirados e resgates (`-N Pontos Utilizado:`); prévia em 4 linhas dizendo o que cada parte faz |
| Site v1.15 | `85a14d6` | `lerGanhosPortal` aceita **"Vence em:"** (rótulo real do portal brasileiro) além de "Expiration Date" — antes lia 0 ganhos do histórico colado |
| Site v1.14 | `2cf99a6` | Modal rápido do código sem o campo "Nº de códigos" (1 caixa por vez); `?v=` nas tags de `index.html` para o GitHub Pages não servir JS antigo do cache |
| Site v1.13 | `8b13f1d` | Dolce Gusto CLUB: botão ☕ + Registrar código no card (100 pts, vence em 12 meses), lotes com vencimento, importação do histórico do portal (ganhos e expirados) |
| Site v1.12 | `2e41325` | Rascunho automático das faturas (a cada digitação); modais com campos não fecham por Esc/clique fora; atalhos Ctrl+… não disparam com modal aberto ou digitando; aviso ao fechar a aba com formulário preenchido |
| Site v1.11 | `f4f3fcb` | Corrige erro de gráfico ao redesenhar Contas (helper `novoGrafico`); folha da Sanepar: serviços e faixas viram tabelas com linhas e cabeçalho alinhado |
| Site v1.10 | `9b5473b` | Tema claro/escuro passa a funcionar (antes só gravava a preferência); folha da Sanepar e demais formulários de fatura sem valores/exemplos pré-preenchidos |
| Site v1.9 | `4927f77` | Contas Recorrentes: modal da Sanepar no layout da fatura impressa (tema escuro), conferências automáticas e gráfico Gasto × Consumo |
| Site v1.8 | `127eaa0` | Importação com prévia do que vai mudar, distinção backup completo x parcial e botão Desfazer |
| Site v1.7 | `7476b17` | Nova aba **Assinaturas Recorrentes** com detecção de duplicidade por fornecedor; `esc()` no site pai; Sicoob nas subcategorias de cartão |
| Site v1.6 | `9938983` | Sorteios: importação automática ao iniciar e no 🔄 Atualizar + pop-up de lembrete quando a data do sorteio chega sem resultado; formulário manual recolhido |
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

App multi-arquivo (`js/data.js`, `utils.js`, `beneficios.js`, `app.js`, `auth.js`; `css/main.css`). `DB` inteiro vai para o Drive (`dividas-nunca-mais-data.json`) e localStorage (`dnm_db`); `agendarSync()` com debounce de 1,5 s. Versão do site: const `SITE_VERSION` em `js/utils.js` (bumpar a cada publicação; aparece no logo e no cabeçalho do Cashback). **Ao publicar, bumpar também o `?v=` das tags `<link>`/`<script>` do `index.html`** (`css/main.css?v=X.Y`, `js/*.js?v=X.Y`) — sem isso o GitHub Pages serve o JS antigo do cache e o usuário não vê a atualização (aconteceu na v1.13).

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

## 22. Importação de backup com prévia (v1.8)

O botão "Importar Backup" chamava `importarJSON()`, que fazia `Object.assign(DB, data)`
direto e dizia "Backup importado com sucesso!" fosse o que fosse. Dois problemas: nao
distinguia **backup completo** de **arquivo parcial**, e um arquivo parcial substitui a
lista inteira sem aviso. O usuario apontou o risco: achar um arquivo parcial velho na
pasta de downloads, achar que e backup e perder dados.

Fluxo agora: `importarBackup()` -> `lerJSONImportacao()` (so le e valida) ->
`analisarImportacao()` -> `mostrarPreviaImportacao()` -> o usuario confirma ->
`aplicarImportacao()`.

| Funcao (`js/data.js`) | O que faz |
|---|---|
| `lerJSONImportacao(file)` | So parseia e valida. Nao altera nada. Rejeita o que nao for objeto JSON |
| `analisarImportacao(data)` | Compara o arquivo com o DB atual: `{completo, mudancas:[{chave, rotulo, agora, depois, perde}], intactas}`. `completo` = tem `usuario`, `dividas` e `programas` (`CHAVES_BACKUP_COMPLETO`) |
| `aplicarImportacao(data)` | Grava o DB atual em `localStorage.dnm_pre_import` antes do `Object.assign` |
| `desfazerImportacao()` | Restaura esse estado. Apaga tambem as chaves que a importacao criou |

`mostrarPreviaImportacao()` (`js/configuracoes.js`) mostra uma tabela Lista / Agora /
Depois / Efeito, com a perda em vermelho, faixa verde para backup completo e laranja
para parcial, e lista o que **nao** sera tocado. O botao "↩️ Desfazer importação" so
aparece em Configuracoes quando `existeEstadoPreImportacao()`.

**Testes:** `/tmp/tass/imp2.js` — 18 casos: parcial x completo, aviso de perda, preview
que nao aplica, confirmar, desfazer, cancelar e JSON quebrado.

### Armadilha de teste em jsdom

`js/data.js` declara `DB` com **`const`**. No navegador os `<script>` dividem o mesmo
escopo lexical global, mas **cada `w.eval()` do jsdom cria um escopo novo** — entao
carregar `data.js` e `configuracoes.js` em evals separados faz cada arquivo enxergar um
`DB` diferente, e os testes falham de um jeito que parece bug de logica. Carregue todos
os arquivos **num unico `eval`**, concatenados (ver `montar()` em `imp2.js`), e exponha
uma ponte (`window.ver`, `window.rodar`) para o teste alcançar o escopo. Vale a mesma
regra de sempre: stubs de funcoes que os arquivos declaram (`abrirModal`, `agendarSync`,
`showAlert`, `hojeISO`) sao sobrescritos **depois** da carga.

---

## 21. Aba Assinaturas Recorrentes (`js/assinaturas.js`, v1.7)

Nasceu de um caso real: duas assinaturas iguais correndo em paralelo por 10 meses na fatura
do cartao sem ninguem notar. Por isso a **deteccao de duplicidade e a funcao principal** da
aba, nao um extra.

`DB.assinaturas[]` = `{id, nome, fornecedor, valor, diaCobranca, categoria, cartao,
observacao, status: 'ativa'|'cancelada', inicio, canceladaEm, historico:[{data, valor}]}`.
Inicializada em `js/data.js` junto de `DB.resgates`.

| Funcao | O que faz |
|--------|-----------|
| `normalizarFornecedor(nome)` | Reduz o nome a um token comparavel. Tira acentos, pontuacao e os prefixos de adquirente (`ebn`, `dl`, `com`, `br`...). **O Sicoob gruda um "V" no fim do nome do lojista** (`ADOBEV`, `1PASSWORDV`, `GoogleV`), entao o V final cai quando sobram 4+ caracteres |
| `duplicidadesAssinaturas()` | Agrupa as ativas por fornecedor normalizado e devolve os grupos com 2+ itens. Vira o banner vermelho no topo da aba |
| `variacaoAssinatura(a)` | Compara o valor atual com o ultimo do `historico` e devolve a variacao % (reajuste) |
| `proximaCobranca(dia)` | Proxima data a partir do dia do mes; `null` para dia invalido |
| `salvarAssinatura(id)` | Ao editar, se o valor mudou empurra o anterior para `historico` antes de sobrescrever. Avisa na hora se a nova assinatura cai num grupo duplicado |
| `cancelarAssinatura(id)` | Marca `status: 'cancelada'` e informa a economia mensal. Nao apaga — `removerAssinatura` faz isso, com confirmacao |

`esc()` **nao existia no site pai** (so dentro do `nfscanner.html`); foi criada em
`js/utils.js` para esta aba e esta disponivel para as demais.

Registro da aba: item no `<nav>` + `<div id="page-assinaturas" class="page">` em `index.html`,
entrada no mapa `titulos` e um `case` no `switch` de `navigateTo()` (`js/app.js`), e a tag
`<script src="js/assinaturas.js">` **antes** de `beneficios.js`.

**Privacidade:** o repositorio e publico. Dados financeiros reais do usuario (valores de
fatura, saldos, assinaturas dele) **nunca** entram no codigo — a aba so oferece o cadastro;
os dados vivem no Drive e no localStorage dele.

**Testes:** `/tmp/tass/t.js` — 22 casos em jsdom: normalizacao de fornecedor (incluindo o V
do Sicoob e acentos), totais mensal/anual, agrupamento de duplicidade, cancelar/reativar,
escape de HTML no nome e proxima cobranca.

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

### Importação automática e lembrete (v1.6)

| Função (`js/beneficios.js`) | O que faz |
|---|---|
| `importarSorteiosDoPortal(id, silencioso)` | `silencioso = true` não abre modal nem mostra "X novos"; só interrompe se houver prêmio a lançar. Devolve quantos sorteios mexeu |
| `autoImportarSorteios()` | Importa em silêncio e chama `verificarSorteiosPendentes()`. Chamada em `iniciarApp()` (`js/app.js`, 2,5 s depois) e no fim de `atualizarSite()` (`js/utils.js`, 1,2 s depois) |
| `sorteiosPendentes()` | `origem === 'portal' && dataSorteio <= hoje && premiados == null` — ou seja, o sorteio já ocorreu (ou é hoje) e o portal ainda não disse o resultado. Lançamentos à mão ficam de fora de propósito |
| `verificarSorteiosPendentes(tentativa)` | Pop-up pedindo para abrir o portal. `telaOcupada()` adia 3 s (até 20 vezes) se `saldo-modal`, `ben-modal-overlay`, `modal-overlay` ou `alert-popup` estiverem visíveis, para não atropelar os pop-ups de saldo |
| `adiarLembreteSorteio()` / `abrirPortalBilhetes()` | Gravam `dnm_sorteios_adiado = hoje` no localStorage — o lembrete some pelo resto do dia e volta no dia seguinte |

O formulário "+ Registrar Sorteio" virou um `<details>` recolhido ("✏️ Lançar um sorteio à mão"): o portal entrega todos aqueles campos, e preenchê-los à mão só cria entrada divergente. Ficou como saída de emergência se a extensão falhar. O **valor do prêmio** continua manual de propósito (botão "🏆 Ganhei") — o portal não mostra esse valor na tela de bilhetes.

`hojeISO()` é definida em `js/beneficios.js` (não em `utils.js`): em teste, sobrescrever **depois** de carregar o arquivo, senão a declaração de função ganha do stub.

**Validação:** a fórmula `bilhetesPorValor()` (1 + ⌊valor/200⌋) foi conferida contra os 10 períodos já fechados do portal e acerta todos os 10.

**Testes:** `/tmp/tsor/` — `test.js` (parser contra o HTML real), `e2e.js` (extensão → ponte → upsert → reimportação idempotente), `pagina.js` (pior caso: paginação que remove linhas do DOM), `lembrete.js` (9 cenários do pop-up: futuro, hoje, passado, já conferido, adiado, tela ocupada, manual, plural). jsdom **não** preenche `ev.source` em `postMessage` da mesma janela, então `e2e.js` afrouxa só essa checagem do `bridge.js`.

---

## 23. Contas Recorrentes — modal da Sanepar (`js/contas.js`, v1.9)

O modal "Nova Fatura — Sanepar" reproduz **célula por célula** a fatura impressa (modelo anterior a out/2026),
em tema escuro (`.fol*` em `css/main.css`). Os outros tipos (Copel, Inova, Sercomtel, Outra) continuam com
`formBasico()` + `formDetalhes()`; a Sanepar passou a usar `formFolhaSanepar()` (o ramo antigo foi removido).

**Ordem das células (igual à fatura):** CONTA → nome/matrícula → endereço/número/lado-frente → CEP/local →
roteiro/hidrômetro/CAT-RES-COM-IND-UTP-POP → qualidade da água (3 linhas × 5 colunas + conclusão) → histórico de
pagamentos (2 anos × 12 meses: PAGO / X / ---) → serviços lançados (lista) → faixas de consumo (lista) → histórico de
consumo (11 meses) → dias/data leitura/leitura anterior/atual/consumo/**referência** → motivo ausência/média 5 meses/**vencimento**
→ previsão próxima leitura/água/esgoto/serviços/**total** → mensagens → tributos federais → parte destacável (CTRL, código de barras).
"Campos do sistema" (desconto, NF cashback, observações, valor a pagar) ficam **fora** da folha.

| Função | O que faz |
|---|---|
| `formFolhaSanepar()` / `iniciarFolhaSanepar()` | Monta a folha; o init cria as 5 faixas padrão e 1 linha de serviço |
| `sanAddFaixa()` / `sanAddServico()` | Linhas dinâmicas (a tarifa pode ter mais faixas que 5) |
| `calcularSan()` | Conferências: leitura atual − anterior = consumo; volume das faixas = consumo; faixas água/esgoto; serviços; água+esgoto+serviços = total. Também espelha os campos na parte destacável |
| `coletarFolhaSanepar()` | Lê a folha e devolve os campos da fatura (`salvarFatura()` faz o resto) |
| `sanBrParaISO` / `sanISOParaBr` / `sanRefParaISO` / `sanISOParaRef` | Datas e referência são **digitadas como na fatura** (`dd/mm/aaaa`, `mm/aaaa`, com máscara) e guardadas em ISO (`AAAA-MM-DD`, `AAAA-MM`) |
| `sanPreencherMesesHist()` | Ao digitar a referência, preenche os 11 meses anteriores no histórico de consumo |
| `sanClassificarServicos()` | Converte a lista de serviços nas categorias de `extras` (`atMonet`, `multaAtraso`, `jurosMoratorios`, `taxaLixo`, `outros`) que os cards de "Cobranças Extras" usam |

**Modelo salvo (campos novos além dos antigos):** `nomeCliente`, `endereco`, `numero`, `ladoFrente`, `cep`, `local`, `roteiro`,
`categoria`, `qualidadeAgua{colunas,exigidas,realizadas,atenderam,conclusao}`, `historicoPagamentos[{ano,meses[12]}]`,
`servicos[{descricao,valor}]`, `faixas[{nome,volume,precoM3,totalAgua,totalEsgoto}]` (`nome` é novo), `historicoConsumo[{mes:'MM/AA',m3}]`,
`valorAgua`, `valorEsgoto`, `valorServicos`, `motivoAusenciaLeitura`, `mensagens`, `tributosFederais`, `codigoBarras`.
Faturas antigas continuam válidas (os cards tratam os campos novos como opcionais; `ROTULOS_EXTRAS` dá nome legível às chaves de `extras`).
Na fatura real **não existe** "Multa água / Multa esgoto": são duas linhas "MULTA POR ATRASO" — por isso virou lista.

**Gráfico Gasto × Consumo:** `renderChartGastoConsumo(canvasId, faturas, unidade, cor)` (barras = R$ no eixo esquerdo, linha = consumo no
direito; tooltip mostra o custo por unidade). `serieGastoConsumo()` junta as faturas com o `historicoConsumo` impresso nelas, então o gráfico já
nasce com 11 meses de consumo mesmo com uma só fatura cadastrada. Hoje só a aba Sanepar usa; a Copel é a mesma chamada com `'kWh'`.

**Pendências:**
1. **Parser de PDF (`parsearSanepar`) não foi validado contra um PDF real** — a Sanepar estava fora do ar. Ele procura "RÓTULO valor" em texto corrido, mas na fatura os
   rótulos ficam numa linha e os valores na linha de baixo; provavelmente falha em leituras, consumo e datas. `preencherFormulario()` já sabe preencher a folha nova com o que o parser devolver.
2. **Modelo novo de fatura (emitidas a partir de 01/10/2026):** traz Emissão, Consumo Faturado/Apurado/Medido, Avisos, tarifa, retenção federal e 25% de desconto
   automático na tarifa mínima. A folha atual segue o modelo anterior; adaptar quando houver uma fatura nova em mãos.
3. **Dados pessoais já no código público:** `DB.unidadesConsumidoras` (padrão, no topo de `contas.js`) tem titular e UCs reais. Não são dados novos, mas convém tirar do repositório.
4. Copel: aplicar o mesmo layout de fatura e o gráfico Gasto × kWh (ainda não pedido).

**Testes:** Playwright (`/tmp/pw/san_test.py`, `san_test2.py`) com o Chart.js do npm servido no lugar do CDN (o proxy bloqueia CDN/Google). Preencher o modal, salvar,
checar `DB.faturas[0]`, a série do gráfico e que os outros tipos de fatura seguem abrindo com `<details>`. Dados de teste sempre fictícios — nunca valores reais de fatura.

---

## 24. Tema claro/escuro do site pai (v1.10)

Até a v1.9 o toggle "Tema Claro / Escuro" (Configurações) só gravava `DB.usuario.tema`; nada aplicava. Agora:

- `aplicarTema(tema)` (`js/utils.js`) põe/tira `data-tema="claro"` no `<html>` e guarda `dnm_tema` no localStorage. `temaAtual()` lê o atributo.
- Chamada em `alternarTema()`, em `carregarLocalStorage()` e depois de cada `Object.assign(DB, …)` (Drive, `aplicarImportacao`, `desfazerImportacao`). Um `<script>` no `<head>` do `index.html` lê `dnm_tema` antes da pintura (evita flash).
- `css/main.css`: **escuro é o padrão** (`:root`); o claro é só um bloco `html[data-tema="claro"]` que redefine as variáveis (`--bg-*`, `--text-*`, `--border`, `--green/--red/--yellow/--blue`) e ajusta `.fol*`, login, scrollbar.
- Gráficos (canvas não lê variáveis CSS): usar `coresGrafico()` (`{texto, textoFraco, grade, fundo}`) em vez de hex fixo. Os gráficos são recriados ao trocar de página, então pegam o tema novo.
- **Regra para CSS/JS novo:** usar `var(--…)` e `coresGrafico()`; nada de `#111`/`#fff` fixo em fundo ou texto de tela. (A regra "NUNCA fundo claro" do NFScanner, `nfscanner.html`, continua valendo — o iframe tem tema próprio.) A página Cashback e Pontos mantém o visual verde/Excel nos dois temas.

## Campos em branco (v1.10)

Os formulários de fatura (`abrirModalNovaFatura`, folha da Sanepar) **não trazem placeholders de exemplo nem valores padrão** (faixas, anos do histórico, desconto da Inova, bandeira da Copel). Motivo: exemplos como `0000.0000` ou `9494` pareciam dados preenchidos. Não reintroduzir.

**Testes:** `/tmp/pw/tema_test.py` (alterna tema, confere persistência e que a folha abre sem nenhum campo preenchido).

## Gráficos Chart.js no site pai (v1.11)

Sempre criar com `novoGrafico(canvas, cfg)` (`js/utils.js`), não `new Chart(...)`: ele destrói o gráfico anterior do mesmo canvas. Sem isso, redesenhar a página (ex.: ✅ marcar fatura como paga) dava "Canvas is already in use".

**Varredura de botões:** `/tmp/pw/varredura.py` (clica todo `[onclick]` de cada página com dados fictícios e lista erros de JS) e `/tmp/pw/ben2.py` (Cashback e Pontos, container `#beneficios-app`). Última rodada: 0 falhas.

## Proteção contra perda de preenchimento (v1.12)

Um modal de fatura meio preenchido sumiu uma vez. Regras, que **não devem ser desfeitas**:

- `modalTemFormulario()` / `fecharModal(e)` (`js/utils.js`): modal com `input/textarea/select` **não fecha** por clique no fundo nem por Esc — só por ✕ / Cancelar / Salvar (chamadas sem evento). Modais só de leitura continuam fechando com Esc/clique fora.
- Atalhos Ctrl+N/F/E/I só valem com nenhum modal aberto e fora de campos de digitação; Ctrl+Z/Y nunca são bloqueados. (Antes, Ctrl+N substituía a fatura aberta pelo modal "Nova Dívida".)
- `beforeunload` pergunta antes de fechar/recarregar a aba se há campo preenchido no modal.
- **Rascunho automático** (`js/contas.js`, fim do arquivo): cada `input`/`change` no modal de fatura grava (300 ms) `localStorage.dnm_rascunho_fatura` = `{tipo, quando, serv, fx, v[]}` (valores na ordem dos campos; `serv`/`fx` = nº de linhas dinâmicas da Sanepar). `abrirModalNovaFatura(tipo)` chama `rascunhoFaturaRestaurar(tipo)` e mostra faixa amarela "Rascunho recuperado" com botão "Descartar". `fecharModal()` explícito, Cancelar e Salvar apagam o rascunho. Se o nº de campos do formulário mudar entre versões, o rascunho é ignorado (não arrisca preencher campo errado).
- **Se mexer no formulário de fatura**, rode `/tmp/pw/rascunho_test.py` (13 verificações).
- Limite conhecido: o site não guarda sessão — recarregar a aba exige novo login, mas o rascunho volta ao reabrir a fatura.

## Programas com validade por código — Dolce Gusto CLUB (v1.13)

`p.regraCodigo = { pontosPorCodigo: 100, validadeMeses: 12 }` (definido em `js/data.js` e aplicado por `migrarProgramas()` a qualquer programa de pontos cujo nome contenha "dolce gusto"). Confirmado no portal: ganho em 26/11/2026 vence em 26/11/2027 (mesmo dia, +12 meses; `somaMeses` limita ao último dia do mês, ex.: 29/02 → 28/02).

| Função (`js/beneficios.js`) | O que faz |
|---|---|
| `abrirModalCodigo(id)` | Modal rápido aberto pelo botão **☕ + Registrar código** do card: **código da caixa** (opcional) e data do escaneamento (hoje). Registra **1 código por vez** — não tem campo de quantidade (v1.14); `registrarCodigos` assume `n = 1` quando `#cod-qtd` não existe. O campo de quantidade segue existindo só no modal de 📦 Lotes, para lançar vários antigos de uma vez |
| `registrarCodigos(id, rapido)` | Soma `n × 100` pts ao saldo, cria/mescla lote (`adicionarPontosLote`) com vencimento +12 meses, grava histórico. Recusa data futura, data cujo vencimento já passou e **código repetido** (`p.codigos[]`, normalizado por `normCodigo`; com código, 1 por vez) |
| `adicionarPontosLote(p, qtd, dataISO, estimado)` | Mescla lote de mesma data de vencimento; não mexe no saldo |
| `salvarPopupSaldo` | Se o saldo sobe em programa com `regraCodigo`, o aumento vira lote `estimado:true` (vence hoje+12m; editável no modal de lotes) |
| `abrirModalLotes(id)` | Resumo (saldo, vencem em 30/90 dias, já expirados), lotes com data editável (`editarVencLote`), aviso se lotes ≠ saldo, registro de códigos e **📋 Colar histórico do portal** |
| `lerGanhosPortal` / `lerExpiradosPortal` | Leem do texto copiado do portal: `+100 Pontos · Adicionado: D/M/AAAA · Vence em: D/M/AAAA … - CODIGO12` (o rótulo do vencimento pode vir como `Vence em`, `Expira em`, `Validade` ou `Expiration Date` — v1.15) e `-100 Pontos · Expirado: D/M/AAAA`. Ganhos viram lotes com o vencimento real; expirados entram em ⏳ Vencimentos (`origem:'portal'`) |

**O extrato inteiro pode ser colado de uma vez (v1.16).** `previaColarHistorico` mostra 4 linhas e `lancarHistoricoColado` grava cada tipo no seu lugar:

| Linha do portal | Para onde vai |
|---|---|
| `+N Pontos · Adicionado · Vence em <futuro>` | lote + saldo + `p.codigos` (`planoGanhosPortal`) |
| `+N Pontos` já vencido, ou com `Points used` no lugar do vencimento | só `p.codigos` com `historico:true` (`planoCodigosPortal`) — **não** mexe no saldo |
| `-N Pontos · Expirado:` | `DB.vencimentos` (`origem:'portal'`) |
| `-N Pontos · Utilizado:` | `DB.resgates` (`origem:'portal'`, nº do pedido na descrição) — `lerResgatesPortal` |

Dedup: ganho/caixa por código, resgate e vencimento por `data|quantidade`. Conferido contra o extrato real do usuário: 33 ganhos, 17 expirados (1.700 pts) e 1 resgate (1.500 pts) lidos; só 1 ganho entra no saldo; colar de novo não lança nada — `/tmp/tdolce/t2.js`.

**Código da caixa (v1.19):** 12 caracteres impressos em 3 grupos de 4. `mascararCodigo(el)`/`formatarCodigo(c)` formatam enquanto digita ou cola (maiúsculas, só letras/números, espaço a cada 4); guardado sem espaços (`normCodigo`); menos de 12 é recusado. Teste: `/tmp/pw/cod_test.py`.

**Apagar pede confirmação (v1.18).** `pedirConfirmacao(icone, msg, textoOk, onOk)` (`js/utils.js`) reaproveita o `#alert-popup` (z-index 2001, acima de qualquer modal), troca o botão por Cancelar + Apagar (Cancelar vem primeiro e recebe o foco) e restaura o OK ao fechar. Usada em `removerLote` e `removerVencimento`; apagar um lote **não** mexe no saldo (só perde o controle da data). Para novas ações destrutivas, usar este helper em vez de `confirm()`. Teste: `/tmp/pw/conf_test.py`. O bloco "Adicionar lote manual" vira `<details>` recolhido quando o programa tem `regraCodigo`.

Colar duas vezes não duplica: ganhos por código (ou por `ganhosPortal` data|qtd quando sem código), expirados por data+quantidade. Ganho já vencido é ignorado (vem pela lista de expirados). Dados reais do usuário (códigos, saldos) ficam só no Drive/localStorage — **nunca no repositório**.

**Teste:** `/tmp/pw/dolce_test.py` (20 verificações; usa programa id 7, dados fictícios).
