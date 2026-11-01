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
    const m = document.body.innerText.match(/NOTAS DE\s+([A-Z]{3}\/\d{4})/i);
    return m ? m[1].toUpperCase() : null;
  }
  function linhasDeNotas() {
    const out = [];
    document.querySelectorAll('tr').forEach(tr => {
      const html = tr.outerHTML;
      const id = (html.match(/idDocFiscal=(\d+)/) || [])[1];
      if (!id) return;
      const tp = (html.match(/tpDoc=(\d)/) || [])[1] || '2';
      const cels = Array.from(tr.children).map(c => c.innerText.trim());
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
    const achados = [];
    document.querySelectorAll('a, td, span').forEach(el => {
      const t = el.textContent.trim().toUpperCase();
      if (!RE_LABEL.test(t)) return;
      if (el.tagName !== 'A' && el.children.length) return;
      const tr = el.closest('tr');
      let esperado = null;
      if (tr && tr.children[1]) esperado = parseInt(tr.children[1].innerText.replace(/\D/g, ''), 10) || null;
      achados.push({ label: t, el, esperado });
    });
    return achados;
  }
  function paginasResumo() {
    // links "1 2 3" da paginação (< 1 2 3 >)
    return Array.from(document.querySelectorAll('a, span')).filter(el => {
      const t = el.textContent.trim();
      if (!/^\d{1,2}$/.test(t) || el.children.length) return false;
      const pai = (el.parentElement && el.parentElement.textContent || '').replace(/\s+/g, ' ').trim();
      return /^[<‹]?\s*(\d{1,2}\s*)+[>›]?$/.test(pai);
    });
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
    const minIdx = run.incremental ? idxMes(MES[new Date(d.lastSync).getMonth()] + '/' + new Date(d.lastSync).getFullYear()) - 1 : -1;
    for (let guard = 0; guard < 80 && !cancelado; guard++) {
      run.passos++;
      await sleep(600);
      const atual = tituloMes();
      if (atual && !run.feitos.includes(atual)) {
        const linhas = linhasDeNotas();
        let novas = 0;
        linhas.forEach(n => { if (!d.notas[n.id]) { d.notas[n.id] = Object.assign({ mes: atual, importado: false, html: '' }, n); novas++; } });
        run.feitos.push(atual);
        msg('Mês ' + atual + ': ' + linhas.length + ' notas (' + novas + ' novas)');
        await set(d);
      }
      // próximo mês ainda não visitado
      const meses = rotulosDeMes();
      meses.forEach(m => { if (m.esperado) run.esperado[m.label] = m.esperado; });
      const alvo = meses.find(m => !run.feitos.includes(m.label));
      if (alvo) {
        if (idxMes(alvo.label) < minIdx) { run.feitos.push(alvo.label); continue; }
        await set(d);
        alvo.el.click();
        if (!(await esperarMes(alvo.label, 12000))) { msg('Aguardando página de ' + alvo.label + '...'); }
        d = await get(); d.run = d.run || run; Object.assign(d.run, run);
        continue;
      }
      // próxima página da lista de meses
      const pg = paginasResumo().find(el => !run.paginas.includes(el.textContent.trim()));
      if (pg) { run.paginas.push(pg.textContent.trim()); await set(d); pg.click(); await sleep(1500); continue; }
      break;
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

  // ---------- Início ----------
  async function init() {
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
