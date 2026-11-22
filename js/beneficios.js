// ===== CASHBACK & PONTOS =====
const CATEGORIAS_BENEFICIOS = {
  'aerea': { label: '✈️ Aéreas', cor: '#1d3557' },
  'combustivel': { label: '⛽ Combustível', cor: '#f4a261' },
  'varejo': { label: '🛒 Varejo', cor: '#2d6a4f' },
  'governo': { label: '🏛️ Governo', cor: '#457b9d' },
  'lifestyle': { label: '☕ Lifestyle', cor: '#6d4c41' },
  'cartao': { label: '💳 Cartões', cor: '#9b2335' },
  'outro': { label: '📦 Outros', cor: '#666' }
};
let popupFila = [];
let popupAtual = 0;

// Corrige programas cadastrados com o tipo errado (idempotente).
// Nota Paraná é cashback do governo (R$), não tem pontos.
function migrarProgramas() {
  let mudou = false;
  (DB.programas || []).forEach(p => {
    const nome = (p.nome || '').toLowerCase();
    if (p.tipo === 'pontos' && (nome.includes('nota paraná') || nome.includes('nota parana'))) {
      if (!(p.saldo > 0) && p.saldoCashback > 0) p.saldo = p.saldoCashback; // o saldo em R$ estava no campo de cashback
      p.tipo = 'cashback';
      delete p.saldoCashback;
      delete p.taxaConversao;
      // histórico: tira zeros finais que vieram do campo de pontos
      const h = DB.historicoSaldo && DB.historicoSaldo[p.id];
      if (h && p.saldo > 0) while (h.length > 1 && h[h.length - 1].saldo === 0) h.pop();
      mudou = true;
    }
  });
  if (mudou && typeof agendarSync === 'function') agendarSync();
  return mudou;
}

function entrarBeneficios() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('beneficios-app').style.display = 'flex';
  if (!DB.programas) DB.programas = [];
  migrarProgramas();
  if (!DB.resgates) DB.resgates = [];
  if (!DB.historicoSaldo) DB.historicoSaldo = {};
  renderBeneficios();
  verificarPopupsHoje();
}

function sairBeneficios() {
  document.getElementById('beneficios-app').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
}

// ===== POP-UPS DE ATUALIZAÇÃO =====
function verificarPopupsHoje() {
  const hoje = new Date().toISOString().split('T')[0];
  const ultimaVez = localStorage.getItem('dnm_beneficios_popup_data');
  if (ultimaVez === hoje) return; // já mostrou hoje
  localStorage.setItem('dnm_beneficios_popup_data', hoje);
  construirFilaPopups();
}

function construirFilaPopups() {
  const comExpiracao = DB.programas
    .filter(p => p.expiracao)
    .sort((a, b) => new Date(a.expiracao) - new Date(b.expiracao));
  
  const semExpiracao = DB.programas
    .filter(p => !p.expiracao)
    .sort((a, b) => (b.saldo || 0) - (a.saldo || 0));

  // Intercala sem expiração por valor entre os com expiração
  popupFila = [];
  let si = 0;
  comExpiracao.forEach((p, i) => {
    popupFila.push(p);
    if (si < semExpiracao.length && i % 2 === 0) {
      popupFila.push(semExpiracao[si++]);
    }
  });
  while (si < semExpiracao.length) popupFila.push(semExpiracao[si++]);

  popupAtual = 0;
  if (popupFila.length > 0) setTimeout(() => mostrarProximoPopup(), 800);
}

// Programas de pontos podem ter dois saldos (pontos e cashback R$): o usuário escolhe qual está informando.
let popupModo = 'pontos';
let popupModoId = null;

function popupSetModo(modo) {
  popupModo = modo;
  mostrarProximoPopup();
}

function popupSaldoBase(p, modo) {
  if (p.tipo === 'cashback') return p.saldo || 0;
  return modo === 'cashback' ? (p.saldoCashback || 0) : (p.saldo || 0);
}

function mostrarProximoPopup() {
  if (popupAtual >= popupFila.length) return;
  const p = popupFila[popupAtual];
  if (!p) return;

  const doisSaldos = p.tipo === 'pontos';
  if (doisSaldos && popupModoId !== p.id) {
    popupModoId = p.id;
    popupModo = p.popupModo || 'pontos'; // lembra a última escolha neste programa
  }
  const modo = doisSaldos ? popupModo : (p.tipo === 'cashback' ? 'cashback' : 'pontos');
  const emReais = modo === 'cashback';
  const saldoAnterior = popupSaldoBase(p, modo);

  const fmtPts = n => (n || 0).toLocaleString('pt-BR') + ' pts';
  const anteriorHtml = doisSaldos
    ? `<div style="display:flex;justify-content:center;gap:18px;">
         <div style="${!emReais ? 'opacity:1' : 'opacity:.45'}"><div style="font-size:11px;color:#666;">🎯 Pontos</div><div style="font-size:18px;font-weight:700;color:#217346;">${fmtPts(p.saldo)}</div></div>
         <div style="${emReais ? 'opacity:1' : 'opacity:.45'}"><div style="font-size:11px;color:#666;">💰 Cashback</div><div style="font-size:18px;font-weight:700;color:#217346;">${formatarMoeda(p.saldoCashback)}</div></div>
       </div>`
    : `<div style="font-size:12px;color:#666;margin-bottom:2px;">Saldo anterior</div>
       <div style="font-size:20px;font-weight:700;color:#217346;">${emReais ? formatarMoeda(saldoAnterior) : fmtPts(saldoAnterior)}</div>`;

  document.getElementById('ben-modal-overlay').style.display = 'flex';
  document.getElementById('ben-modal-body').innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:48px;margin-bottom:8px;">${p.logo}</div>
      <h2 style="font-size:18px;font-weight:700;color:#333;margin-bottom:4px;">${p.nome}</h2>
      <div style="font-size:13px;color:#666;">Atualize seu saldo atual</div>
    </div>
    <div style="background:#f3f4f6;border-radius:8px;padding:12px;margin-bottom:16px;text-align:center;">
      ${doisSaldos ? '<div style="font-size:12px;color:#666;margin-bottom:6px;">Saldos anteriores</div>' : ''}
      ${anteriorHtml}
    </div>
    ${doisSaldos ? `
    <div style="font-size:12px;font-weight:600;color:#666;margin-bottom:6px;">Que tipo de saldo você vai informar?</div>
    <div class="ben-tipo">
      <button type="button" class="${!emReais ? 'on' : ''}" onclick="popupSetModo('pontos')">🎯 Pontos</button>
      <button type="button" class="${emReais ? 'on' : ''}" onclick="popupSetModo('cashback')">💰 Cashback (R$)</button>
    </div>` : ''}
    <div style="margin-bottom:16px;">
      <label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:6px;">
        Novo saldo em ${emReais ? 'cashback (R$)' : 'pontos (pts)'}
      </label>
      <input id="popup-saldo" type="number"
        placeholder="${emReais ? '0.00' : '0'}"
        min="0" step="${emReais ? '0.01' : '1'}"
        style="width:100%;padding:12px;border:2px solid #217346;border-radius:8px;font-size:16px;font-weight:600;text-align:center;outline:none;color:#333;background:#fff;"
        oninput="popupCheckQueda(${saldoAnterior})"
        onkeydown="if(event.key==='Enter') salvarPopupSaldo(${p.id}, ${saldoAnterior})" />
    </div>
    <div id="popup-queda" style="display:none;margin-bottom:16px;">
      <div style="font-size:12px;font-weight:600;color:#666;margin-bottom:6px;">O saldo diminuiu. O que aconteceu?</div>
      ${motivoQuedaHtml('popup-motivo')}
    </div>
    ${p.expiracao ? `<div style="font-size:12px;color:#f59e0b;text-align:center;margin-bottom:12px;">⏰ Expira em ${formatarData(p.expiracao)}</div>` : ''}
    <div style="display:flex;gap:10px;">
      <button onclick="pularPopup()" style="flex:1;background:#fff;border:1px solid #ddd;color:#666;padding:10px;border-radius:8px;font-size:13px;cursor:pointer;">Pular</button>
      <button onclick="salvarPopupSaldo(${p.id}, ${saldoAnterior})" style="flex:2;background:#217346;border:none;color:#fff;padding:10px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">✓ Salvar</button>
    </div>
    <div style="text-align:center;margin-top:10px;font-size:12px;color:#999;">
      ${popupAtual + 1} de ${popupFila.length} programas
    </div>
  `;
  setTimeout(() => document.getElementById('popup-saldo')?.focus(), 100);
}

// ===== QUEDA DE SALDO: RESGATE x VENCIMENTO =====
// tipoSaldo: 'pontos' | 'cashback' (R$)
function tipoSaldoDe(r) {
  if (r.tipoSaldo) return r.tipoSaldo;
  const prog = DB.programas.find(p => p.id === r.programaId);
  return prog && prog.tipo === 'cashback' ? 'cashback' : 'pontos';
}

function fmtQtd(qtd, tipoSaldo) {
  return tipoSaldo === 'cashback' ? formatarMoeda(qtd) : (qtd || 0).toLocaleString('pt-BR') + ' pts';
}

function registrarQueda(p, quantidade, motivo, tipoSaldo, data) {
  quantidade = Math.round(quantidade * 100) / 100;
  if (quantidade <= 0) return;
  if (motivo === 'vencimento') {
    if (!DB.vencimentos) DB.vencimentos = [];
    DB.vencimentos.push({ id: gerarId(), programaId: p.id, quantidade, tipoSaldo, descricao: 'Vencimento', data });
  } else {
    if (!DB.resgates) DB.resgates = [];
    DB.resgates.push({ id: gerarId(), programaId: p.id, quantidade, tipoSaldo, descricao: 'Resgate detectado automaticamente', data });
  }
}

function registrarVencimentosLotes(p, lotes) {
  if (!DB.vencimentos) DB.vencimentos = [];
  lotes.forEach(l => DB.vencimentos.push({
    id: gerarId(), programaId: p.id, quantidade: l.quantidade || 0, tipoSaldo: 'pontos',
    descricao: 'Lote vencido', data: l.expiracao
  }));
}

// Mostra o seletor "foi resgate ou vencimento?" quando o valor digitado é menor que o saldo anterior
function popupCheckQueda(saldoAnterior) {
  const v = parseFloat(document.getElementById('popup-saldo')?.value);
  const box = document.getElementById('popup-queda');
  if (box) box.style.display = (!isNaN(v) && v < saldoAnterior) ? 'block' : 'none';
}

function motivoQuedaHtml(idSelect, estilo) {
  return `<select id="${idSelect}" style="${estilo || ''}width:100%;padding:9px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;background:#fff;color:#333;">
      <option value="resgate">🎁 Usei / resgatei</option>
      <option value="vencimento">⏳ Venceram (expiraram)</option>
    </select>`;
}

// ===== PONTOS VENCIDOS =====
function hojeISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function lotesVencidos(p) {
  const hoje = hojeISO();
  return (p.lotes || []).filter(l => l.expiracao && l.expiracao < hoje);
}

// Se há lotes já vencidos, mostra a conta (saldo anterior − vencido = esperado) e pede confirmação.
// Retorna null se o usuário cancelar; senão { vencido, lotes }.
function confirmarVencidos(p, saldoAnterior, novoSaldo) {
  const lotes = lotesVencidos(p);
  if (!lotes.length) return { vencido: 0, lotes: [] };
  const fmt = n => (n || 0).toLocaleString('pt-BR');
  const vencido = lotes.reduce((s, l) => s + (l.quantidade || 0), 0);
  // Lote maior que o saldo anterior: o vencimento já foi descontado numa atualização antiga; só limpa o lote
  if (vencido > saldoAnterior) return { vencido: 0, lotes };
  const esperado = saldoAnterior - vencido;
  const dif = novoSaldo - esperado;
  const msg = p.nome + ' — pontos já vencidos:\n'
    + lotes.map(l => '• ' + fmt(l.quantidade) + ' pts (venceram em ' + formatarData(l.expiracao) + ')').join('\n')
    + '\n\nSaldo anterior:  ' + fmt(saldoAnterior) + ' pts'
    + '\n− vencido:  ' + fmt(vencido) + ' pts'
    + '\n= esperado:  ' + fmt(esperado) + ' pts'
    + '\n\nVocê informou:  ' + fmt(novoSaldo) + ' pts  '
    + (Math.abs(dif) < 0.5 ? '✓ confere com a conta' : '⚠ difere em ' + fmt(dif) + ' pts')
    + '\n\nConfirmar ' + fmt(novoSaldo) + ' pts como saldo atual? (o lote vencido será removido)';
  if (!confirm(msg)) return null;
  return { vencido, lotes };
}

function salvarPopupSaldo(id, saldoAnterior) {
  const input = document.getElementById('popup-saldo');
  if (!input || input.value.trim() === '') { input?.focus(); return; } // evita zerar o saldo sem querer
  const novoSaldo = parseFloat(input.value) || 0;
  const p = DB.programas.find(p => p.id === id);
  if (!p) { pularPopup(); return; }

  const hoje = new Date().toISOString().split('T')[0];
  const emReais = p.tipo === 'cashback' || (p.tipo === 'pontos' && popupModo === 'cashback');
  const tipoSaldo = emReais ? 'cashback' : 'pontos';
  const motivo = document.getElementById('popup-motivo')?.value || 'resgate';

  if (p.tipo === 'pontos' && emReais) {
    // Cashback (R$) de um programa de pontos: não mexe nos pontos nem no histórico de pontos
    if (!DB.historicoCashback) DB.historicoCashback = {};
    if (!DB.historicoCashback[id]) DB.historicoCashback[id] = [];
    DB.historicoCashback[id].push({ data: hoje, saldo: novoSaldo });
    registrarQueda(p, saldoAnterior - novoSaldo, motivo, 'cashback', hoje);
    p.saldoCashback = novoSaldo;
  } else {
    // Pontos vencidos (lotes): mostra a conta e pede confirmação antes de gravar
    let vencido = 0, lotes = [];
    if (p.tipo === 'pontos') {
      const r = confirmarVencidos(p, saldoAnterior, novoSaldo);
      if (!r) return; // cancelou: mantém o pop-up aberto para corrigir
      vencido = r.vencido; lotes = r.lotes;
    }

    if (!DB.historicoSaldo) DB.historicoSaldo = {};
    if (!DB.historicoSaldo[id]) DB.historicoSaldo[id] = [];
    DB.historicoSaldo[id].push({ data: hoje, saldo: novoSaldo });

    if (lotes.length) { registrarVencimentosLotes(p, lotes); p.lotes = p.lotes.filter(l => !lotes.includes(l)); }
    // O que sobrar da queda (além dos lotes vencidos) segue o motivo escolhido
    registrarQueda(p, (saldoAnterior - novoSaldo) - vencido, motivo, tipoSaldo, hoje);
    p.saldo = novoSaldo;
  }

  if (p.tipo === 'pontos') p.popupModo = popupModo;
  agendarSync();
  fecharBenModal();
  renderBeneficios();

  popupAtual++;
  if (popupAtual < popupFila.length) {
    setTimeout(() => mostrarProximoPopup(), 400);
  }
}

function pularPopup() {
  fecharBenModal();
  popupAtual++;
  if (popupAtual < popupFila.length) {
    setTimeout(() => mostrarProximoPopup(), 400);
  }
}

function fecharBenModal() {
  document.getElementById('ben-modal-overlay').style.display = 'none';
}

// ===== RENDER PRINCIPAL =====
function renderBeneficios() {
  if (!DB.programas) DB.programas = [];
  const cashbacks = DB.programas.filter(p => p.tipo === 'cashback');
  const pontos = DB.programas.filter(p => p.tipo === 'pontos');
  const totalCashback = DB.programas.reduce((s, p) => {
    if (p.tipo === 'cashback') return s + (p.saldo || 0);
    return s + (p.saldoCashback || 0);
  }, 0);
  const totalPontos = pontos.reduce((s, p) => s + (p.saldo || 0), 0);
  const totalEmReais = DB.programas.reduce((s, p) => {
    if (p.tipo === 'cashback') return s + (p.saldo || 0);
    if (p.taxaConversao) return s + (p.saldo || 0) * p.taxaConversao;
    return s;
  }, 0);

  // Alertas expiração
  const hoje = new Date();
  const expirando = DB.programas.filter(p => {
    if (!p.expiracao) return false;
    const dias = Math.ceil((new Date(p.expiracao) - hoje) / (1000*60*60*24));
    return dias <= 30 && dias >= 0;
  });

  const page = document.getElementById('beneficios-content');
  page.innerHTML = `
    <!-- Resumo -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
      <div style="background:#fff;border-radius:10px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <div style="font-size:12px;color:#666;margin-bottom:6px;">💰 Total Cashback</div>
        <div style="font-size:24px;font-weight:700;color:#217346;">${formatarMoeda(totalCashback)}</div>
      </div>
      <div style="background:#fff;border-radius:10px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <div style="font-size:12px;color:#666;margin-bottom:6px;">🎯 Total Pontos</div>
        <div style="font-size:24px;font-weight:700;color:#217346;">${totalPontos.toLocaleString('pt-BR')} pts</div>
      </div>
      <div style="background:#fff;border-radius:10px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <div style="font-size:12px;color:#666;margin-bottom:6px;">💵 Valor Total em R$</div>
        <div style="font-size:24px;font-weight:700;color:#217346;">${formatarMoeda(totalEmReais)}</div>
        <div style="font-size:10px;color:#999;margin-top:2px;">Pontos sem taxa não incluídos</div>
      </div>
      <div style="background:#fff;border-radius:10px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08);${expirando.length > 0 ? 'border-left:4px solid #f59e0b;' : ''}">
        <div style="font-size:12px;color:#666;margin-bottom:6px;">${expirando.length > 0 ? '⚠️' : '✅'} Expirando em 30 dias</div>
        <div style="font-size:24px;font-weight:700;color:${expirando.length > 0 ? '#f59e0b' : '#217346'};">${expirando.length}</div>
        <div style="font-size:10px;color:#999;margin-top:2px;">${expirando.map(p => p.nome).join(', ') || 'Nenhum'}</div>
      </div>
    </div>

    <!-- Toolbar -->
    <div style="display:flex;gap:10px;margin-bottom:20px;">
      <button onclick="abrirModalNovoPrograma()" style="background:#217346;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">+ Novo Programa</button>
      <button onclick="construirFilaPopups()" style="background:#fff;border:1px solid #217346;color:#217346;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">🔄 Atualizar Saldos</button>
      <button onclick="mostrarGraficos()" style="background:#fff;border:1px solid #217346;color:#217346;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">📊 Ver Gráficos</button>
      <button onclick="abrirModalVencimentos()" style="background:#fff;border:1px solid #217346;color:#217346;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">${textoBotaoVencimentos()}</button>
    </div>

    <!-- Totais por categoria -->
    ${renderTotaisPorCategoria()}

    <!-- Grid de todos os programas -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px;">
      ${DB.programas.length === 0 ? `
        <div style="grid-column:1/-1;text-align:center;padding:48px;color:#999;background:#fff;border-radius:10px;">
          <div style="font-size:48px;margin-bottom:12px;">🎁</div>
          <p>Nenhum programa cadastrado.<br>Clique em "+ Novo Programa".</p>
        </div>` : DB.programas.map(p => cardBeneficio(p)).join('')}
    </div>

    <!-- Resgates recentes -->
    <div style="background:#fff;border-radius:10px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
      <h3 style="font-size:15px;font-weight:600;color:#333;margin-bottom:16px;">📋 Resgates Recentes</h3>
      ${!DB.resgates || DB.resgates.length === 0
        ? '<p style="color:#999;font-size:13px;">Nenhum resgate registrado ainda.</p>'
        : `<table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="border-bottom:2px solid #e5e7eb;">
              <th style="text-align:left;padding:8px 12px;color:#666;font-weight:600;">Programa</th>
              <th style="text-align:left;padding:8px 12px;color:#666;font-weight:600;">Valor</th>
              <th style="text-align:left;padding:8px 12px;color:#666;font-weight:600;">Descrição</th>
              <th style="text-align:left;padding:8px 12px;color:#666;font-weight:600;">Data</th>
            </tr></thead>
            <tbody>
              ${(DB.resgates || []).slice(-8).reverse().map(r => {
                const prog = DB.programas.find(p => p.id === r.programaId);
                return `<tr style="border-bottom:1px solid #f3f4f6;">
                  <td style="padding:10px 12px;">${prog ? prog.logo + ' ' + prog.nome : '-'}</td>
                  <td style="padding:10px 12px;font-weight:600;color:#217346;">${fmtQtd(r.quantidade, tipoSaldoDe(r))}</td>
                  <td style="padding:10px 12px;color:#666;">${r.descricao || '-'}</td>
                  <td style="padding:10px 12px;color:#666;">${formatarData(r.data)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>`}
    </div>
  `;
}

function renderTotaisPorCategoria() {
  if (!DB.programas || DB.programas.length === 0) return '';

  const grupos = {};
  DB.programas.forEach(p => {
    if (!p.categoria) {
      const nome = (p.nome || '').toLowerCase();
      if (nome.includes('azul') || nome.includes('smiles') || nome.includes('latam')) p.categoria = 'aerea';
      else if (nome.includes('kmv') || nome.includes('posto') || nome.includes('shell')) p.categoria = 'combustivel';
      else if (nome.includes('méliuz') || nome.includes('meliuz') || nome.includes('dinheiro na nota')) p.categoria = 'varejo';
      else if (nome.includes('nota paraná') || nome.includes('nota parana')) p.categoria = 'governo';
      else if (nome.includes('nescafé') || nome.includes('nescafe') || nome.includes('dolce')) p.categoria = 'lifestyle';
      else if (nome.includes('livelo') || nome.includes('esfera')) p.categoria = 'cartao';
      else p.categoria = 'outro';
    }
    const cat = p.categoria;
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(p);
  });

  const items = Object.entries(grupos).map(([cat, progs]) => {
    const catInfo = CATEGORIAS_BENEFICIOS[cat] || CATEGORIAS_BENEFICIOS['outro'];
    const totalPontos = progs.filter(p => p.tipo === 'pontos').reduce((s, p) => s + (p.saldo || 0), 0);
    const totalCash = progs.reduce((s, p) => {
      if (p.tipo === 'cashback') return s + (p.saldo || 0);
      return s + (p.saldoCashback || 0);
    }, 0);
    // Converte hex para rgba com baixa opacidade
    const hex = catInfo.cor.replace('#','');
    const r = parseInt(hex.substring(0,2),16);
    const g = parseInt(hex.substring(2,4),16);
    const b = parseInt(hex.substring(4,6),16);
    return '<div style="background:rgba(' + r + ',' + g + ',' + b + ',0.06);border-radius:8px;padding:12px 16px;border-left:3px solid rgba(' + r + ',' + g + ',' + b + ',0.5);box-shadow:0 1px 3px rgba(0,0,0,0.04);display:flex;align-items:center;justify-content:space-between;">'
      + '<span style="font-size:13px;font-weight:700;color:#333;">' + catInfo.label + '</span>'
      + '<div style="display:flex;gap:16px;font-size:12px;color:#666;">'
      + (totalPontos > 0 ? '<span>🎯 <strong>' + totalPontos.toLocaleString('pt-BR') + ' pts</strong></span>' : '')
      + (totalCash > 0 ? '<span>💰 <strong>' + formatarMoeda(totalCash) + '</strong></span>' : '')
      + '</div></div>';
  }).join('');

  return '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">' + items + '</div>';
}


function cardBeneficio(p) {
  const hoje = new Date();
  const expDias = p.expiracao ? Math.ceil((new Date(p.expiracao) - hoje) / (1000*60*60*24)) : null;
  const expCor = expDias !== null ? (expDias <= 7 ? '#ef4444' : expDias <= 15 ? '#f97316' : expDias <= 30 ? '#f59e0b' : '#217346') : '#999';
  const expAlerta = expDias !== null && expDias <= 30;

  return `
    <div style="background:#fff;border-radius:10px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border-top:3px solid #217346;${expAlerta ? 'border-top-color:' + expCor + ';' : ''}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:24px;">${p.logo}</span>
          <span style="font-weight:600;font-size:13px;color:#333;">${p.nome}</span>
        </div>
        <button onclick="editarPrograma(${p.id})" style="background:none;border:none;color:#999;cursor:pointer;font-size:14px;">⚙️</button>
      </div>
      <div style="font-size:22px;font-weight:700;color:#217346;margin-bottom:4px;">
        ${p.tipo === 'cashback' ? formatarMoeda(p.saldo || 0) : (p.saldo || 0).toLocaleString('pt-BR') + ' pts'}
      </div>
      ${p.tipo === 'pontos' && p.saldoCashback ? `<div style="font-size:14px;font-weight:600;color:#34a85a;margin-bottom:2px;">${formatarMoeda(p.saldoCashback)} cashback</div>` : ''}
      ${p.taxaConversao && p.tipo === 'pontos' ? `<div style="font-size:11px;color:#666;margin-bottom:4px;">≈ ${formatarMoeda((p.saldo || 0) * p.taxaConversao)}</div>` : ''}
      ${renderLotesCard(p)}
      <div style="font-size:11px;color:${expCor};margin-bottom:12px;">
        ${p.expiracao ? `⏰ Expira: ${formatarData(p.expiracao)} (${expDias}d)` : 'Não expira'}
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="abrirModalAtualizar(${p.id})" style="flex:1;background:#fff;border:1px solid #217346;color:#217346;padding:7px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Atualizar</button>
        <button onclick="abrirModalResgatar(${p.id})" style="flex:1;background:#217346;border:none;color:#fff;padding:7px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 4px rgba(33,115,70,0.3);">Resgatar</button>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px;">
        ${p.tipo === 'pontos' ? `<button onclick="abrirModalLotes(${p.id})" style="flex:1;background:#f3f4f6;border:none;color:#666;padding:5px;border-radius:6px;font-size:11px;cursor:pointer;">📦 Lotes</button>` : ''}
        <button onclick="abrirModalCupons(${p.id})" style="flex:1;background:#f3f4f6;border:none;color:#666;padding:5px;border-radius:6px;font-size:11px;cursor:pointer;">🎟️ Cupons${p.cupons && p.cupons.length > 0 ? ` (${p.cupons.length})` : ''}</button>
      </div>
    </div>
  `;
}

// ===== MODAIS =====
function abrirModalNovoPrograma() {
  abrirModal('+ Novo Programa', `
    <div class="form-row">
      <div class="form-group">
        <label>Nome *</label>
        <input id="np-nome" type="text" placeholder="Ex: Smiles" />
      </div>
      <div class="form-group">
        <label>Emoji</label>
        <input id="np-logo" type="text" placeholder="✈️" maxlength="2" value="🎁" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Categoria *</label>
        <select id="np-categoria">
          <option value="aerea">✈️ Aéreas</option>
          <option value="combustivel">⛽ Combustível</option>
          <option value="varejo">🛒 Varejo</option>
          <option value="governo">🏛️ Governo</option>
          <option value="lifestyle">☕ Lifestyle</option>
          <option value="cartao">💳 Cartões</option>
          <option value="outro">📦 Outros</option>
        </select>
      </div>
      <div class="form-group">
        <label>Tipo *</label>
        <select id="np-tipo">
          <option value="pontos">Pontos</option>
          <option value="cashback">Cashback (R$)</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Saldo Atual</label>
        <input id="np-saldo" type="number" placeholder="0" min="0" step="0.01" />
      </div>
      <div class="form-group">
        <label>Taxa de Conversão (R$ por ponto)</label>
        <input id="np-taxa" type="number" placeholder="Ex: 0.017" min="0" step="0.001" />
        <small style="color:#999;font-size:11px;">Opcional — deixe em branco se não souber</small>
      </div>
      <div class="form-group">
        <label>Data de Expiração</label>
        <input id="np-expiracao" type="date" />
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primary" onclick="salvarNovoPrograma()">💾 Salvar</button>
    </div>
  `, '520px');
}

function salvarNovoPrograma() {
  const nome = document.getElementById('np-nome').value.trim();
  if (!nome) { showAlert('⚠️', 'Informe o nome do programa.'); return; }
  if (!DB.programas) DB.programas = [];
  const prog = {
    id: gerarId(), nome,
    logo: document.getElementById('np-logo').value || '🎁',
    categoria: document.getElementById('np-categoria').value || 'outro',
    tipo: document.getElementById('np-tipo').value,
    saldo: parseFloat(document.getElementById('np-saldo').value) || 0,
    taxaConversao: parseFloat(document.getElementById('np-taxa').value) || null,
    expiracao: document.getElementById('np-expiracao').value || null
  };
  DB.programas.push(prog);
  agendarSync();
  fecharModal();
  renderBeneficios();
  showAlert('✅', 'Programa cadastrado!');
}

function abrirModalAtualizar(id) {
  const p = DB.programas.find(p => p.id === id);
  if (!p) return;
  abrirModal(`✏️ Atualizar — ${p.nome}`, `
    <div class="form-group">
      <label>Novo saldo (${p.tipo === 'cashback' ? 'R$' : 'pontos'})</label>
      <input id="upd-saldo" type="number" value="${p.saldo || 0}" min="0" step="${p.tipo === 'cashback' ? '0.01' : '1'}" />
    </div>
    ${p.tipo === 'pontos' ? `
    <div class="form-group">
      <label>Saldo Cashback (R$) <small style="color:#999;">— opcional, se o programa tiver cashback também</small></label>
      <input id="upd-cashback" type="number" value="${p.saldoCashback || 0}" min="0" step="0.01" />
    </div>` : '<input type="hidden" id="upd-cashback" value="0" />'}
    <div class="form-group">
      <label>Data de Expiração</label>
      <input id="upd-exp" type="date" value="${p.expiracao || ''}" />
    </div>
    <div class="form-group">
      <label>Se o saldo ${p.tipo === 'cashback' ? '(R$)' : 'de pontos'} diminuiu, o que aconteceu?</label>
      ${motivoQuedaHtml('upd-motivo')}
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primary" onclick="confirmarAtualizar(${id})">💾 Salvar</button>
    </div>
  `, '420px');
}

function confirmarAtualizar(id) {
  const p = DB.programas.find(p => p.id === id);
  if (!p) return;
  const novoSaldo = parseFloat(document.getElementById('upd-saldo').value) || 0;
  const saldoAnterior = p.saldo || 0;
  let vencido = 0, lotesVenc = [];
  if (p.tipo === 'pontos') {
    const r = confirmarVencidos(p, saldoAnterior, novoSaldo);
    if (!r) return;
    vencido = r.vencido; lotesVenc = r.lotes;
  }

  if (!DB.historicoSaldo) DB.historicoSaldo = {};
  if (!DB.historicoSaldo[id]) DB.historicoSaldo[id] = [];
  DB.historicoSaldo[id].push({ data: new Date().toISOString().split('T')[0], saldo: novoSaldo });

  const hojeStr = new Date().toISOString().split('T')[0];
  if (lotesVenc.length) { registrarVencimentosLotes(p, lotesVenc); p.lotes = p.lotes.filter(l => !lotesVenc.includes(l)); }
  if (saldoAnterior > 0) {
    registrarQueda(p, (saldoAnterior - novoSaldo) - vencido, document.getElementById('upd-motivo')?.value || 'resgate', p.tipo === 'cashback' ? 'cashback' : 'pontos', hojeStr);
  }

  p.saldo = novoSaldo;
  p.saldoCashback = parseFloat(document.getElementById('upd-cashback')?.value) || 0;
  p.expiracao = document.getElementById('upd-exp').value || null;
  agendarSync();
  fecharModal();
  renderBeneficios();
  showAlert('✅', 'Saldo atualizado!');
}

let resTipo = 'pontos';

function resSaldoDe(p, tipo) {
  return (p.tipo === 'cashback' || tipo === 'cashback') ? (p.tipo === 'cashback' ? (p.saldo || 0) : (p.saldoCashback || 0)) : (p.saldo || 0);
}

function resSetTipo(id, tipo) {
  const p = DB.programas.find(p => p.id === id);
  if (!p) return;
  resTipo = tipo;
  const emReais = p.tipo === 'cashback' || tipo === 'cashback';
  const saldo = resSaldoDe(p, tipo);
  document.querySelectorAll('#res-tipo button').forEach(b => b.classList.toggle('on', b.dataset.tipo === tipo));
  document.getElementById('res-saldo-txt').textContent = fmtQtd(saldo, emReais ? 'cashback' : 'pontos');
  const q = document.getElementById('res-qtd');
  q.step = emReais ? '0.01' : '1'; q.max = saldo; q.value = '';
  document.getElementById('res-qtd-lbl').textContent = emReais ? 'Valor (R$) *' : 'Quantidade (pontos) *';
}

function abrirModalResgatar(id) {
  const p = DB.programas.find(p => p.id === id);
  if (!p) return;
  const doisSaldos = p.tipo === 'pontos';
  resTipo = (doisSaldos && !(p.saldo > 0) && (p.saldoCashback > 0)) ? 'cashback' : 'pontos';
  const emReais = p.tipo === 'cashback' || resTipo === 'cashback';
  const saldo = resSaldoDe(p, resTipo);
  abrirModal(`🎁 Resgatar — ${p.nome}`, `
    ${doisSaldos ? `
    <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">Resgatar de qual saldo?</div>
    <div class="ben-tipo" id="res-tipo">
      <button type="button" data-tipo="pontos" class="${resTipo === 'pontos' ? 'on' : ''}" onclick="resSetTipo(${id}, 'pontos')">🎯 Pontos (${(p.saldo || 0).toLocaleString('pt-BR')})</button>
      <button type="button" data-tipo="cashback" class="${resTipo === 'cashback' ? 'on' : ''}" onclick="resSetTipo(${id}, 'cashback')">💰 Cashback (${formatarMoeda(p.saldoCashback || 0)})</button>
    </div>` : ''}
    <p style="color:var(--text-secondary);margin-bottom:16px;">
      Saldo: <strong id="res-saldo-txt">${fmtQtd(saldo, emReais ? 'cashback' : 'pontos')}</strong>
    </p>
    <div class="form-group">
      <label id="res-qtd-lbl">${emReais ? 'Valor (R$) *' : 'Quantidade (pontos) *'}</label>
      <input id="res-qtd" type="number" placeholder="0" min="0" step="${emReais ? '0.01' : '1'}" max="${saldo}" />
    </div>
    <div class="form-group">
      <label>Descrição</label>
      <input id="res-desc" type="text" placeholder="Ex: Passagem aérea, desconto, abastecimento..." />
    </div>
    <div style="border-top:1px solid var(--border);margin:16px 0;padding-top:16px;">
      <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;">🎟️ Cupom/Ticket gerado (opcional)</div>
      <div class="form-group">
        <label>Código do Cupom</label>
        <input id="res-cupom" type="text" placeholder="Ex: DNM2026-ABC123" style="font-family:monospace;letter-spacing:1px;" />
      </div>
      <div class="form-group">
        <label>Validade do Cupom</label>
        <input id="res-cupom-val" type="date" />
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primary" onclick="confirmarResgate(${id})">✅ Confirmar</button>
    </div>
  `, '460px');
}

function confirmarResgate(id) {
  const p = DB.programas.find(p => p.id === id);
  if (!p) return;
  const qtd = parseFloat(document.getElementById('res-qtd').value);
  const desc = document.getElementById('res-desc').value;
  const cupomCodigo = document.getElementById('res-cupom')?.value?.trim();
  const cupomValidade = document.getElementById('res-cupom-val')?.value;
  const hoje = new Date().toISOString().split('T')[0];
  const doCashbackDePontos = p.tipo === 'pontos' && resTipo === 'cashback';
  const tipoSaldo = (p.tipo === 'cashback' || doCashbackDePontos) ? 'cashback' : 'pontos';
  if (!qtd || qtd <= 0) { showAlert('⚠️', 'Informe a quantidade.'); return; }
  if (qtd > resSaldoDe(p, resTipo) + 0.001) { showAlert('⚠️', 'Saldo insuficiente.'); return; }

  if (doCashbackDePontos) {
    p.saldoCashback = Math.max(0, Math.round(((p.saldoCashback || 0) - qtd) * 100) / 100);
    if (!DB.historicoCashback) DB.historicoCashback = {};
    if (!DB.historicoCashback[id]) DB.historicoCashback[id] = [];
    DB.historicoCashback[id].push({ data: hoje, saldo: p.saldoCashback });
  } else {
    p.saldo = Math.max(0, Math.round(((p.saldo || 0) - qtd) * 100) / 100);
    if (!DB.historicoSaldo) DB.historicoSaldo = {};
    if (!DB.historicoSaldo[id]) DB.historicoSaldo[id] = [];
    DB.historicoSaldo[id].push({ data: hoje, saldo: p.saldo });
  }
  if (!DB.resgates) DB.resgates = [];
  DB.resgates.push({ id: gerarId(), programaId: id, quantidade: qtd, tipoSaldo, descricao: desc, data: hoje });
  // Salva cupom se informado
  if (cupomCodigo) {
    if (!p.cupons) p.cupons = [];
    p.cupons.push({
      id: gerarId(),
      codigo: cupomCodigo,
      descricao: desc,
      validade: cupomValidade || null,
      usado: false,
      criadoEm: hoje
    });
  }
  agendarSync();
  fecharModal();
  renderBeneficios();
  showAlert('✅', cupomCodigo ? 'Resgate e cupom salvos!' : 'Resgate registrado!');
}

// ===== VENCIMENTOS (quanto já expirou) =====
function totaisVencidos() {
  const t = { pontos: 0, cashback: 0 };
  (DB.vencimentos || []).forEach(v => { t[tipoSaldoDe(v)] += v.quantidade || 0; });
  t.cashback = Math.round(t.cashback * 100) / 100;
  return t;
}

function textoBotaoVencimentos() {
  const t = totaisVencidos();
  const partes = [];
  if (t.pontos > 0) partes.push(t.pontos.toLocaleString('pt-BR') + ' pts');
  if (t.cashback > 0) partes.push(formatarMoeda(t.cashback));
  return '⏳ Vencimentos' + (partes.length ? ' · ' + partes.join(' · ') : '');
}

function abrirModalVencimentos() {
  if (!DB.vencimentos) DB.vencimentos = [];
  const t = totaisVencidos();
  const lista = DB.vencimentos.slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));
  abrirModal('⏳ Vencimentos — o que já expirou', `
    <div style="display:flex;gap:12px;margin-bottom:16px;">
      <div style="flex:1;background:var(--bg-secondary);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:11px;color:var(--text-secondary);">🎯 Pontos vencidos</div>
        <div style="font-size:20px;font-weight:700;">${t.pontos.toLocaleString('pt-BR')} pts</div>
      </div>
      <div style="flex:1;background:var(--bg-secondary);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:11px;color:var(--text-secondary);">💰 Cashback vencido</div>
        <div style="font-size:20px;font-weight:700;">${formatarMoeda(t.cashback)}</div>
      </div>
    </div>
    <div style="max-height:240px;overflow-y:auto;margin-bottom:16px;">
      ${lista.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;">Nenhum vencimento registrado.</p>' : lista.map(v => {
        const prog = DB.programas.find(p => p.id === v.programaId);
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-secondary);border-radius:8px;margin-bottom:6px;">
          <div style="flex:1;">
            <div style="font-weight:600;font-size:13px;">${prog ? prog.logo + ' ' + prog.nome : '-'} — ${fmtQtd(v.quantidade, tipoSaldoDe(v))}</div>
            <div style="font-size:11px;color:var(--text-secondary);">${formatarData(v.data)}${v.descricao ? ' · ' + v.descricao : ''}</div>
          </div>
          <button onclick="removerVencimento(${v.id})" title="Remover" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;">✕</button>
        </div>`;
      }).join('')}
    </div>
    <div style="border-top:1px solid var(--border);padding-top:14px;">
      <h4 style="font-size:13px;margin-bottom:10px;">+ Registrar vencimento</h4>
      <div class="form-row">
        <div class="form-group">
          <label>Programa</label>
          <select id="venc-prog" onchange="vencProgChange()">
            ${DB.programas.map(p => `<option value="${p.id}">${p.logo} ${p.nome}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Tipo</label>
          <select id="venc-tipo">
            <option value="pontos">🎯 Pontos</option>
            <option value="cashback">💰 Cashback (R$)</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Quantidade / valor</label>
          <input id="venc-qtd" type="number" min="0" step="0.01" placeholder="Ex: 200" />
        </div>
        <div class="form-group">
          <label>Data do vencimento</label>
          <input id="venc-data" type="date" value="${hojeISO()}" />
        </div>
      </div>
      <p style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">Isto só registra o histórico: não altera o saldo do programa.</p>
      <button class="btn-primary btn-sm" onclick="adicionarVencimento()" style="width:100%;">+ Registrar</button>
    </div>
    <div class="modal-actions"><button class="btn-secondary" onclick="fecharModal()">Fechar</button></div>
  `, '520px');
  vencProgChange();
}

function vencProgChange() {
  const p = DB.programas.find(p => p.id === parseInt(document.getElementById('venc-prog')?.value));
  const sel = document.getElementById('venc-tipo');
  if (!p || !sel) return;
  if (p.tipo === 'cashback') { sel.value = 'cashback'; sel.disabled = true; } else { sel.disabled = false; }
}

function adicionarVencimento() {
  const id = parseInt(document.getElementById('venc-prog').value);
  const p = DB.programas.find(p => p.id === id);
  const qtd = parseFloat(document.getElementById('venc-qtd').value);
  const data = document.getElementById('venc-data').value;
  if (!p) return;
  if (!qtd || qtd <= 0) { showAlert('⚠️', 'Informe a quantidade.'); return; }
  if (!data) { showAlert('⚠️', 'Informe a data.'); return; }
  const tipoSaldo = p.tipo === 'cashback' ? 'cashback' : document.getElementById('venc-tipo').value;
  if (!DB.vencimentos) DB.vencimentos = [];
  DB.vencimentos.push({ id: gerarId(), programaId: id, quantidade: qtd, tipoSaldo, descricao: 'Registrado manualmente', data });
  agendarSync();
  abrirModalVencimentos();
  renderBeneficios();
}

function removerVencimento(vid) {
  DB.vencimentos = (DB.vencimentos || []).filter(v => v.id !== vid);
  agendarSync();
  abrirModalVencimentos();
  renderBeneficios();
}

function editarPrograma(id) {
  const p = DB.programas.find(p => p.id === id);
  if (!p) return;
  abrirModal(`⚙️ Editar — ${p.nome}`, `
    <div class="form-row">
      <div class="form-group">
        <label>Nome</label>
        <input id="ed-nome" type="text" value="${p.nome}" />
      </div>
      <div class="form-group">
        <label>Emoji</label>
        <input id="ed-logo" type="text" value="${p.logo}" maxlength="2" />
      </div>
    </div>
    <div class="form-group">
      <label>Categoria</label>
      <select id="ed-categoria">
        <option value="aerea" ${p.categoria==='aerea'?'selected':''}>✈️ Aéreas</option>
        <option value="combustivel" ${p.categoria==='combustivel'?'selected':''}>⛽ Combustível</option>
        <option value="varejo" ${p.categoria==='varejo'?'selected':''}>🛒 Varejo</option>
        <option value="governo" ${p.categoria==='governo'?'selected':''}>🏛️ Governo</option>
        <option value="lifestyle" ${p.categoria==='lifestyle'?'selected':''}>☕ Lifestyle</option>
        <option value="cartao" ${p.categoria==='cartao'?'selected':''}>💳 Cartões</option>
        <option value="outro" ${(!p.categoria||p.categoria==='outro')?'selected':''}>📦 Outros</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Taxa de Conversão (R$ por ponto)</label>
        <input id="ed-taxa" type="number" value="${p.taxaConversao || ''}" placeholder="Ex: 0.017" step="0.001" />
        <small style="color:#999;font-size:11px;">Opcional</small>
      </div>
      <div class="form-group">
        <label>Data de Expiração</label>
        <input id="ed-exp" type="date" value="${p.expiracao || ''}" />
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn-danger" onclick="removerPrograma(${id})">🗑️ Remover</button>
      <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primary" onclick="salvarEdicaoPrograma(${id})">💾 Salvar</button>
    </div>
  `, '480px');
}

function salvarEdicaoPrograma(id) {
  const p = DB.programas.find(p => p.id === id);
  if (!p) return;
  p.nome = document.getElementById('ed-nome').value.trim() || p.nome;
  p.logo = document.getElementById('ed-logo').value || p.logo;
  p.categoria = document.getElementById('ed-categoria').value || 'outro';
  p.taxaConversao = parseFloat(document.getElementById('ed-taxa').value) || null;
  p.expiracao = document.getElementById('ed-exp').value || null;
  agendarSync();
  fecharModal();
  renderBeneficios();
  showAlert('✅', 'Programa atualizado!');
}

function removerPrograma(id) {
  const p = DB.programas.find(p => p.id === id);
  if (!p) return;
  if (confirm(`Remover "${p.nome}"?`)) {
    DB.programas = DB.programas.filter(p => p.id !== id);
    agendarSync();
    fecharModal();
    renderBeneficios();
  }
}

// ===== GRÁFICOS =====
function mostrarGraficos() {
  abrirModal('📊 Dashboard de Gráficos', `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div>
        <h4 style="font-size:13px;color:#666;margin-bottom:8px;">Distribuição por Programa</h4>
        <canvas id="graf-pizza" height="200"></canvas>
      </div>
      <div>
        <h4 style="font-size:13px;color:#666;margin-bottom:8px;">Comparativo de Saldos</h4>
        <canvas id="graf-barras" height="200"></canvas>
      </div>
    </div>
    <div>
      <h4 style="font-size:13px;color:#666;margin-bottom:8px;">Evolução do Saldo — Selecione o programa:</h4>
      <select id="graf-select" onchange="renderGrafLinha()" style="margin-bottom:8px;padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;">
        ${DB.programas.map(p => `<option value="${p.id}">${p.logo} ${p.nome}</option>`).join('')}
      </select>
      <canvas id="graf-linha" height="150"></canvas>
    </div>
  `, '700px');

  setTimeout(() => {
    renderGrafPizza();
    renderGrafBarras();
    renderGrafLinha();
  }, 100);
}

function renderGrafPizza() {
  const el = document.getElementById('graf-pizza');
  if (!el) return;
  const labels = DB.programas.map(p => p.nome);
  const data = DB.programas.map(p => {
    if (p.tipo === 'cashback') return p.saldo || 0;
    if (p.taxaConversao) return (p.saldo || 0) * p.taxaConversao;
    return 0;
  });
  new Chart(el, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: ['#217346','#34a85a','#52c77e','#85e0a3','#b3edcb','#d4f5e0','#e8f8ee','#f0faf4'], borderWidth: 0 }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }
  });
}

function renderGrafBarras() {
  const el = document.getElementById('graf-barras');
  if (!el) return;
  new Chart(el, {
    type: 'bar',
    data: {
      labels: DB.programas.map(p => p.nome.substring(0, 10)),
      datasets: [{ label: 'Saldo', data: DB.programas.map(p => p.saldo || 0), backgroundColor: '#217346', borderRadius: 4 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 10 } } }, y: { ticks: { font: { size: 10 } } } } }
  });
}

function renderGrafLinha() {
  const sel = document.getElementById('graf-select');
  const el = document.getElementById('graf-linha');
  if (!sel || !el) return;
  const id = parseInt(sel.value);
  const historico = (DB.historicoSaldo && DB.historicoSaldo[id]) || [];
  const p = DB.programas.find(p => p.id === id);

  if (window._chartLinha) window._chartLinha.destroy();
  window._chartLinha = new Chart(el, {
    type: 'line',
    data: {
      labels: historico.length > 0 ? historico.map(h => formatarData(h.data)) : ['Sem dados'],
      datasets: [{ label: p?.nome || '', data: historico.length > 0 ? historico.map(h => h.saldo) : [0], borderColor: '#217346', backgroundColor: 'rgba(33,115,70,0.1)', fill: true, tension: 0.4 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 10 } } }, y: { ticks: { font: { size: 10 } } } } }
  });
}

// ===== LOTES DE PONTOS =====
function renderLotesCard(p) {
  if (!p.lotes || p.lotes.length === 0) return '';
  const items = p.lotes.map(l => {
    const dias = Math.ceil((new Date(l.expiracao) - new Date()) / (1000*60*60*24));
    if (l.expiracao < hojeISO()) {
      return '<div style="font-size:11px;color:#999;margin-bottom:2px;" title="Vencido. Ao atualizar o saldo, o app confere a conta e remove este lote.">⛔ ' + l.quantidade.toLocaleString('pt-BR') + ' pts venceram em ' + formatarData(l.expiracao) + ' (há ' + Math.abs(dias) + 'd)</div>';
    }
    const cor = dias <= 7 ? '#ef4444' : dias <= 30 ? '#f59e0b' : '#217346';
    return '<div style="font-size:11px;color:' + cor + ';margin-bottom:2px;">⏰ ' + l.quantidade.toLocaleString('pt-BR') + ' pts vencem em ' + formatarData(l.expiracao) + ' (' + dias + 'd)</div>';
  }).join('');
  return '<div style="margin-top:6px;border-top:1px solid #f0f0f0;padding-top:6px;">' + items + '</div>';
}

function abrirModalLotes(id) {
  const p = DB.programas.find(p => p.id === id);
  if (!p) return;
  if (!p.lotes) p.lotes = [];

  abrirModal(`📦 Lotes de Pontos — ${p.nome}`, `
    <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px;">
      Gerencie lotes de pontos com datas de vencimento diferentes.<br>
      Total: <strong>${(p.saldo || 0).toLocaleString('pt-BR')} pts</strong>
    </p>
    <div id="lotes-lista" style="margin-bottom:16px;">
      ${p.lotes.map((l, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-secondary);border-radius:8px;margin-bottom:8px;">
          <div style="flex:1;">
            <div style="font-weight:600;">${l.quantidade.toLocaleString('pt-BR')} pts</div>
            <div style="font-size:11px;color:var(--text-secondary);">Vence: ${formatarData(l.expiracao)}</div>
          </div>
          <button onclick="removerLote(${id}, ${i})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;">✕</button>
        </div>
      `).join('')}
      ${p.lotes.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;">Nenhum lote cadastrado.</p>' : ''}
    </div>
    <div style="border-top:1px solid var(--border);padding-top:16px;">
      <h4 style="font-size:13px;margin-bottom:12px;">+ Adicionar Lote</h4>
      <div class="form-row">
        <div class="form-group">
          <label>Quantidade (pts)</label>
          <input id="lote-qtd" type="number" placeholder="Ex: 1597" min="1" />
        </div>
        <div class="form-group">
          <label>Data de Vencimento</label>
          <input id="lote-exp" type="date" />
        </div>
      </div>
      <button class="btn-primary btn-sm" onclick="adicionarLote(${id})" style="width:100%;">+ Adicionar Lote</button>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="fecharModal()">Fechar</button>
    </div>
  `, '480px');
}

function adicionarLote(id) {
  const p = DB.programas.find(p => p.id === id);
  if (!p) return;
  const qtd = parseInt(document.getElementById('lote-qtd').value);
  const exp = document.getElementById('lote-exp').value;
  if (!qtd || qtd <= 0) { showAlert('⚠️', 'Informe a quantidade.'); return; }
  if (!exp) { showAlert('⚠️', 'Informe a data de vencimento.'); return; }
  if (!p.lotes) p.lotes = [];
  p.lotes.push({ quantidade: qtd, expiracao: exp });
  p.lotes.sort((a, b) => new Date(a.expiracao) - new Date(b.expiracao));
  agendarSync();
  fecharModal();
  abrirModalLotes(id);
  renderBeneficios();
}

function removerLote(id, idx) {
  const p = DB.programas.find(p => p.id === id);
  if (!p || !p.lotes) return;
  p.lotes.splice(idx, 1);
  agendarSync();
  fecharModal();
  abrirModalLotes(id);
  renderBeneficios();
}

// ===== CUPONS & TICKETS =====
function renderCuponsList(cupons, id) {
  if (!cupons || cupons.length === 0) return '<p style="color:var(--text-muted);font-size:13px;">Nenhum cupom salvo ainda.</p>';
  return cupons.map(function(c, i) {
    const vencido = c.validade && new Date(c.validade) < new Date();
    const borderCor = c.usado ? 'var(--border)' : vencido ? 'var(--red)' : 'var(--green)';
    const opacity = c.usado ? '0.6' : '1';
    const codCor = c.usado ? 'var(--text-muted)' : 'var(--green)';
    const usadoBtn = !c.usado
      ? '<button onclick="marcarCupomUsado(' + id + ',' + i + ')" style="background:var(--green);border:none;color:#000;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">✓ Usado</button>'
      : '<span style="font-size:11px;color:var(--text-muted);">✓ Usado</span>';
    const descDiv = c.descricao ? '<div style="font-size:12px;color:var(--text-secondary);">' + c.descricao + '</div>' : '';
    const valDiv = c.validade ? '<div style="font-size:11px;color:' + (vencido ? 'var(--red)' : 'var(--text-muted)') + ';margin-top:4px;">' + (vencido ? '⚠️ Vencido' : '⏰ Válido até') + ': ' + formatarData(c.validade) + '</div>' : '';
    return '<div style="background:var(--bg-secondary);border:1px solid ' + borderCor + ';border-radius:10px;padding:14px;margin-bottom:10px;opacity:' + opacity + ';">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'
      + '<code style="font-size:15px;font-weight:700;color:' + codCor + ';letter-spacing:2px;background:var(--bg-primary);padding:4px 10px;border-radius:6px;">' + c.codigo + '</code>'
      + '<div style="display:flex;gap:6px;">' + usadoBtn
      + '<button onclick="removerCupom(' + id + ',' + i + ')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;">✕</button>'
      + '</div></div>' + descDiv + valDiv + '</div>';
  }).join('');
}
function abrirModalCupons(id) {
  const p = DB.programas.find(p => p.id === id);
  if (!p) return;
  if (!p.cupons) p.cupons = [];

  abrirModal(`🎟️ Cupons & Tickets — ${p.nome}`, `
    <div style="margin-bottom:16px;">
      ${renderCuponsList(p.cupons, id)}
    </div>
    <div style="border-top:1px solid var(--border);padding-top:16px;">
      <h4 style="font-size:13px;margin-bottom:12px;">+ Adicionar Cupom Manualmente</h4>
      <div class="form-row">
        <div class="form-group">
          <label>Código *</label>
          <input id="novo-cupom-cod" type="text" placeholder="Ex: PROMO2026" style="font-family:monospace;" />
        </div>
        <div class="form-group">
          <label>Validade</label>
          <input id="novo-cupom-val" type="date" />
        </div>
      </div>
      <div class="form-group">
        <label>Descrição</label>
        <input id="novo-cupom-desc" type="text" placeholder="Ex: Desconto passagem aérea" />
      </div>
      <button class="btn-primary btn-sm" onclick="adicionarCupomManual(${id})" style="width:100%;">+ Salvar Cupom</button>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="fecharModal()">Fechar</button>
    </div>
  `, '520px');
}

function adicionarCupomManual(id) {
  const p = DB.programas.find(p => p.id === id);
  if (!p) return;
  const codigo = document.getElementById('novo-cupom-cod')?.value?.trim();
  if (!codigo) { showAlert('⚠️', 'Informe o código do cupom.'); return; }
  if (!p.cupons) p.cupons = [];
  p.cupons.push({
    id: gerarId(),
    codigo,
    descricao: document.getElementById('novo-cupom-desc')?.value || '',
    validade: document.getElementById('novo-cupom-val')?.value || null,
    usado: false,
    criadoEm: new Date().toISOString().split('T')[0]
  });
  agendarSync();
  fecharModal();
  abrirModalCupons(id);
  renderBeneficios();
}

function marcarCupomUsado(programaId, idx) {
  const p = DB.programas.find(p => p.id === programaId);
  if (!p || !p.cupons) return;
  p.cupons[idx].usado = true;
  agendarSync();
  fecharModal();
  abrirModalCupons(programaId);
}

function removerCupom(programaId, idx) {
  const p = DB.programas.find(p => p.id === programaId);
  if (!p || !p.cupons) return;
  if (confirm('Remover este cupom?')) {
    p.cupons.splice(idx, 1);
    agendarSync();
    fecharModal();
    abrirModalCupons(programaId);
    renderBeneficios();
  }
}

// ===== BADGE NO SIDEBAR =====
function atualizarBadgeBeneficios() {
  const hoje = new Date();
  let alertas = 0;

  if (!DB.programas) return;

  DB.programas.forEach(p => {
    // Pontos expirando em 30 dias
    if (p.expiracao) {
      const dias = Math.ceil((new Date(p.expiracao) - hoje) / (1000*60*60*24));
      if (dias <= 30 && dias >= 0) alertas++;
    }
    // Lotes expirando
    if (p.lotes) {
      p.lotes.forEach(l => {
        const dias = Math.ceil((new Date(l.expiracao) - hoje) / (1000*60*60*24));
        if (dias <= 30 && dias >= 0) alertas++;
      });
    }
    // Cupons vencendo
    if (p.cupons) {
      p.cupons.forEach(c => {
        if (!c.usado && c.validade) {
          const dias = Math.ceil((new Date(c.validade) - hoje) / (1000*60*60*24));
          if (dias <= 7 && dias >= 0) alertas++;
        }
      });
    }
  });

  const badge = document.getElementById('badge-beneficios');
  if (badge) {
    badge.style.display = alertas > 0 ? 'inline-flex' : 'none';
    badge.textContent = alertas;
  }
}
