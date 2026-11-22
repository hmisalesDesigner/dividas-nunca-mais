// NFScanner – Nota Paraná: coleta as notas do Extrato e guarda na extensão.
(function () {
  const K = 'nfs';
  const MES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const RE_LABEL = /^(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\/(\d{4})$/;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const get = () => new Promise(r => chrome.storage.local.get(K, v => r(v[K] || { notas: {}, lastSync: 0, run: null })));
  const set = d => new Promise(r => chrome.storage.local.set({ [K]: d }, r));
  const idxMes = l => { const m = l.match(RE_LABEL); return m ? (+m[2]) * 12 + MES.indexOf(m[1]) : -1; };

  // ---------- Painel ----------
  let panel, elMsg, elBtn, elStop, cancelado = false;
  function criarPainel() {
    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;width:300px;background:#12141a;color:#e5e7eb;font:13px/1.4 Arial,sans-serif;border:1px solid #2a2f3d;border-radius:10px;padding:12px;box-shadow:0 6px 24px rgba(0,0,0,.4)';
    panel.innerHTML = '<div style="font-weight:700;margin-bottom:6px">🧾 NFScanner – Nota Paraná</div>' +
      '<div id="nfs-msg" style="margin-bottom:8px;color:#9ca3af">Pronto.</div>' +
      '<button id="nfs-go" style="background:#22c55e;color:#04210f;border:0;border-radius:6px;padding:7px 12px;font-weight:700;cursor:pointer">Sincronizar agora</button> ' +
      '<button id="nfs-stop" style="display:none;background:#374151;color:#fff;border:0;border-radius:6px;padding:7px 12px;cursor:pointer">Parar</button>';
    document.body.appendChild(panel);
    elMsg = panel.querySelector('#nfs-msg'); elBtn = panel.querySelector('#nfs-go'); elStop = panel.querySelector('#nfs-stop');
    elBtn.onclick = () => iniciar(false);
    elStop.onclick = () => { cancelado = true; msg('Parando...'); };
  }
  const msg = t => { if (elMsg) elMsg.textContent = t; };

  // ---------- Leitura do Extrato ----------
  function tituloMes() {
    const sp = document.getElementById('spanPeriodoId');
    const box = document.getElementById('notasdomes');
    const t = sp ? sp.textContent.trim().toUpperCase() : '';
    if (RE_LABEL.test(t) && (!box || box.style.display !== 'none')) return t;
    return null;
  }
  function linhasDeNotas() {
    const out = [];
    document.querySelectorAll('tr').forEach(tr => {
      const html = tr.outerHTML;
      const id = (html.match(/idDocFiscal=(\d+)/) || [])[1];
      if (!id) return;
      const tp = (html.match(/tpDoc=(\d)/) || [])[1] || '2';
      const cels = Array.from(tr.children).map(c => c.textContent.replace(/\s+/g, ' ').trim());
      const txt = cels.join(' | ');
      const cnpj = (txt.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/) || [])[0] || '';
      const data = (txt.match(/\d{2}\/\d{2}\/\d{4}/) || [])[0] || '';
      const dinheiro = (txt.match(/R\$\s*[\d.]+,\d{2}/g) || []).map(v => parseFloat(v.replace(/[^\d,]/g, '').replace(',', '.')));
      out.push({
        id, tpDoc: tp, cnpj, estabelecimento: cels[1] || '', numero: cels[2] || '', data,
        valor: dinheiro[0] || 0, credito: dinheiro[1] || 0,
        situacao: cels.length ? cels[cels.length - 2] || '' : '',
        url: '/nfprweb/NotaFiscalHtml?tpDoc=' + tp + '&idDocFiscal=' + id
      });
    });
    return out;
  }
  function rotulosDeMes() {
    const out = [];
    document.querySelectorAll('#minhasnotas tbody tr').forEach(tr => {
      const td = tr.children[0]; if (!td) return;
      const label = td.textContent.trim().toUpperCase();
      if (!RE_LABEL.test(label)) return;
      const esperado = parseInt((tr.children[1] ? tr.children[1].textContent : '').replace(/\D/g, ''), 10) || 0;
      out.push({ label, el: td, esperado });
    });
    return out;
  }
  // espera o AJAX trazer as notas do mês clicado
  async function esperarNotas(label, esperado) {
    const [mm, aa] = [String(MES.indexOf(label.slice(0, 3)) + 1).padStart(2, '0'), label.slice(4)];
    let ultimo = -1, estavel = 0;
    for (let i = 0; i < 60; i++) {
      await sleep(400);
      if (tituloMes() !== label) continue;
      const rows = linhasDeNotas();
      const doMes = rows.filter(r => r.data.slice(3) === mm + '/' + aa).length;
      if (rows.length && doMes === rows.length && (!esperado || rows.length >= esperado)) { await sleep(400); return true; }
      estavel = rows.length === ultimo ? estavel + 1 : 0; ultimo = rows.length;
      if (rows.length && doMes === rows.length && estavel >= 4) return true;
    }
    return false;
  }

  // ---------- Limpeza de dados pessoais ----------
  function sanitizar(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,link,style').forEach(e => e.remove());
    doc.querySelectorAll('fieldset').forEach(f => {
      const lg = f.querySelector('legend');
      if (lg && /destinat/i.test(lg.textContent)) f.remove();
    });
    doc.querySelectorAll('[data-role="collapsible"]').forEach(c => {
      const h = c.querySelector('h4');
      if (h && /consumidor/i.test(h.textContent)) c.remove();
    });
    const aba = doc.getElementById('aba_nft_2'); if (aba) aba.remove();
    return doc.documentElement.outerHTML.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '***');
  }
  async function baixar(url) {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = await r.arrayBuffer();
    const txt = new TextDecoder('iso-8859-1').decode(buf);
    if (/login|senha/i.test(txt.slice(0, 3000)) && !/NFC-e|NF-e/.test(txt.slice(0, 6000))) throw new Error('sessão expirada');
    return sanitizar(txt);
  }

  // ---------- Fluxo ----------
  async function esperarMes(label, ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (tituloMes() === label) return true; await sleep(300); }
    return false;
  }
  async function iniciar(auto) {
    if (elBtn.disabled) return;
    cancelado = false; elBtn.disabled = true; elStop.style.display = 'inline-block';
    let d = await get();
    d.run = d.run || { feitos: [], paginas: [], esperado: {}, passos: 0, inicio: Date.now(), incremental: !!d.lastSync };
    await set(d);
    await passo();
  }
  async function passo() {
    let d = await get(); const run = d.run; if (!run) return;
    const ult = d.lastSync ? new Date(d.lastSync) : null;
    const minIdx = run.incremental && ult ? idxMes(MES[ult.getMonth()] + '/' + ult.getFullYear()) - 1 : -1;
    const meses = rotulosDeMes();
    for (const m of meses) { run.esperado[m.label] = m.esperado; }
    for (let k = 0; k < meses.length && !cancelado; k++) {
      const m = meses[k];
      if (run.feitos.includes(m.label)) continue;
      if (!m.esperado || idxMes(m.label) < minIdx) { run.feitos.push(m.label); continue; }
      msg('Abrindo ' + m.label + ' (' + (k + 1) + '/' + meses.length + ')...');
      await set(d);
      m.el.click();
      const ok = await esperarNotas(m.label, m.esperado);
      if (!ok) { msg('Não carregou ' + m.label + '. Pulando.'); run.feitos.push(m.label); continue; }
      const linhas = linhasDeNotas(); let novas = 0;
      d = await get(); d.run = d.run || run; Object.assign(d.run, run);
      linhas.forEach(n => { if (!d.notas[n.id]) { d.notas[n.id] = Object.assign({ mes: m.label, importado: false, html: '' }, n); novas++; } });
      run.feitos.push(m.label); d.run = run;
      msg(m.label + ': ' + linhas.length + ' de ' + m.esperado + ' notas (' + novas + ' novas)');
      await set(d);
    }
    await detalhes();
  }
  async function detalhes() {
    let d = await get();
    const pend = Object.values(d.notas).filter(n => !n.html && !n.importado);
    let ok = 0, falhas = 0;
    for (let i = 0; i < pend.length && !cancelado; i++) {
      msg('Lendo notas ' + (i + 1) + ' de ' + pend.length + '...');
      try { d.notas[pend[i].id].html = await baixar(pend[i].url); ok++; }
      catch (e) {
        falhas++;
        if (/sess/.test(e.message)) { msg('Sessão expirou. Faça login e sincronize de novo.'); break; }
      }
      if (i % 5 === 4) await set(d);
      await sleep(350);
    }
    const run = d.run || {};
    // conferência com o total de notas de cada mês
    const aviso = [];
    Object.keys(run.esperado || {}).forEach(l => {
      const q = Object.values(d.notas).filter(n => n.mes === l).length;
      if (run.feitos && run.feitos.includes(l) && q < run.esperado[l]) aviso.push(l + ' (' + q + '/' + run.esperado[l] + ')');
    });
    if (!cancelado) { d.lastSync = Date.now(); d.run = null; }
    await set(d);
    try { localStorage.setItem('nfs_last_sync', String(d.lastSync)); } catch (e) {}
    elBtn.disabled = false; elStop.style.display = 'none';
    msg(cancelado ? 'Interrompido. Clique em Sincronizar para continuar.' :
      '✅ Concluído: ' + ok + ' notas lidas' + (falhas ? ', ' + falhas + ' com erro' : '') +
      (aviso.length ? '. Conferir: ' + aviso.join(', ') : '') + '. Abra o NFScanner para importar.');
  }

  // ---------- Sorteios (página MEUS BILHETES) ----------
  // A tabela #sorteios vem renderizada pelo servidor: todas as linhas estão no DOM
  // mesmo com a paginação exibindo 5 por vez. Nada de AJAX aqui.
  const MESNUM = { JAN:1, FEV:2, MAR:3, ABR:4, MAI:5, JUN:6, JUL:7, AGO:8, SET:9, OUT:10, NOV:11, DEZ:12 };
  const txt = el => (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim();
  const semAcento = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function isoData(br) {
    const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(br || '');
    return m ? m[3] + '-' + m[2] + '-' + m[1] : null;
  }
  function numero(s) {
    if (!s || /^[-–—\s]*$/.test(s)) return null;
    const v = s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  const inteiro = s => { const n = numero(s); return n === null ? null : Math.round(n); };

  function periodoISO(label) {
    const m = /^([A-Z]{3})\/(\d{4})$/.exec((label || '').trim().toUpperCase());
    if (!m || !MESNUM[m[1]]) return { inicio: null, fim: null };
    const mes = MESNUM[m[1]], ano = +m[2];
    const mm = String(mes).padStart(2, '0');
    const ultimo = String(new Date(ano, mes, 0).getDate()).padStart(2, '0');
    return { inicio: ano + '-' + mm + '-01', fim: ano + '-' + mm + '-' + ultimo };
  }

  // Mapeia as colunas pelo texto do cabeçalho — resiste a reordenação do portal
  function colunasSorteio(tabela) {
    const ix = {};
    Array.from(tabela.querySelectorAll('thead th')).forEach((th, i) => {
      const t = semAcento(txt(th));
      if (/^n[ºo°u]?\.?$/.test(t)) ix.nr = i;
      else if (t.includes('tipo')) ix.tipo = i;
      else if (t.includes('periodo')) ix.periodo = i;
      else if (t.includes('adesao')) ix.limite = i;
      else if (t.includes('loteria')) ix.loteria = i;
      else if (t.includes('data do sorteio')) ix.dataSorteio = i;
      else if (t.includes('soma')) ix.soma = i;
      else if (t.includes('premiados')) ix.premiados = i; // antes de 'bilhetes'
      else if (t.includes('bilhetes')) ix.bilhetes = i;
      else if (t.includes('situacao')) ix.situacao = i;
    });
    return ix;
  }

  function lerSorteios() {
    const tabela = document.getElementById('sorteios');
    if (!tabela) return null;
    const ix = colunasSorteio(tabela);
    if (ix.nr == null && ix.periodo == null) return null;
    const out = [];
    Array.from(tabela.querySelectorAll('tbody tr')).forEach(tr => {
      const tds = Array.from(tr.children);
      if (!tds.length) return;
      const rel = tr.getAttribute('rel');

      // Algumas linhas podem não trazer o <td> do ícone de situação, o que desloca
      // todas as colunas. Confere o Nº contra o atributo rel e corrige o offset.
      let off = 0;
      if (rel && ix.nr != null) {
        const achado = [0, -1, 1].find(o => tds[ix.nr + o] && txt(tds[ix.nr + o]) === rel);
        if (achado === undefined) return;
        off = achado;
      }
      const cel = i => (i == null ? '' : txt(tds[i + off]));

      const nr = cel(ix.nr) || rel || '';
      if (!/^\d+$/.test(nr)) return;

      const icone = tr.querySelector('td.sorteio');
      const per = periodoISO(cel(ix.periodo));
      out.push({
        nr: +nr,
        tipo: cel(ix.tipo),
        periodo: cel(ix.periodo),
        inicio: per.inicio,
        fim: per.fim,
        limiteAdesao: isoData(cel(ix.limite)),
        dataLoteria: isoData(cel(ix.loteria)),
        dataSorteio: isoData(cel(ix.dataSorteio)),
        valorNotas: numero(cel(ix.soma)),
        bilhetes: inteiro(cel(ix.bilhetes)),
        premiados: inteiro(cel(ix.premiados)),
        situacao: cel(ix.situacao),
        marca: icone ? ((icone.className.match(/icon-sorteio-([a-z]+)/) || [])[1] || '') : '',
        rotulo: txt(icone)
      });
    });
    return out;
  }

  function criarPainelSorteios() {
    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;width:300px;background:#12141a;color:#e5e7eb;font:13px/1.4 Arial,sans-serif;border:1px solid #2a2f3d;border-radius:10px;padding:12px;box-shadow:0 6px 24px rgba(0,0,0,.4)';
    panel.innerHTML = '<div style="font-weight:700;margin-bottom:6px">\u{1F3B0} NFScanner – Sorteios</div>' +
      '<div id="nfs-msg" style="margin-bottom:8px;color:#9ca3af">Lendo...</div>' +
      '<button id="nfs-go" style="background:#22c55e;color:#04210f;border:0;border-radius:6px;padding:7px 12px;font-weight:700;cursor:pointer">Ler sorteios</button>';
    document.body.appendChild(panel);
    elMsg = panel.querySelector('#nfs-msg');
    elBtn = panel.querySelector('#nfs-go');
    elStop = { style: {} }; // não há o que parar nesta página
    elBtn.onclick = () => coletarSorteios();
  }

  // Não sabemos se o plugin de paginação do portal esconde ou remove as linhas,
  // então lemos a página atual e também percorremos a paginação, juntando por Nº.
  async function coletarSorteios() {
    const acc = {};
    function absorver() {
      const l = lerSorteios();
      if (l === null) return false;
      l.forEach(x => { acc[x.nr] = x; });
      return true;
    }
    if (!absorver()) { msg('Não achei a tabela de sorteios. Recarregue a página.'); return; }

    const pag = document.getElementById('pag-sorteio');
    if (pag) {
      const links = Array.from(pag.querySelectorAll('a')).filter(a => {
        if (!/^\d+$/.test(txt(a))) return false;            // ignora «, », Próximo...
        const href = a.getAttribute('href') || '';
        return !/^https?:/i.test(href);                      // nunca sai da página
      });
      for (let i = 0; i < links.length && i < 60; i++) {
        msg('Lendo página ' + txt(links[i]) + ' da lista...');
        try { links[i].click(); } catch (e) {}
        await sleep(250);
        absorver();
      }
    }

    const lista = Object.keys(acc).map(k => acc[k]).sort((a, b) => b.nr - a.nr);
    if (!lista.length) { msg('A tabela de sorteios está vazia.'); return; }
    const d = await get();
    d.sorteios = lista;
    d.lastSyncSorteios = Date.now();
    await set(d);
    const premiados = lista.filter(s => (s.premiados || 0) > 0).length;
    msg('✅ ' + lista.length + ' sorteios lidos' + (premiados ? ', ' + premiados + ' com bilhete premiado' : '') +
      '. Abra o Dívidas Nunca Mais → Cashback → 🎰 Sorteios → Importar do portal.');
  }

  async function initSorteios() {
    criarPainelSorteios();
    const d = await get();
    if (d.lastSyncSorteios) msg('Última leitura: ' + new Date(d.lastSyncSorteios).toLocaleString('pt-BR'));
    // a tabela já está no DOM, mas o plugin de paginação do portal mexe nas linhas
    setTimeout(() => coletarSorteios(), 1200);
  }

  // ---------- Início ----------
  async function init() {
    if (/\/nfprweb\/Bilhete/i.test(location.pathname)) return initSorteios();
    if (!/\/nfprweb\/Extrato/i.test(location.pathname)) return;
    criarPainel();
    const d = await get();
    const dias = d.lastSync ? Math.floor((Date.now() - d.lastSync) / 86400000) : 999;
    if (d.run) { msg('Retomando sincronização...'); setTimeout(() => iniciar(true), 1500); return; }
    if (d.lastSync) msg('Última sincronização: ' + new Date(d.lastSync).toLocaleString('pt-BR'));
    if (dias >= 1 && /Extrato/.test(location.pathname)) {
      let s = 6; msg('Sincronizando em ' + s + 's... (clique em Parar para cancelar)');
      elStop.style.display = 'inline-block'; let abortou = false;
      elStop.onclick = () => { abortou = true; elStop.style.display = 'none'; msg('Automático cancelado.'); elStop.onclick = () => { cancelado = true; msg('Parando...'); }; };
      const t = setInterval(() => { if (abortou) return clearInterval(t); s--; if (s <= 0) { clearInterval(t); elStop.style.display = 'none'; elStop.onclick = () => { cancelado = true; msg('Parando...'); }; iniciar(true); } else msg('Sincronizando em ' + s + 's...'); }, 1000);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
