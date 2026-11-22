// ===== ASSINATURAS RECORRENTES =====
// Nasceu de um caso real: duas assinaturas iguais correndo em paralelo por 10 meses
// sem ninguém notar. Por isso a detecção de duplicidade é a função principal daqui,
// não um extra.

const CATEGORIAS_ASSINATURA = {
  'software':  { nome: 'Software e Nuvem', icone: '💻' },
  'midia':     { nome: 'Mídia e Streaming', icone: '🎬' },
  'educacao':  { nome: 'Educação',          icone: '🎓' },
  'servicos':  { nome: 'Serviços',          icone: '🧰' },
  'outro':     { nome: 'Outro',             icone: '📦' }
};

function garantirAssinaturas() {
  if (!DB.assinaturas) DB.assinaturas = [];
  return DB.assinaturas;
}

function assinaturasAtivas() {
  return garantirAssinaturas().filter(a => a.status !== 'cancelada');
}

function totalMensalAssinaturas() {
  return assinaturasAtivas().reduce((s, a) => s + (Number(a.valor) || 0), 0);
}

// Normaliza o nome para comparar fornecedores: "EBN*ADOBEV" e "Adobe (dia 21)" viram "adobe"
function normalizarFornecedor(nome) {
  var t = String(nome || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(ebn|dl|com|br|inc|ltda|sa)\b/g, ' ')
    .trim().split(/\s+/)[0] || '';
  // O Sicoob gruda um "V" no fim do nome do lojista (ADOBEV, 1PASSWORDV, GoogleV);
  // remove esse V final quando ainda sobram 4 ou mais caracteres.
  if (t.length >= 5 && t.charAt(t.length - 1) === 'v') t = t.slice(0, -1);
  return t;
}

// Agrupa assinaturas ativas que parecem ser do mesmo fornecedor
function duplicidadesAssinaturas() {
  const grupos = {};
  assinaturasAtivas().forEach(a => {
    const chave = a.fornecedor ? normalizarFornecedor(a.fornecedor) : normalizarFornecedor(a.nome);
    if (!chave) return;
    (grupos[chave] = grupos[chave] || []).push(a);
  });
  return Object.keys(grupos)
    .filter(k => grupos[k].length > 1)
    .map(k => ({ fornecedor: k, itens: grupos[k], total: grupos[k].reduce((s, a) => s + (Number(a.valor) || 0), 0) }));
}

function proximaCobranca(dia) {
  const d = parseInt(dia, 10);
  if (!(d >= 1 && d <= 31)) return null;
  const hoje = new Date();
  let alvo = new Date(hoje.getFullYear(), hoje.getMonth(), d);
  if (alvo < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) {
    alvo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, d);
  }
  return alvo.toISOString().split('T')[0];
}

function variacaoAssinatura(a) {
  const h = a.historico || [];
  if (h.length < 1) return null;
  const anterior = Number(h[h.length - 1].valor) || 0;
  const atual = Number(a.valor) || 0;
  if (!anterior || anterior === atual) return null;
  return { anterior: anterior, atual: atual, pct: ((atual - anterior) / anterior) * 100 };
}

// ===== PÁGINA =====
function renderAssinaturas() {
  const page = document.getElementById('page-assinaturas');
  if (!page) return;
  garantirAssinaturas();

  const ativas = assinaturasAtivas();
  const mensal = totalMensalAssinaturas();
  const canceladas = DB.assinaturas.filter(a => a.status === 'cancelada');
  const dups = duplicidadesAssinaturas();
  const maior = ativas.slice().sort((a, b) => (b.valor || 0) - (a.valor || 0))[0];

  let html = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px;">
      ${kpiAssinatura('💸', 'Por mês', formatarMoeda(mensal), ativas.length + ' assinatura' + (ativas.length === 1 ? '' : 's') + ' ativa' + (ativas.length === 1 ? '' : 's'))}
      ${kpiAssinatura('📅', 'Por ano', formatarMoeda(mensal * 12), 'se nada mudar')}
      ${kpiAssinatura('🔝', 'Maior', maior ? formatarMoeda(maior.valor) : '—', maior ? maior.nome : 'nenhuma cadastrada')}
      ${kpiAssinatura('🚫', 'Canceladas', String(canceladas.length), canceladas.length ? 'economia de ' + formatarMoeda(canceladas.reduce((s, a) => s + (Number(a.valor) || 0), 0)) + '/mês' : 'nenhuma')}
    </div>`;

  if (dups.length) {
    html += `<div style="background:rgba(239,68,68,0.08);border:1px solid var(--red);border-radius:var(--radius);padding:16px;margin-bottom:20px;">
      <div style="font-weight:700;color:var(--red);margin-bottom:8px;">⚠️ Possível cobrança em duplicidade</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">
        Estas assinaturas ativas parecem ser do mesmo fornecedor. Confirme na conta do fornecedor se há mais de um plano ativo.
      </div>
      ${dups.map(g => `
        <div style="background:var(--bg-secondary);border-radius:8px;padding:12px;margin-bottom:8px;">
          <div style="font-weight:600;margin-bottom:6px;text-transform:capitalize;">${esc(g.fornecedor)} — ${g.itens.length} assinaturas, ${formatarMoeda(g.total)}/mês</div>
          ${g.itens.map(a => `<div style="font-size:12px;color:var(--text-secondary);">• ${esc(a.nome)} — ${formatarMoeda(a.valor)}${a.diaCobranca ? ' · dia ' + a.diaCobranca : ''}${a.cartao ? ' · ' + esc(a.cartao) : ''}</div>`).join('')}
        </div>`).join('')}
    </div>`;
  }

  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="font-size:15px;margin:0;">Assinaturas ativas</h3>
      <button class="btn-primary btn-sm" onclick="abrirModalAssinatura()">+ Nova assinatura</button>
    </div>`;

  if (!ativas.length) {
    html += `<div class="card" style="text-align:center;color:var(--text-muted);padding:32px;">
      Nenhuma assinatura cadastrada. Comece pelas que aparecem na fatura do cartão.
    </div>`;
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:8px;">'
      + ativas.slice().sort((a, b) => (b.valor || 0) - (a.valor || 0)).map(linhaAssinatura).join('')
      + '</div>';
  }

  if (canceladas.length) {
    html += `<details style="margin-top:20px;">
      <summary style="font-size:12px;color:var(--text-secondary);cursor:pointer;">Canceladas (${canceladas.length})</summary>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;opacity:.6;">
        ${canceladas.map(linhaAssinatura).join('')}
      </div>
    </details>`;
  }

  page.innerHTML = html;
}

function kpiAssinatura(icone, rotulo, valor, sub) {
  return `<div class="card card-sm">
    <div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px;">${icone} ${rotulo}</div>
    <div style="font-size:22px;font-weight:700;line-height:1.1;">${esc(valor)}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${esc(sub)}</div>
  </div>`;
}

function linhaAssinatura(a) {
  const cat = CATEGORIAS_ASSINATURA[a.categoria] || CATEGORIAS_ASSINATURA.outro;
  const prox = a.status === 'cancelada' ? null : proximaCobranca(a.diaCobranca);
  const vr = variacaoAssinatura(a);
  const cancelada = a.status === 'cancelada';
  return `<div class="card card-sm" style="display:flex;align-items:center;gap:12px;">
    <div style="font-size:20px;">${cat.icone}</div>
    <div style="flex:1;min-width:0;">
      <div style="font-weight:600;${cancelada ? 'text-decoration:line-through;' : ''}">${esc(a.nome)}</div>
      <div style="font-size:11px;color:var(--text-secondary);">
        ${cat.nome}${a.diaCobranca ? ' · todo dia ' + a.diaCobranca : ''}${a.cartao ? ' · ' + esc(a.cartao) : ''}${prox ? ' · próxima ' + formatarData(prox) : ''}
      </div>
      ${a.observacao ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${esc(a.observacao)}</div>` : ''}
    </div>
    <div style="text-align:right;">
      <div style="font-size:16px;font-weight:700;">${formatarMoeda(a.valor)}</div>
      ${vr ? `<div style="font-size:11px;color:${vr.pct > 0 ? 'var(--red)' : 'var(--green)'};">${vr.pct > 0 ? '▲' : '▼'} ${Math.abs(vr.pct).toFixed(0)}% (era ${formatarMoeda(vr.anterior)})</div>` : ''}
    </div>
    <div style="display:flex;gap:6px;">
      <button class="btn-secondary btn-sm" onclick="abrirModalAssinatura('${a.id}')">Editar</button>
      ${cancelada
        ? `<button class="btn-secondary btn-sm" onclick="reativarAssinatura('${a.id}')">Reativar</button>`
        : `<button class="btn-secondary btn-sm" onclick="cancelarAssinatura('${a.id}')">Cancelar</button>`}
      <button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;" onclick="removerAssinatura('${a.id}')">✕</button>
    </div>
  </div>`;
}

// ===== FORMULÁRIO =====
function abrirModalAssinatura(id) {
  garantirAssinaturas();
  const a = id ? DB.assinaturas.find(x => x.id === id) : null;
  const opcoes = Object.keys(CATEGORIAS_ASSINATURA)
    .map(k => `<option value="${k}" ${a && a.categoria === k ? 'selected' : ''}>${CATEGORIAS_ASSINATURA[k].icone} ${CATEGORIAS_ASSINATURA[k].nome}</option>`).join('');

  abrirModal(a ? 'Editar assinatura' : 'Nova assinatura', `
    <div class="form-group">
      <label>Nome *</label>
      <input id="as-nome" type="text" placeholder="Ex: Adobe Creative Cloud" value="${a ? esc(a.nome) : ''}" />
    </div>
    <div class="form-group">
      <label>Fornecedor (para detectar duplicidade)</label>
      <input id="as-fornecedor" type="text" placeholder="Ex: Adobe — deixe em branco para usar o nome" value="${a && a.fornecedor ? esc(a.fornecedor) : ''}" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Valor mensal (R$) *</label>
        <input id="as-valor" type="number" step="0.01" min="0" placeholder="189,00" value="${a ? (a.valor || '') : ''}" />
      </div>
      <div class="form-group">
        <label>Dia da cobrança</label>
        <input id="as-dia" type="number" min="1" max="31" placeholder="21" value="${a && a.diaCobranca ? a.diaCobranca : ''}" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Categoria</label>
        <select id="as-categoria">${opcoes}</select>
      </div>
      <div class="form-group">
        <label>Cartão / meio de pagamento</label>
        <input id="as-cartao" type="text" placeholder="Ex: Sicoob final 2812" value="${a && a.cartao ? esc(a.cartao) : ''}" />
      </div>
    </div>
    <div class="form-group">
      <label>Observação</label>
      <input id="as-obs" type="text" placeholder="Ex: cobrança internacional, gera IOF" value="${a && a.observacao ? esc(a.observacao) : ''}" />
    </div>
    ${a && a.historico && a.historico.length ? `
    <div style="background:var(--bg-secondary);border-radius:8px;padding:10px;margin-bottom:14px;">
      <div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px;">Histórico de valores</div>
      ${a.historico.map(h => `<div style="font-size:12px;">${formatarData(h.data)} — ${formatarMoeda(h.valor)}</div>`).join('')}
    </div>` : ''}
    <div class="modal-actions" style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primary" onclick="salvarAssinatura(${a ? `'${a.id}'` : 'null'})">Salvar</button>
    </div>
  `, '520px');
}

function salvarAssinatura(id) {
  garantirAssinaturas();
  const nome = document.getElementById('as-nome').value.trim();
  const valor = parseFloat(document.getElementById('as-valor').value) || 0;
  if (!nome) { showAlert('⚠️', 'Informe o nome da assinatura.'); return; }
  if (valor <= 0) { showAlert('⚠️', 'Informe o valor mensal.'); return; }

  const dados = {
    nome: nome,
    fornecedor: document.getElementById('as-fornecedor').value.trim(),
    valor: valor,
    diaCobranca: document.getElementById('as-dia').value || null,
    categoria: document.getElementById('as-categoria').value,
    cartao: document.getElementById('as-cartao').value.trim(),
    observacao: document.getElementById('as-obs').value.trim()
  };

  const existente = id ? DB.assinaturas.find(x => x.id === id) : null;
  if (existente) {
    // valor mudou? guarda o anterior para mostrar o reajuste
    if (Number(existente.valor) !== valor) {
      existente.historico = existente.historico || [];
      existente.historico.push({ data: hojeISO(), valor: Number(existente.valor) || 0 });
    }
    Object.assign(existente, dados);
  } else {
    DB.assinaturas.push(Object.assign({
      id: String(gerarId()), status: 'ativa', inicio: hojeISO(), historico: []
    }, dados));
  }

  agendarSync();
  fecharModal();
  renderAssinaturas();

  const dups = duplicidadesAssinaturas();
  if (dups.some(g => g.itens.some(x => x.nome === nome))) {
    showAlert('⚠️', 'Atenção: já existe outra assinatura ativa do mesmo fornecedor. Confirme se os dois planos são mesmo necessários.');
  }
}

function cancelarAssinatura(id) {
  const a = garantirAssinaturas().find(x => x.id === id);
  if (!a) return;
  a.status = 'cancelada';
  a.canceladaEm = hojeISO();
  agendarSync();
  renderAssinaturas();
  showAlert('✅', 'Marcada como cancelada. Economia de ' + formatarMoeda(a.valor) + ' por mês — confirme o cancelamento no site do fornecedor.');
}

function reativarAssinatura(id) {
  const a = garantirAssinaturas().find(x => x.id === id);
  if (!a) return;
  a.status = 'ativa';
  delete a.canceladaEm;
  agendarSync();
  renderAssinaturas();
}

function removerAssinatura(id) {
  const a = garantirAssinaturas().find(x => x.id === id);
  if (!a) return;
  if (!confirm('Remover "' + a.nome + '" de vez? Para apenas parar de contar, use Cancelar.')) return;
  DB.assinaturas = DB.assinaturas.filter(x => x.id !== id);
  agendarSync();
  renderAssinaturas();
}
