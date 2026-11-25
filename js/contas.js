// ===== CONTAS RECORRENTES =====
const CONCESSIONARIAS = {
  copel:     { nome: 'Copel',       logo: '⚡', cor: '#f5821e', unidade: 'KWh' },
  sanepar:   { nome: 'Sanepar',     logo: '💧', cor: '#0066CC', unidade: 'm³'  },
  inova:     { nome: 'Inova Fibra', logo: '🌐', cor: '#e63946', unidade: null  },
  sercomtel: { nome: 'Sercomtel',   logo: '📞', cor: '#2d6a4f', unidade: null  },
  outro:     { nome: 'Outro',       logo: '📄', cor: '#666',    unidade: null  }
};

if (!DB.faturas) DB.faturas = [];
if (!DB.unidadesConsumidoras) DB.unidadesConsumidoras = [
  { id: 1, apelido: 'Casa do Meio', tipo: 'copel', ucAneel: '189811103131', ucAntiga: '47443162(B)', titular: 'Margarida Trujilio', ativa: true,  obs: 'Inclui consumo da edícula (gato)' },
  { id: 2, apelido: 'Salão Comercial', tipo: 'copel', ucAneel: '77229603141', ucAntiga: '', titular: '', ativa: false, obs: 'Desativado' },
  { id: 3, apelido: 'Edícula',      tipo: 'copel', ucAneel: '77229503156',  ucAntiga: '', titular: '', ativa: false, obs: 'Sem fatura - gato na casa do meio' },
];

// ===== CONTAS RECORRENTES (visão geral) =====
function renderContas() {
  const page = document.getElementById('page-contas');
  const hoje = new Date();
  const faturasMes = DB.faturas.filter(f => {
    const d = new Date(f.vencimento);
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  });
  const totalMes = faturasMes.reduce((s, f) => s + (f.valorPagar || f.valor || 0), 0);
  const atrasadas = DB.faturas.filter(f => !f.pago && new Date(f.vencimento) < hoje);

  // Define cor do card total baseado no status
  const corTotal = atrasadas.length > 0
    ? 'linear-gradient(135deg,#7f1d1d,#991b1b)'
    : faturasMes.filter(f => !f.pago).length > 0
      ? 'linear-gradient(135deg,#713f12,#92400e)'
      : 'linear-gradient(135deg,#166534,#15803d)';

  const corBorda = atrasadas.length > 0 ? '#ef444444' : faturasMes.filter(f => !f.pago).length > 0 ? '#eab30844' : '#22c55e44';

  page.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;">
      <div style="background:${corTotal};border:1px solid ${corBorda};border-radius:10px;padding:20px;">
        <div style="font-size:12px;color:#fff;opacity:0.8;margin-bottom:4px;">📅 Total este Mês</div>
        <div style="font-size:26px;font-weight:700;color:#fff;">${formatarMoeda(totalMes)}</div>
        <div style="font-size:11px;color:#fff;opacity:0.7;margin-top:4px;">${atrasadas.length > 0 ? '⚠️ ' + atrasadas.length + ' atrasada(s)' : faturasMes.filter(f => !f.pago).length > 0 ? '⏳ Pendentes' : '✅ Tudo pago'}</div>
      </div>
      <div class="indicator-card">
        <div class="ic-icon">📋</div>
        <div class="ic-label">Faturas este Mês</div>
        <div class="ic-value">${faturasMes.length}</div>
      </div>
      <div class="indicator-card">
        <div class="ic-icon">⚠️</div>
        <div class="ic-label">Atrasadas</div>
        <div class="ic-value red">${atrasadas.length}</div>
      </div>
      <div class="indicator-card">
        <div class="ic-icon">🏠</div>
        <div class="ic-label">Unid. Consumidoras</div>
        <div class="ic-value">${DB.unidadesConsumidoras.filter(u => u.ativa).length}</div>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
      <button onclick="abrirModalNovaFatura('copel')" style="background:linear-gradient(135deg,#f5821e,#e06b08);color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(245,130,30,0.4);">⚡ Nova Fatura Copel</button>
      <button onclick="abrirModalNovaFatura('sanepar')" style="background:linear-gradient(135deg,#0066CC,#0052a3);color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,102,204,0.4);">💧 Nova Fatura Sanepar</button>
      <button onclick="abrirModalNovaFatura('inova')" style="background:linear-gradient(135deg,#F5A623,#00B4D8);color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,180,216,0.4);">🌐 Nova Fatura Inova</button>
      <button onclick="abrirModalNovaFatura('sercomtel')" style="background:linear-gradient(135deg,#1a5276,#154360);color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(26,82,118,0.4);">📞 Sercomtel</button>
      <button class="btn-secondary" onclick="abrirModalNovaFatura('outro')">📄 Outra</button>
      <button class="btn-secondary" onclick="abrirModalUnidades()">🏠 Unidades Consumidoras</button>
    </div>

    <div class="card">
      <div class="section-header">
        <h3>📋 Todas as Faturas</h3>
        <div style="display:flex;gap:8px;">
          <select class="filter" onchange="filtrarFaturas('tipo',this.value)">
            <option value="">Todas</option>
            <option value="copel">⚡ Copel</option>
            <option value="sanepar">💧 Sanepar</option>
            <option value="inova">🌐 Inova</option>
            <option value="sercomtel">📞 Sercomtel</option>
          </select>
          <select class="filter" onchange="filtrarFaturas('status',this.value)">
            <option value="">Todos Status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="atrasado">Atrasado</option>
          </select>
        </div>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Concessionária</th><th>Referência</th><th>Vencimento</th>
            <th>Consumo</th><th>Valor Original</th><th>Desconto</th>
            <th>Valor a Pagar</th><th>Status</th><th>Ações</th>
          </tr></thead>
          <tbody id="tabela-faturas">${renderTabelaFaturas()}</tbody>
        </table>
      </div>
    </div>
    <!-- Gráfico + Próximos Vencimentos -->
    <div style="display:grid;grid-template-columns:1fr 320px;gap:16px;margin-top:16px;">
      <div class="chart-card">
        <h3>Gastos por Concessionária</h3>
        <canvas id="chart-gastos-conc" height="160"></canvas>
      </div>
      <div class="card">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">📅 Próximos Vencimentos</h3>
        <div id="proximos-vencimentos-list"></div>
      </div>
    </div>
  `;

  setTimeout(() => {
    renderGastosConc();
    renderProximosVencimentos();
  }, 100);
}

let filtroContaTipo = '', filtroContaStatus = '';
function filtrarFaturas(tipo, valor) {
  if (tipo === 'tipo') filtroContaTipo = valor;
  if (tipo === 'status') filtroContaStatus = valor;
  document.getElementById('tabela-faturas').innerHTML = renderTabelaFaturas();
}

function renderGastosConc() {
  const el = document.getElementById('chart-gastos-conc');
  if (!el) return;

  const totais = {};
  DB.faturas.forEach(f => {
    const conc = CONCESSIONARIAS[f.tipo] || CONCESSIONARIAS.outro;
    if (!totais[conc.nome]) totais[conc.nome] = { valor: 0, cor: conc.cor };
    totais[conc.nome].valor += f.valorPagar || f.valor || 0;
  });

  if (Object.keys(totais).length === 0) return;

  new Chart(el, {
    type: 'bar',
    data: {
      labels: Object.keys(totais),
      datasets: [{
        data: Object.values(totais).map(t => t.valor),
        backgroundColor: Object.values(totais).map(t => t.cor),
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: coresGrafico().textoFraco, font: { size: 11 } }, grid: { color: coresGrafico().grade } },
        y: { ticks: { color: coresGrafico().textoFraco, callback: v => 'R$' + v }, grid: { color: coresGrafico().grade } }
      }
    }
  });
}

function renderProximosVencimentos() {
  const el = document.getElementById('proximos-vencimentos-list');
  if (!el) return;

  const hoje = new Date();
  const proximas = DB.faturas
    .filter(f => !f.pago)
    .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento))
    .slice(0, 5);

  if (proximas.length === 0) {
    el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">Nenhum vencimento próximo.</div>';
    return;
  }

  el.innerHTML = proximas.map(f => {
    const conc = CONCESSIONARIAS[f.tipo] || CONCESSIONARIAS.outro;
    const dias = Math.ceil((new Date(f.vencimento) - hoje) / (1000*60*60*24));
    const atrasado = dias < 0;
    const cor = atrasado ? 'var(--red)' : dias <= 3 ? '#f97316' : 'var(--border)';
    return '<div style="background:var(--bg-secondary);border:1px solid ' + cor + ';border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">'
      + '<div>'
      + '<div style="font-weight:600;font-size:13px;">' + conc.logo + ' ' + conc.nome + '</div>'
      + '<div style="font-size:11px;color:var(--text-secondary);">' + formatarData(f.vencimento) + '</div>'
      + '</div>'
      + '<div style="text-align:right;">'
      + '<div style="font-weight:700;font-size:13px;">' + formatarMoeda(f.valorPagar || f.valor) + '</div>'
      + '<div style="font-size:10px;color:' + (atrasado ? 'var(--red)' : dias <= 3 ? '#f97316' : 'var(--text-muted)') + ';">' + (atrasado ? '⚠️ ' + Math.abs(dias) + 'd atraso' : dias === 0 ? '⏰ Hoje!' : dias + 'd') + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}

function getStatusFatura(f) {
  if (f.pago) return 'pago';
  if (new Date(f.vencimento) < new Date()) return 'atrasado';
  return 'pendente';
}

function renderTabelaFaturas() {
  let faturas = [...DB.faturas].sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento));
  if (filtroContaTipo) faturas = faturas.filter(f => f.tipo === filtroContaTipo);
  if (filtroContaStatus) faturas = faturas.filter(f => getStatusFatura(f) === filtroContaStatus);
  if (faturas.length === 0) return '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">📄</div><p>Nenhuma fatura cadastrada.</p></div></td></tr>';

  return faturas.map(f => {
    const conc = CONCESSIONARIAS[f.tipo] || CONCESSIONARIAS.outro;
    const status = getStatusFatura(f);
    const dias = status === 'atrasado' ? Math.floor((new Date() - new Date(f.vencimento)) / (1000*60*60*24)) : 0;
    return '<tr>'
      + '<td>' + conc.logo + ' <strong>' + conc.nome + '</strong>' + (f.apelido ? '<br><span style="font-size:11px;color:var(--text-secondary);">' + f.apelido + '</span>' : '') + '</td>'
      + '<td>' + (f.referencia || '-') + '</td>'
      + '<td>' + formatarData(f.vencimento) + (dias > 0 ? '<br><span style="color:var(--red);font-size:11px;">' + dias + 'd atraso</span>' : '') + '</td>'
      + '<td>' + (f.consumo ? f.consumo + ' ' + (conc.unidade || '') : '-') + '</td>'
      + '<td>' + formatarMoeda(f.valor) + '</td>'
      + '<td style="color:var(--green)">' + (f.desconto ? '- ' + formatarMoeda(f.desconto) : '-') + '</td>'
      + '<td><strong>' + formatarMoeda(f.valorPagar || f.valor) + '</strong></td>'
      + '<td><span class="badge ' + status + '">' + status.charAt(0).toUpperCase() + status.slice(1) + '</span></td>'
      + '<td><div style="display:flex;gap:4px;">'
      + '<button class="btn-secondary btn-sm" onclick="verDetalhesFatura(' + f.id + ')" title="Ver detalhes">👁️</button>'
      + (!f.pago ? '<button class="btn-primary btn-sm" onclick="marcarFaturaPaga(' + f.id + ')">✅</button>' : '')
      + '<button class="btn-danger btn-sm" onclick="excluirFatura(' + f.id + ')">🗑️</button>'
      + '</div></td></tr>';
  }).join('');
}

// ===== MODAL NOVA FATURA (SIMPLIFICADO) =====
function abrirModalNovaFatura(tipo) {
  const conc = CONCESSIONARIAS[tipo];
  abrirModal(conc.logo + ' Nova Fatura — ' + conc.nome, `
    <input type="hidden" id="fatura-tipo" value="${tipo}" />
    <div style="margin-bottom:16px;padding:12px;background:var(--bg-primary);border:1px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:13px;color:var(--text-secondary);">📎 Importar dados automaticamente do PDF</span>
      <button onclick="importarPDF('${tipo}')" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);padding:8px 16px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">📎 Selecionar PDF</button>
    </div>
    ${tipo === 'sanepar' ? formFolhaSanepar() : `${formBasico(tipo)}
    <details style="margin-bottom:16px;">
      <summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--text-secondary);padding:10px;background:var(--bg-primary);border-radius:8px;">
        + Detalhes (opcional)
      </summary>
      <div style="margin-top:12px;">
        ${formDetalhes(tipo)}
      </div>
    </details>`}
    <div class="modal-actions">
      <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primary" onclick="salvarFatura()">💾 Salvar Fatura</button>
    </div>
  `, tipo === 'sanepar' ? '720px' : '640px');

  if (tipo === 'sanepar') iniciarFolhaSanepar();

  if (tipo === 'copel') {
    const sel = document.getElementById('fatura-uc');
    if (sel) DB.unidadesConsumidoras.filter(u => u.tipo === 'copel').forEach(u => {
      const o = document.createElement('option');
      o.value = u.id; o.textContent = u.apelido + ' (' + u.ucAneel + ')';
      sel.appendChild(o);
    });
  }
}

function formBasico(tipo) {
  const conc = CONCESSIONARIAS[tipo];
  return `
    <div class="form-row">
      <div class="form-group">
        <label>Mês de Referência *</label>
        <input id="fatura-referencia" type="month" />
      </div>
      <div class="form-group">
        <label>Vencimento *</label>
        <input id="fatura-vencimento" type="date" ${tipo === 'inova' ? 'onchange="calcularPrazoInova()"' : ''} />
      </div>
    </div>
    ${tipo === 'copel' ? '<div class="form-group"><label>Unidade Consumidora</label><select id="fatura-uc"><option value="">Selecionar...</option></select></div>' : ''}
    <div class="form-row">
      <div class="form-group">
        <label>Valor Original (R$) *</label>
        <input id="fatura-valor" type="text" oninput="formatMoney(this);calcularValorPagar()" style="font-size:15px;font-weight:700;" />
      </div>
      ${tipo === 'inova' ? `
      <div class="form-group">
        <label>Desconto até Vencimento (R$)</label>
        <input id="fatura-desconto" type="text" oninput="formatMoney(this);calcularValorPagar()" style="color:var(--green);" />
      </div>` : '<div class="form-group"><label>Desconto (R$)</label><input id="fatura-desconto" type="text" oninput="formatMoney(this);calcularValorPagar()" style="color:var(--green);" /></div>'}
    </div>
    <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:13px;color:var(--text-secondary);">💰 Valor a pagar:</span>
      <span id="valor-pagar-preview" style="font-size:20px;font-weight:700;color:var(--text-primary);">R$ 0,00</span>
    </div>
    ${conc.unidade ? `
    <div class="form-row">
      <div class="form-group">
        <label>Consumo (${conc.unidade}) *</label>
        <input id="fatura-consumo" type="number" min="0" />
      </div>
      <div class="form-group">
        <label>Nº Dias</label>
        <input id="fatura-dias" type="number" />
      </div>
    </div>` : ''}
    <div class="form-group">
      <label>🧾 Nº NF para Cashback (Nota Paraná / Dinheiro na Nota)</label>
      <input id="fatura-nf-cashback" type="text" />
    </div>
    <div class="form-group">
      <label>Observações</label>
      <textarea id="fatura-obs" style="min-height:60px;"></textarea>
    </div>
  `;
}

function formDetalhes(tipo) {
  if (tipo === 'copel') return `
    <h4 style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;">⚡ Valores Cobrados a Mais</h4>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
      ${['Multa por Atraso','Juros Conta Anterior','Acréscimo Moratório','Cont. Ilum. Pública','Energia Cons. B.Amarela','Uso Sistema'].map((s,i) =>
        '<div class="form-group"><label style="font-size:11px;">' + s + '</label><input type="text" id="cop-extra-' + i + '" oninput="formatMoney(this)" /></div>'
      ).join('')}
    </div>
    <h4 style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;">📊 Leituras</h4>
    <div class="form-row">
      <div class="form-group">
        <label>Medidor</label>
        <input id="cop-medidor" type="text" />
      </div>
      <div class="form-group">
        <label>Leitura Anterior (KWh)</label>
        <input id="cop-leit-ant" type="number" oninput="calcularConsumo()" />
      </div>
      <div class="form-group">
        <label>Leitura Atual (KWh)</label>
        <input id="cop-leit-atual" type="number" oninput="calcularConsumo()" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Banda Tarifária</label>
        <select id="cop-banda">
          <option value="" selected></option>
          <option value="Verde">🟢 Verde</option>
          <option value="Amarela">🟡 Amarela</option>
          <option value="Vermelha 1">🔴 Vermelha 1</option>
          <option value="Vermelha 2">🔴 Vermelha 2</option>
        </select>
      </div>
      <div class="form-group">
        <label>Próxima Leitura</label>
        <input id="cop-prox-leit" type="date" />
      </div>
      <div class="form-group">
        <label>Classificação</label>
        <input id="cop-classif" type="text" />
      </div>
    </div>
    <h4 style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;">🧾 Nota Fiscal</h4>
    <div class="form-row">
      <div class="form-group">
        <label>Nº Nota Fiscal</label>
        <input id="cop-nf" type="text" />
      </div>
      <div class="form-group">
        <label>Chave de Acesso</label>
        <input id="cop-chave" type="text" style="font-family:monospace;font-size:11px;" />
      </div>
    </div>
    <div class="form-group">
      <label>Linha Digitável</label>
      <input id="cop-linha-dig" type="text" style="font-family:monospace;font-size:11px;" />
    </div>
  `;

  if (tipo === 'inova') return `
    <div class="form-row">
      <div class="form-group">
        <label>Período do Serviço</label>
        <input id="inova-periodo" type="text" />
      </div>
      <div class="form-group">
        <label>Contrato</label>
        <input id="inova-contrato" type="text" />
      </div>
    </div>
    <div class="form-group">
      <label>Prazo Máximo (28 dias após vencimento)</label>
      <input id="inova-prazo-max" type="date" readonly style="opacity:0.7;" />
    </div>
    <div class="form-group">
      <label>PIX Copia e Cola</label>
      <textarea id="inova-pix" style="font-family:monospace;font-size:11px;min-height:60px;"></textarea>
    </div>
    <div class="form-group">
      <label>Linha Digitável</label>
      <input id="inova-linha-dig" type="text" style="font-family:monospace;font-size:11px;" />
    </div>
  `;

  if (tipo === 'sercomtel') return `
    <div class="form-row">
      <div class="form-group">
        <label>Nº da Fatura</label>
        <input id="sercom-nr" type="text" />
      </div>
      <div class="form-group">
        <label>Linha Digitável</label>
        <input id="sercom-linha" type="text" style="font-family:monospace;" />
      </div>
    </div>
  `;

  return '';
}

// ===== CÁLCULOS =====
function calcularValorPagar() {
  const orig = parseMoney(document.getElementById('fatura-valor')?.value) || 0;
  const desc = parseMoney(document.getElementById('fatura-desconto')?.value) || 0;
  const final = Math.max(0, orig - desc);
  const el = document.getElementById('valor-pagar-preview');
  if (el) el.textContent = formatarMoeda(final);
}

function calcularConsumo() {
  const ant = parseFloat(document.getElementById('cop-leit-ant')?.value) || 0;
  const atual = parseFloat(document.getElementById('cop-leit-atual')?.value) || 0;
  if (ant && atual && atual > ant) {
    const el = document.getElementById('fatura-consumo');
    if (el) el.value = atual - ant;
  }
}

function calcularConsumoSan() {
  const ant = parseFloat(document.getElementById('san-leit-ant')?.value) || 0;
  const atual = parseFloat(document.getElementById('san-leit-atual')?.value) || 0;
  if (ant && atual && atual > ant) {
    const el = document.getElementById('fatura-consumo');
    if (el) el.value = atual - ant;
  }
}

function calcularPrazoInova() {
  const venc = document.getElementById('fatura-vencimento')?.value;
  if (venc) {
    const prazo = new Date(venc);
    prazo.setDate(prazo.getDate() + 28);
    const el = document.getElementById('inova-prazo-max');
    if (el) el.value = prazo.toISOString().split('T')[0];
  }
}

// ===== FOLHA SANEPAR (mesmo arranjo das células da fatura impressa) =====
const SAN_MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const SAN_QA_COLS = ['Turbidez','Cor','Cloro','Flúor','Coliformes Totais'];
const SAN_QA_LINHAS = ['Nº mínimo de amostras exigidas','Nº amostras realizadas','Nº amostras que atenderam à legislação'];
const SAN_FAIXAS_PADRAO = ['', '', '', '', ''];

// datas digitadas como na fatura (dd/mm/aaaa e mm/aaaa) <-> formato interno (ISO)
function sanBrParaISO(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '');
  if (!m) return '';
  const iso = m[3] + '-' + m[2] + '-' + m[1];
  const d = new Date(iso + 'T12:00:00');
  return !isNaN(d) && d.toISOString().slice(0, 10) === iso ? iso : '';
}
function sanISOParaBr(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
}
function sanRefParaISO(s) {
  const m = /^(\d{2})\/(\d{4})$/.exec(s || '');
  return m && +m[1] >= 1 && +m[1] <= 12 ? m[2] + '-' + m[1] : '';
}
function sanISOParaRef(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(iso || '');
  return m ? m[2] + '/' + m[1] : '';
}
function sanMascaraData(el) {
  const d = el.value.replace(/\D/g, '').slice(0, 8);
  el.value = d.length > 4 ? d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4) : d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  calcularSan();
}
function sanMascaraRef(el) {
  const d = el.value.replace(/\D/g, '').slice(0, 6);
  el.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  if (el.value.length === 7) sanPreencherMesesHist();
  calcularSan();
}

// os 11 meses que a fatura mostra no histórico de consumo são os anteriores à referência
function sanPreencherMesesHist() {
  const ref = sanRefParaISO(document.getElementById('fatura-referencia')?.value);
  if (!ref) return;
  const cels = [...document.querySelectorAll('.san-hm')];
  if (cels.some(c => c.value)) return;
  let ano = +ref.slice(0, 4), mes = +ref.slice(5, 7);
  for (let i = cels.length - 1; i >= 0; i--) {
    mes--; if (mes === 0) { mes = 12; ano--; }
    cels[i].value = String(mes).padStart(2, '0') + '/' + String(ano).slice(2);
  }
}

function formFolhaSanepar() {
  const anoAtual = new Date().getFullYear();
  const cel = (label, inner, cls) => '<div class="fol-c' + (cls ? ' ' + cls : '') + '"><label>' + label + '</label>' + inner + '</div>';
  const qa = '<div class="fol-th">Qualidade da água distribuída</div>' + SAN_QA_COLS.map(c => '<div class="fol-th ctr">' + c + '</div>').join('')
    + SAN_QA_LINHAS.map((l, i) => '<div class="fol-c"><label style="text-transform:none;font-size:8.5px;">' + l + '</label></div>'
      + SAN_QA_COLS.map((c, j) => '<div class="fol-c"><input class="san-qa-' + i + ' ctr" data-j="' + j + '" inputmode="numeric" /></div>').join('')).join('');
  const hp = '<div class="fol-th ctr">Ano</div>' + SAN_MESES.map(m => '<div class="fol-th ctr">' + m + '</div>').join('')
    + [anoAtual - 1, anoAtual].map(a => '<div class="fol-c" style="padding:1px 2px;"><input class="san-hp-ano ctr" style="font-size:11px;" /></div>'
      + SAN_MESES.map(() => '<div class="fol-c" style="padding:1px 0;"><select class="san-hp-m">'
        + ['', 'PAGO', 'X', '---'].map(o => '<option>' + o + '</option>').join('') + '</select></div>').join('')).join('');
  const hist = Array.from({ length: 11 }, (_, i) => '<div class="fol-c" style="padding:1px 2px;"><input class="san-hm ctr" style="font-size:9px;color:var(--fol-lbl);" maxlength="5" />'
    + '<input class="san-hv ctr b" type="number" min="0" /></div>').join('');

  return `
    <div class="fol">
      <div class="fol-title">CONTA</div>
      <div class="fol-grid" style="grid-template-columns:1fr 150px;">
        ${cel('Nome do cliente', '<input id="san-nome" />', 'hl')}
        ${cel('Matrícula', '<input id="san-matricula" class="r big" oninput="calcularSan()" />', 'hl')}
      </div>
      <div class="fol-grid" style="grid-template-columns:2.2fr .7fr 1.1fr;">
        ${cel('Endereço', '<textarea id="san-endereco" rows="2"></textarea>')}
        ${cel('Número', '<input id="san-numero" />')}
        ${cel('Nº lado · Nº frente', '<input id="san-lado" />')}
      </div>
      <div class="fol-grid" style="grid-template-columns:130px 1fr;">
        ${cel('CEP', '<input id="san-cep" />')}
        ${cel('Local', '<input id="san-local" />')}
      </div>
      <div class="fol-grid" style="grid-template-columns:1.25fr 1.2fr 1.3fr;">
        ${cel('Roteiro de leitura', '<input id="san-roteiro" />')}
        ${cel('Hidrômetro', '<input id="san-hidrometro" />')}
        ${cel('CAT · RES · COM · IND · UTP · POP', '<input id="san-categoria" />')}
      </div>

      <div class="fol-scroll fol-sp"><div class="fol-grid" style="grid-template-columns:1.7fr repeat(5,.75fr);">${qa}</div></div>
      <div class="fol-grid fol-join" style="grid-template-columns:70px 1fr;">
        <div class="fol-th">Conclusão</div>
        <div class="fol-c" style="padding:1px 6px;"><input id="san-qa-conclusao" class="nc" /></div>
      </div>

      <span class="fol-cap">Histórico de pagamentos</span>
      <div class="fol-scroll"><div class="fol-grid" style="grid-template-columns:44px repeat(12,1fr);">${hp}</div></div>

      <div class="fol-plain fol-serv">
        <div class="hd"><span>DESCRIÇÃO DOS SERVIÇOS LANÇADOS</span><span style="text-align:right;">VALORES</span><span></span></div>
        <div id="san-serv-lista"></div>
        <button type="button" class="fol-add" onclick="sanAddServico()">+ linha</button>
      </div>

      <div class="fol-plain fol-fx">
        <div class="hd" style="grid-template-columns:1.5fr .55fr .8fr 1.7fr 22px;"><span>FAIXAS DE CONSUMO</span><span class="r">VOLUME</span><span class="r">VALOR M3/R$</span><span style="text-align:center;">TOTAIS</span><span></span></div>
        <div class="hd" style="font-weight:400;color:var(--text-secondary);"><span></span><span></span><span class="r">ÁGUA</span><span class="r">ÁGUA</span><span class="r">ESGOTO</span><span></span></div>
        <div id="san-faixas-lista"></div>
        <button type="button" class="fol-add" onclick="sanAddFaixa()">+ faixa</button>
      </div>

      <span class="fol-cap" style="margin-top:12px;">Histórico de consumo/m³</span>
      <div class="fol-scroll"><div class="fol-grid" style="grid-template-columns:repeat(11,1fr);">${hist}</div></div>

      <div class="fol-grid fol-sp" style="grid-template-columns:.8fr 1.2fr 1fr 1fr .9fr 1.2fr;">
        ${cel('Dias de consumo', '<input id="fatura-dias" type="number" class="ctr" />')}
        ${cel('Data leitura', '<input id="san-data-leit" class="ctr" maxlength="10" oninput="sanMascaraData(this)" />')}
        ${cel('Leitura anterior', '<input id="san-leit-ant" type="number" class="ctr" oninput="calcularConsumoSan();calcularSan()" />')}
        ${cel('Leitura atual', '<input id="san-leit-atual" type="number" class="ctr" oninput="calcularConsumoSan();calcularSan()" />')}
        ${cel('Consumo/m³', '<input id="fatura-consumo" type="number" min="0" class="ctr" oninput="calcularSan()" />')}
        ${cel('Referência *', '<input id="fatura-referencia" class="r b" maxlength="7" oninput="sanMascaraRef(this)" />', 'hl')}
      </div>
      <div class="fol-grid fol-join" style="grid-template-columns:2fr 1.5fr 1.3fr;">
        ${cel('Motivo da ausência de leitura', '<input id="san-motivo" />')}
        ${cel('Média de consumo/m³ últimos 5 meses', '<input id="san-media" type="number" class="ctr" />')}
        ${cel('Vencimento *', '<input id="fatura-vencimento" class="r b" maxlength="10" oninput="sanMascaraData(this)" />', 'hl')}
      </div>
      <div class="fol-grid fol-join" style="grid-template-columns:1.25fr 1fr 1fr 1fr 1.3fr;">
        ${cel('Previsão próxima leitura', '<input id="san-prox-leit" maxlength="10" oninput="sanMascaraData(this)" />')}
        ${cel('Água', '<input id="san-valor-agua" class="ctr" oninput="calcularSan()" />')}
        ${cel('Esgoto', '<input id="san-valor-esgoto" class="ctr" oninput="calcularSan()" />')}
        ${cel('Serviços', '<input id="san-valor-serv" class="ctr" oninput="calcularSan()" />')}
        ${cel('Total *', '<input id="fatura-valor" class="r big" oninput="calcularSan()" />', 'hl')}
      </div>

      <textarea id="san-mensagens" class="fol-msgs" rows="3"></textarea>
      <div class="fol-trib">TRIBUTOS FEDERAIS - LEI 12.741 - VALOR APROXIMADO R$ <input id="san-tributos" /></div>

      <div class="fol-cut"></div>
      <div class="fol-grid" style="grid-template-columns:1.2fr 1fr 1.1fr 1.1fr;">
        ${cel('Matrícula', '<div class="fol-ro" id="san-dm-mat">—</div>')}
        ${cel('Referência', '<div class="fol-ro" id="san-dm-ref">—</div>')}
        ${cel('Vencimento', '<div class="fol-ro" id="san-dm-venc">—</div>')}
        ${cel('Valor', '<div class="fol-ro b" id="san-dm-valor">—</div>')}
      </div>
      <div class="fol-grid fol-join" style="grid-template-columns:1fr 1.6fr;">
        ${cel('CTRL', '<input id="san-ctrl" />')}
        ${cel('Código de barras', '<input id="san-codbarras" />')}
      </div>
    </div>

    <div class="fol-sys">
      <h4>Campos do sistema (não fazem parte da fatura)</h4>
      <div class="form-row-3">
        <div class="form-group" style="margin-bottom:0;"><label>Desconto (R$)</label><input id="fatura-desconto" type="text" oninput="formatMoney(this);calcularValorPagar();calcularSan()" style="color:var(--green);" /></div>
        <div class="form-group" style="margin-bottom:0;"><label>🧾 Nº NF para cashback</label><input id="fatura-nf-cashback" type="text" /></div>
        <div class="form-group" style="margin-bottom:0;"><label>Observações</label><input id="fatura-obs" type="text" /></div>
      </div>
      <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;color:var(--text-secondary);">💰 Valor a pagar:</span>
        <span id="valor-pagar-preview" style="font-size:20px;font-weight:700;color:var(--text-primary);">R$ 0,00</span>
      </div>
      <div class="fol-checks" id="san-checks"></div>
    </div>
  `;
}

function iniciarFolhaSanepar() {
  SAN_FAIXAS_PADRAO.forEach(n => sanAddFaixa([n, '', '', '', '']));
  sanAddServico();
  calcularSan();
}

function sanAddFaixa(v) {
  v = Array.isArray(v) ? v : ['', '', '', '', ''];
  const d = document.createElement('div');
  d.className = 'row';
  d.innerHTML = '<input class="fx-nome" value="' + esc(v[0]) + '" />'
    + '<input class="fx-vol r" type="number" min="0" value="' + esc(v[1]) + '" oninput="calcularSan()" />'
    + '<input class="fx-preco r" value="' + esc(v[2]) + '" />'
    + '<input class="fx-ag r" value="' + esc(v[3]) + '" oninput="calcularSan()" />'
    + '<input class="fx-es r" value="' + esc(v[4]) + '" oninput="calcularSan()" />'
    + '<button type="button" class="fol-x" title="Remover" onclick="this.parentNode.remove();calcularSan()">×</button>';
  document.getElementById('san-faixas-lista').appendChild(d);
}

function sanAddServico(v) {
  v = Array.isArray(v) ? v : ['', ''];
  const d = document.createElement('div');
  d.className = 'row';
  d.innerHTML = '<input class="sv-desc" value="' + esc(v[0]) + '" />'
    + '<input class="sv-val r" value="' + esc(v[1]) + '" oninput="calcularSan()" />'
    + '<button type="button" class="fol-x" title="Remover" onclick="this.parentNode.remove();calcularSan()">×</button>';
  document.getElementById('san-serv-lista').appendChild(d);
}

// serviços lançados -> as categorias que os cards de "Cobranças Extras" já usam
function sanClassificarServicos(servicos) {
  const ex = { atMonet: 0, multaAtraso: 0, jurosMoratorios: 0, taxaLixo: 0, outros: 0 };
  servicos.forEach(s => {
    const d = s.descricao.toUpperCase();
    if (/MONET/.test(d)) ex.atMonet += s.valor;
    else if (/MULTA/.test(d)) ex.multaAtraso += s.valor;
    else if (/JUROS/.test(d)) ex.jurosMoratorios += s.valor;
    else if (/LIXO|COLETA/.test(d)) ex.taxaLixo += s.valor;
    else ex.outros += s.valor;
  });
  Object.keys(ex).forEach(k => ex[k] = Math.round(ex[k] * 100) / 100);
  return ex;
}

// conferências automáticas: o que foi digitado precisa fechar com a própria fatura
function calcularSan() {
  const el = id => document.getElementById(id);
  if (!el('san-checks')) return;
  const r2 = n => Math.round(n * 100) / 100;
  const fmtN = n => r2(n).toFixed(2).replace('.', ',');
  let vol = 0, ag = 0, es = 0;
  document.querySelectorAll('#san-faixas-lista .row').forEach(r => {
    vol += parseFloat(r.querySelector('.fx-vol').value) || 0;
    ag += parseMoney(r.querySelector('.fx-ag').value);
    es += parseMoney(r.querySelector('.fx-es').value);
  });
  ag = r2(ag); es = r2(es);
  const sv = r2([...document.querySelectorAll('#san-serv-lista .sv-val')].reduce((s, i) => s + parseMoney(i.value), 0));
  const consumo = parseFloat(el('fatura-consumo').value) || 0;
  const lant = parseFloat(el('san-leit-ant').value) || 0, latu = parseFloat(el('san-leit-atual').value) || 0;
  const pAg = parseMoney(el('san-valor-agua').value), pEs = parseMoney(el('san-valor-esgoto').value), pSv = parseMoney(el('san-valor-serv').value);
  const total = parseMoney(el('fatura-valor').value);
  const eq = (a, b) => Math.abs(a - b) < 0.005;
  const chip = (ok, t) => '<span class="fol-chip ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ ' : '⚠ ') + t + '</span>';

  const temFaixas = vol > 0 || ag > 0 || es > 0;
  const partes = [];
  partes.push(chip(!!sanRefParaISO(el('fatura-referencia').value) && !!sanBrParaISO(el('fatura-vencimento').value), 'referência e vencimento válidos'));
  if (lant && latu) partes.push(chip(eq(latu - lant, consumo), 'leitura atual − anterior = consumo (' + (latu - lant) + ' m³)'));
  if (temFaixas) {
    partes.push(chip(eq(vol, consumo), 'volume das faixas = consumo (' + vol + ' m³)'));
    partes.push(chip(eq(ag, pAg), 'faixas água = ' + fmtN(ag)));
    partes.push(chip(eq(es, pEs), 'faixas esgoto = ' + fmtN(es)));
  }
  if (sv || pSv) partes.push(chip(eq(sv, pSv), 'serviços lançados = ' + fmtN(sv)));
  if (pAg || pEs || pSv) partes.push(chip(eq(pAg + pEs + pSv, total), 'água + esgoto + serviços = total (' + fmtN(pAg + pEs + pSv) + ')'));
  el('san-checks').innerHTML = partes.join('');

  el('san-dm-mat').textContent = el('san-matricula').value || '—';
  el('san-dm-ref').textContent = el('fatura-referencia').value || '—';
  el('san-dm-venc').textContent = el('fatura-vencimento').value || '—';
  el('san-dm-valor').textContent = total ? fmtN(total) : '—';
  calcularValorPagar();
}

// lê a folha e devolve os campos extras da fatura (o restante é montado em salvarFatura)
function coletarFolhaSanepar() {
  const get = id => (document.getElementById(id)?.value || '').trim();
  const col = sel => [...document.querySelectorAll(sel)].map(e => e.value);
  const servicos = [...document.querySelectorAll('#san-serv-lista .row')]
    .map(r => ({ descricao: r.querySelector('.sv-desc').value.trim(), valor: parseMoney(r.querySelector('.sv-val').value) }))
    .filter(s => s.descricao || s.valor);
  const faixas = [...document.querySelectorAll('#san-faixas-lista .row')].map(r => ({
    nome: r.querySelector('.fx-nome').value.trim(),
    volume: parseFloat(r.querySelector('.fx-vol').value) || 0,
    precoM3: r.querySelector('.fx-preco').value,
    totalAgua: r.querySelector('.fx-ag').value,
    totalEsgoto: r.querySelector('.fx-es').value
  })).filter(f => f.volume > 0);
  const anos = col('.san-hp-ano'), meses = col('.san-hp-m');
  const hm = col('.san-hm'), hv = col('.san-hv');
  return {
    nomeCliente: get('san-nome'),
    matricula: get('san-matricula'),
    endereco: get('san-endereco'), numero: get('san-numero'), ladoFrente: get('san-lado'),
    cep: get('san-cep'), local: get('san-local'),
    roteiro: get('san-roteiro'), hidrometro: get('san-hidrometro'), categoria: get('san-categoria'),
    qualidadeAgua: {
      colunas: SAN_QA_COLS,
      exigidas: col('.san-qa-0'), realizadas: col('.san-qa-1'), atenderam: col('.san-qa-2'),
      conclusao: get('san-qa-conclusao')
    },
    historicoPagamentos: anos.map((a, i) => ({ ano: a, meses: meses.slice(i * 12, i * 12 + 12) })),
    servicos,
    extras: sanClassificarServicos(servicos),
    faixas,
    historicoConsumo: hm.map((m, i) => ({ mes: m, m3: parseFloat(hv[i]) || 0 })).filter(h => h.mes && h.m3),
    leituraAnterior: get('san-leit-ant'), leituraAtual: get('san-leit-atual'),
    dataLeitura: sanBrParaISO(get('san-data-leit')),
    motivoAusenciaLeitura: get('san-motivo'),
    media: get('san-media'),
    proximaLeitura: sanBrParaISO(get('san-prox-leit')),
    valorAgua: parseMoney(get('san-valor-agua')),
    valorEsgoto: parseMoney(get('san-valor-esgoto')),
    valorServicos: parseMoney(get('san-valor-serv')),
    mensagens: get('san-mensagens'),
    tributosFederais: parseMoney(get('san-tributos')),
    ctrl: get('san-ctrl'),
    codigoBarras: get('san-codbarras')
  };
}

// ===== SALVAR =====
function salvarFatura() {
  const tipo = document.getElementById('fatura-tipo')?.value;
  let vencimento = document.getElementById('fatura-vencimento')?.value;
  if (tipo === 'sanepar') vencimento = sanBrParaISO(vencimento);
  const valor = parseMoney(document.getElementById('fatura-valor')?.value);
  if (!vencimento) { showAlert('⚠️', 'Informe o vencimento' + (tipo === 'sanepar' ? ' (dd/mm/aaaa).' : '.')); return; }
  if (!valor || valor <= 0) { showAlert('⚠️', 'Informe o valor.'); return; }
  if (tipo === 'sanepar' && !sanRefParaISO(document.getElementById('fatura-referencia')?.value)) { showAlert('⚠️', 'Informe a referência (mm/aaaa).'); return; }

  const desconto = parseMoney(document.getElementById('fatura-desconto')?.value) || 0;
  const valorPagar = Math.max(0, valor - desconto);
  const get = id => document.getElementById(id)?.value || '';
  const getMoney = id => parseMoney(document.getElementById(id)?.value) || 0;

  // Extras por tipo
  let extras = {};
  if (tipo === 'copel') {
    extras = {
      ucId: get('fatura-uc'),
      medidor: get('cop-medidor'),
      leituraAnterior: get('cop-leit-ant'),
      leituraAtual: get('cop-leit-atual'),
      banda: get('cop-banda'),
      proximaLeitura: get('cop-prox-leit'),
      classificacao: get('cop-classif'),
      nf: get('cop-nf'),
      chaveAcesso: get('cop-chave'),
      linhaDigitavel: get('cop-linha-dig'),
      extras: {
        multaAtraso: getMoney('cop-extra-0'),
        jurosConta: getMoney('cop-extra-1'),
        acrescimoMoratorio: getMoney('cop-extra-2'),
        contIlumin: getMoney('cop-extra-3'),
        energiaBanda: getMoney('cop-extra-4'),
        usoSistema: getMoney('cop-extra-5')
      }
    };
  } else if (tipo === 'sanepar') {
    extras = coletarFolhaSanepar();
  } else if (tipo === 'inova') {
    extras = {
      periodo: get('inova-periodo'),
      contrato: get('inova-contrato'),
      prazoMaximo: get('inova-prazo-max'),
      pix: get('inova-pix'),
      linhaDigitavel: get('inova-linha-dig')
    };
  } else if (tipo === 'sercomtel') {
    extras = { nrFatura: get('sercom-nr'), linhaDigitavel: get('sercom-linha') };
  }

  const fatura = {
    id: gerarId(),
    tipo,
    apelido: get('fatura-apelido'),
    referencia: tipo === 'sanepar' ? sanRefParaISO(get('fatura-referencia')) : get('fatura-referencia'),
    vencimento,
    valor,
    desconto,
    valorPagar,
    consumo: parseFloat(get('fatura-consumo')) || null,
    dias: parseFloat(get('fatura-dias')) || null,
    nfCashback: get('fatura-nf-cashback'),
    obs: get('fatura-obs'),
    pago: false,
    criadaEm: new Date().toISOString(),
    ...extras
  };

  DB.faturas.push(fatura);
  agendarSync();
  fecharModal();
  renderContas();
  showAlert('✅', 'Fatura cadastrada!');
}

// ===== AÇÕES =====
function marcarFaturaPaga(id) {
  const f = DB.faturas.find(f => f.id === id);
  if (!f) return;
  f.pago = true;
  f.dataPagamento = new Date().toISOString().split('T')[0];
  agendarSync();
  renderContas();
  showAlert('✅', 'Fatura marcada como paga!');
}

function excluirFatura(id) {
  if (confirm('Excluir esta fatura?')) {
    DB.faturas = DB.faturas.filter(f => f.id !== id);
    agendarSync();
    renderContas();
    showAlert('🗑️', 'Fatura excluída.');
  }
}

function verDetalhesFatura(id) {
  const f = DB.faturas.find(f => f.id === id);
  if (!f) return;
  const conc = CONCESSIONARIAS[f.tipo] || CONCESSIONARIAS.outro;

  let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">'
    + '<div style="background:var(--bg-secondary);border-radius:8px;padding:14px;"><div style="font-size:11px;color:var(--text-secondary);">Vencimento</div><div style="font-size:17px;font-weight:700;">' + formatarData(f.vencimento) + '</div></div>'
    + '<div style="background:rgba(34,197,94,0.1);border:1px solid var(--green);border-radius:8px;padding:14px;"><div style="font-size:11px;color:var(--green);">Valor a Pagar</div><div style="font-size:17px;font-weight:700;color:var(--green);">' + formatarMoeda(f.valorPagar || f.valor) + '</div>' + (f.desconto ? '<div style="font-size:11px;color:var(--green);">Desconto: -' + formatarMoeda(f.desconto) + '</div>' : '') + '</div>'
    + '</div>';

  if (f.consumo) html += '<div style="background:var(--bg-secondary);border-radius:8px;padding:12px;margin-bottom:12px;display:flex;gap:20px;font-size:13px;"><span>Consumo: <strong>' + f.consumo + ' ' + (conc.unidade || '') + '</strong></span>' + (f.dias ? '<span>Dias: <strong>' + f.dias + '</strong></span>' : '') + '</div>';

  if (f.valorAgua || f.valorEsgoto || f.valorServicos) {
    html += '<div style="background:var(--bg-secondary);border-radius:8px;padding:12px;margin-bottom:12px;display:flex;gap:20px;font-size:13px;flex-wrap:wrap;">'
      + '<span>Água: <strong>' + formatarMoeda(f.valorAgua) + '</strong></span>'
      + '<span>Esgoto: <strong>' + formatarMoeda(f.valorEsgoto) + '</strong></span>'
      + '<span>Serviços: <strong>' + formatarMoeda(f.valorServicos) + '</strong></span></div>';
  }

  if (f.extras) {
    const itens = Object.entries(f.extras).filter(([k,v]) => v > 0);
    if (itens.length > 0) {
      html += '<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:12px;margin-bottom:12px;">'
        + '<div style="font-size:12px;font-weight:600;color:var(--red);margin-bottom:8px;">⚠️ Cobranças Adicionais</div>'
        + itens.map(([k,v]) => '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span style="color:var(--text-secondary);">' + rotuloExtra(k) + '</span><span style="color:var(--red);font-weight:600;">' + formatarMoeda(v) + '</span></div>').join('')
        + '<div style="border-top:1px solid rgba(239,68,68,0.2);margin-top:6px;padding-top:6px;display:flex;justify-content:space-between;font-size:13px;font-weight:700;"><span>Total Extras</span><span style="color:var(--red);">' + formatarMoeda(itens.reduce((s,[k,v]) => s+v, 0)) + '</span></div>'
        + '</div>';
    }
  }

  if (f.faixas && f.faixas.length > 0) {
    html += '<div style="background:var(--bg-secondary);border-radius:8px;padding:12px;margin-bottom:12px;">'
      + '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">💧 Faixas de Consumo</div>'
      + f.faixas.map(fx => '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span>' + (fx.nome ? esc(fx.nome) + ' · ' : '') + fx.volume + ' m³ × ' + (fx.precoM3 || '-') + '</span><span style="color:var(--blue);">R$ ' + (fx.totalAgua || '0') + ' água / R$ ' + (fx.totalEsgoto || '0') + ' esgoto</span></div>').join('')
      + '</div>';
  }

  if (f.nfCashback) html += '<div style="background:rgba(34,197,94,0.1);border:1px solid var(--green);border-radius:8px;padding:12px;margin-bottom:12px;"><div style="font-size:12px;font-weight:600;color:var(--green);">🧾 NF para Cashback</div><div style="font-size:15px;font-weight:700;margin-top:4px;">' + f.nfCashback + '</div><div style="font-size:11px;color:var(--text-secondary);">Use no Dinheiro na Nota ou Nota Paraná</div></div>';

  if (f.pix) html += '<div style="background:var(--bg-secondary);border-radius:8px;padding:12px;"><div style="font-size:12px;font-weight:600;margin-bottom:6px;">PIX Copia e Cola</div><div style="font-size:10px;font-family:monospace;word-break:break-all;">' + f.pix + '</div></div>';

  abrirModal(conc.logo + ' ' + conc.nome + ' — ' + (f.referencia || formatarData(f.vencimento)), html, '560px');
}

// ===== ABA COPEL =====
function renderCopel() {
  const page = document.getElementById('page-copel');
  const faturas = DB.faturas.filter(f => f.tipo === 'copel').sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento));
  const ultimaFatura = faturas[faturas.length - 1];
  const penultimaFatura = faturas[faturas.length - 2];

  const variacaoConsumo = ultimaFatura && penultimaFatura && ultimaFatura.consumo && penultimaFatura.consumo
    ? ((ultimaFatura.consumo - penultimaFatura.consumo) / penultimaFatura.consumo * 100).toFixed(1)
    : null;

  const variacaoValor = ultimaFatura && penultimaFatura
    ? ((( ultimaFatura.valorPagar || ultimaFatura.valor) - (penultimaFatura.valorPagar || penultimaFatura.valor)) / (penultimaFatura.valorPagar || penultimaFatura.valor) * 100).toFixed(1)
    : null;

  page.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      <span style="font-size:32px;">⚡</span>
      <div>
        <p style="font-size:13px;color:var(--text-secondary);">Histórico e índices de consumo</p>
      </div>
      <button class="btn-primary" style="margin-left:auto;background:#f5821e;" onclick="abrirModalNovaFatura('copel')">+ Nova Fatura Copel</button>
    </div>

    ${ultimaFatura ? `
    <!-- Última fatura -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;">
      <div class="saldo-card">
        <div class="label">💰 Último Valor Pago</div>
        <div class="value">${formatarMoeda(ultimaFatura.valorPagar || ultimaFatura.valor)}</div>
        <div style="font-size:11px;color:#86efac;margin-top:4px;">Ref: ${ultimaFatura.referencia || '-'}</div>
      </div>
      <div class="indicator-card">
        <div class="ic-icon">⚡</div>
        <div class="ic-label">Último Consumo</div>
        <div class="ic-value">${ultimaFatura.consumo || '-'} KWh</div>
      </div>
      <div class="indicator-card" style="${variacaoConsumo > 10 ? 'border:1px solid var(--red)' : ''}">
        <div class="ic-icon">${variacaoConsumo > 0 ? '📈' : '📉'}</div>
        <div class="ic-label">Variação Consumo</div>
        <div class="ic-value ${variacaoConsumo > 0 ? 'red' : 'green'}">${variacaoConsumo ? (variacaoConsumo > 0 ? '+' : '') + variacaoConsumo + '%' : '-'}</div>
      </div>
      <div class="indicator-card" style="${variacaoValor > 10 ? 'border:1px solid var(--red)' : ''}">
        <div class="ic-icon">${variacaoValor > 0 ? '📈' : '📉'}</div>
        <div class="ic-label">Variação Valor</div>
        <div class="ic-value ${variacaoValor > 0 ? 'red' : 'green'}">${variacaoValor ? (variacaoValor > 0 ? '+' : '') + variacaoValor + '%' : '-'}</div>
      </div>
    </div>` : ''}

    <!-- Gráficos -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
      <div class="chart-card">
        <h3>Consumo KWh por Mês</h3>
        <canvas id="chart-copel-kwh" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3>Valor Pago por Mês (R$)</h3>
        <canvas id="chart-copel-valor" height="200"></canvas>
      </div>
    </div>

    ${ultimaFatura?.extras ? renderExtrasCard(ultimaFatura.extras, '⚡') : ''}

    <!-- Histórico -->
    <div class="card">
      <h3 style="font-size:14px;font-weight:600;margin-bottom:16px;">📋 Histórico de Faturas Copel</h3>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Referência</th><th>Vencimento</th><th>Consumo KWh</th><th>Banda</th><th>Valor</th><th>Extras</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            ${faturas.length === 0 ? '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">⚡</div><p>Nenhuma fatura Copel cadastrada.</p></div></td></tr>' :
            [...faturas].reverse().map(f => {
              const status = getStatusFatura(f);
              const totalExtras = f.extras ? Object.values(f.extras).reduce((s,v) => s+(v||0), 0) : 0;
              const ant = faturas[faturas.indexOf(f) - 1];
              const varConsumo = ant && ant.consumo && f.consumo ? ((f.consumo - ant.consumo) / ant.consumo * 100).toFixed(0) : null;
              return '<tr>'
                + '<td><strong>' + (f.referencia || '-') + '</strong></td>'
                + '<td>' + formatarData(f.vencimento) + '</td>'
                + '<td>' + (f.consumo || '-') + ' KWh' + (varConsumo ? ' <span style="font-size:10px;color:' + (varConsumo > 0 ? 'var(--red)' : 'var(--green)') + ';">(' + (varConsumo > 0 ? '+' : '') + varConsumo + '%)</span>' : '') + '</td>'
                + '<td>' + (f.banda || '-') + '</td>'
                + '<td>' + formatarMoeda(f.valorPagar || f.valor) + '</td>'
                + '<td>' + (totalExtras > 0 ? '<span style="color:var(--red);">+' + formatarMoeda(totalExtras) + '</span>' : '-') + '</td>'
                + '<td><span class="badge ' + status + '">' + status.charAt(0).toUpperCase() + status.slice(1) + '</span></td>'
                + '<td><div style="display:flex;gap:4px;">'
                + '<button class="btn-secondary btn-sm" onclick="verDetalhesFatura(' + f.id + ')">👁️</button>'
                + (!f.pago ? '<button class="btn-primary btn-sm" onclick="marcarFaturaPagaEAtualizar(' + f.id + ',\'copel\')">✅</button>' : '')
                + '</div></td></tr>';
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  setTimeout(() => renderChartsCopel(faturas), 100);
}

// ===== ABA SANEPAR =====
function renderSanepar() {
  const page = document.getElementById('page-sanepar');
  const faturas = DB.faturas.filter(f => f.tipo === 'sanepar').sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento));
  const ultimaFatura = faturas[faturas.length - 1];
  const penultimaFatura = faturas[faturas.length - 2];

  const variacaoConsumo = ultimaFatura && penultimaFatura && ultimaFatura.consumo && penultimaFatura.consumo
    ? ((ultimaFatura.consumo - penultimaFatura.consumo) / penultimaFatura.consumo * 100).toFixed(1)
    : null;

  page.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      <span style="font-size:32px;">💧</span>
      <div>
        <p style="font-size:13px;color:var(--text-secondary);">Histórico e índices de consumo</p>
      </div>
      <button class="btn-primary" style="margin-left:auto;background:#0066CC;" onclick="abrirModalNovaFatura('sanepar')">+ Nova Fatura Sanepar</button>
    </div>

    ${ultimaFatura ? `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;">
      <div class="saldo-card">
        <div class="label">💰 Último Valor Pago</div>
        <div class="value">${formatarMoeda(ultimaFatura.valorPagar || ultimaFatura.valor)}</div>
        <div style="font-size:11px;color:#86efac;margin-top:4px;">Ref: ${ultimaFatura.referencia || '-'}</div>
      </div>
      <div class="indicator-card">
        <div class="ic-icon">💧</div>
        <div class="ic-label">Último Consumo</div>
        <div class="ic-value">${ultimaFatura.consumo || '-'} m³</div>
      </div>
      <div class="indicator-card" style="${variacaoConsumo > 10 ? 'border:1px solid var(--red)' : ''}">
        <div class="ic-icon">${variacaoConsumo > 0 ? '📈' : '📉'}</div>
        <div class="ic-label">Variação Consumo</div>
        <div class="ic-value ${variacaoConsumo > 0 ? 'red' : 'green'}">${variacaoConsumo ? (variacaoConsumo > 0 ? '+' : '') + variacaoConsumo + '%' : '-'}</div>
      </div>
      <div class="indicator-card">
        <div class="ic-icon">🗓️</div>
        <div class="ic-label">Próxima Leitura</div>
        <div class="ic-value" style="font-size:14px;">${ultimaFatura.proximaLeitura ? formatarData(ultimaFatura.proximaLeitura) : '-'}</div>
      </div>
    </div>` : ''}

    <!-- Gasto × Consumo -->
    <div class="chart-card" style="margin-bottom:16px;">
      <h3>Gasto (R$) × Consumo (m³) por Mês</h3>
      <canvas id="chart-san-gasto-consumo" height="110"></canvas>
    </div>

    <!-- Gráficos -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
      <div class="chart-card">
        <h3>Consumo m³ por Mês</h3>
        <canvas id="chart-san-m3" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3>Valor Pago por Mês (R$)</h3>
        <canvas id="chart-san-valor" height="200"></canvas>
      </div>
    </div>

    ${ultimaFatura?.extras ? renderExtrasCard(ultimaFatura.extras, '💧') : ''}

    <!-- Histórico -->
    <div class="card">
      <h3 style="font-size:14px;font-weight:600;margin-bottom:16px;">📋 Histórico de Faturas Sanepar</h3>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Referência</th><th>Vencimento</th><th>Consumo m³</th><th>Matrícula</th><th>Valor</th><th>Extras</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            ${faturas.length === 0 ? '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">💧</div><p>Nenhuma fatura Sanepar cadastrada.</p></div></td></tr>' :
            [...faturas].reverse().map(f => {
              const status = getStatusFatura(f);
              const totalExtras = f.extras ? Object.values(f.extras).reduce((s,v) => s+(v||0), 0) : 0;
              const ant = faturas[faturas.indexOf(f) - 1];
              const varConsumo = ant && ant.consumo && f.consumo ? ((f.consumo - ant.consumo) / ant.consumo * 100).toFixed(0) : null;
              return '<tr>'
                + '<td><strong>' + (f.referencia || '-') + '</strong></td>'
                + '<td>' + formatarData(f.vencimento) + '</td>'
                + '<td>' + (f.consumo || '-') + ' m³' + (varConsumo ? ' <span style="font-size:10px;color:' + (varConsumo > 0 ? 'var(--red)' : 'var(--green)') + ';">(' + (varConsumo > 0 ? '+' : '') + varConsumo + '%)</span>' : '') + '</td>'
                + '<td>' + (f.matricula || '-') + '</td>'
                + '<td>' + formatarMoeda(f.valorPagar || f.valor) + '</td>'
                + '<td>' + (totalExtras > 0 ? '<span style="color:var(--red);">+' + formatarMoeda(totalExtras) + '</span>' : '-') + '</td>'
                + '<td><span class="badge ' + status + '">' + status.charAt(0).toUpperCase() + status.slice(1) + '</span></td>'
                + '<td><div style="display:flex;gap:4px;">'
                + '<button class="btn-secondary btn-sm" onclick="verDetalhesFatura(' + f.id + ')">👁️</button>'
                + (!f.pago ? '<button class="btn-primary btn-sm" onclick="marcarFaturaPagaEAtualizar(' + f.id + ',\'sanepar\')">✅</button>' : '')
                + '</div></td></tr>';
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  setTimeout(() => renderChartsSanepar(faturas), 100);
}

const ROTULOS_EXTRAS = {
  multaAtraso: 'Multa por atraso', atMonet: 'Atualização monetária', jurosMoratorios: 'Juros moratórios',
  taxaLixo: 'Taxa de coleta de lixo', multaAgua: 'Multa água', multaEsgoto: 'Multa esgoto', outros: 'Outros',
  jurosConta: 'Juros conta anterior', acrescimoMoratorio: 'Acréscimo moratório', contIlumin: 'Cont. ilum. pública',
  energiaBanda: 'Energia (banda)', usoSistema: 'Uso do sistema'
};
const rotuloExtra = k => ROTULOS_EXTRAS[k] || k;

function renderExtrasCard(extras, icon) {
  const itens = Object.entries(extras).filter(([k,v]) => v > 0);
  if (itens.length === 0) return '';
  const totalExtras = itens.reduce((s,[k,v]) => s+v, 0);
  return '<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:16px;margin-bottom:20px;">'
    + '<div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:12px;">' + icon + ' Cobranças Extras — Última Fatura</div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">'
    + itens.map(([k,v]) => '<div style="background:var(--bg-card);border-radius:8px;padding:10px;"><div style="font-size:11px;color:var(--text-secondary);">' + rotuloExtra(k) + '</div><div style="font-size:15px;font-weight:700;color:var(--red);">' + formatarMoeda(v) + '</div></div>').join('')
    + '</div>'
    + '<div style="margin-top:10px;font-size:13px;font-weight:700;color:var(--red);text-align:right;">Total extras: ' + formatarMoeda(totalExtras) + '</div>'
    + '</div>';
}

function marcarFaturaPagaEAtualizar(id, pagina) {
  const f = DB.faturas.find(f => f.id === id);
  if (!f) return;
  f.pago = true;
  f.dataPagamento = new Date().toISOString().split('T')[0];
  agendarSync();
  if (pagina === 'copel') renderCopel();
  else if (pagina === 'sanepar') renderSanepar();
  showAlert('✅', 'Fatura marcada como paga!');
}

// ===== GRÁFICOS =====
function renderChartsCopel(faturas) {
  const labels = faturas.map(f => f.referencia || formatarData(f.vencimento));
  const kwh = faturas.map(f => f.consumo || 0);
  const valores = faturas.map(f => f.valorPagar || f.valor || 0);

  const el1 = document.getElementById('chart-copel-kwh');
  if (el1) new Chart(el1, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'KWh', data: kwh, backgroundColor: '#003399', borderRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: coresGrafico().textoFraco, font: { size: 10 } } }, y: { ticks: { color: coresGrafico().textoFraco } } } }
  });

  const el2 = document.getElementById('chart-copel-valor');
  if (el2) new Chart(el2, {
    type: 'line',
    data: { labels, datasets: [{ label: 'R$', data: valores, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: coresGrafico().textoFraco, font: { size: 10 } } }, y: { ticks: { color: coresGrafico().textoFraco, callback: v => 'R$' + v } } } }
  });
}

// Série mensal gasto × consumo. As faturas mandam; o histórico de consumo impresso nelas
// completa os meses anteriores (só consumo, sem valor).
function serieGastoConsumo(faturas) {
  const mapa = {};
  const chaveHist = mes => { const m = /^(\d{2})\/(\d{2})$/.exec(mes || ''); return m ? '20' + m[2] + '-' + m[1] : ''; };
  faturas.forEach(f => (f.historicoConsumo || []).forEach(h => {
    const k = chaveHist(h.mes);
    if (k && h.m3 && !mapa[k]) mapa[k] = { consumo: h.m3, valor: null };
  }));
  faturas.forEach(f => {
    const k = (f.referencia || f.vencimento || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(k)) return;
    mapa[k] = { consumo: f.consumo != null ? f.consumo : (mapa[k] ? mapa[k].consumo : null), valor: f.valorPagar || f.valor || null };
  });
  return Object.keys(mapa).sort().map(k => ({ rotulo: k.slice(5, 7) + '/' + k.slice(2, 4), consumo: mapa[k].consumo, valor: mapa[k].valor }));
}

// Barras = gasto (eixo esquerdo, R$) · linha = consumo (eixo direito). Serve para qualquer concessionária.
function renderChartGastoConsumo(canvasId, faturas, unidade, corBarra) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  const serie = serieGastoConsumo(faturas);
  if (serie.length === 0) { el.parentNode.insertAdjacentHTML('beforeend', '<p style="font-size:12px;color:var(--text-muted);">Cadastre uma fatura para ver o gráfico.</p>'); return; }
  const grade = coresGrafico().grade, texto = coresGrafico().texto;
  new Chart(el, {
    data: {
      labels: serie.map(p => p.rotulo),
      datasets: [
        { type: 'bar', label: 'Gasto (R$)', data: serie.map(p => p.valor), backgroundColor: corBarra + '99', borderColor: corBarra, borderWidth: 1, borderRadius: 4, yAxisID: 'y', order: 2 },
        { type: 'line', label: 'Consumo (' + unidade + ')', data: serie.map(p => p.consumo), borderColor: '#f59e0b', backgroundColor: '#f59e0b', tension: 0.3, pointRadius: 3, spanGaps: true, yAxisID: 'y1', order: 1 }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: texto, boxWidth: 12 } },
        tooltip: { callbacks: {
          label: c => c.dataset.yAxisID === 'y' ? 'Gasto: ' + formatarMoeda(c.parsed.y) : 'Consumo: ' + c.parsed.y + ' ' + unidade,
          footer: items => {
            const p = serie[items[0].dataIndex];
            return p && p.valor && p.consumo ? 'Custo: ' + formatarMoeda(p.valor / p.consumo) + ' por ' + unidade : '';
          }
        } }
      },
      scales: {
        x: { ticks: { color: texto, font: { size: 10 } }, grid: { color: grade } },
        y: { position: 'left', beginAtZero: true, ticks: { color: texto, callback: v => 'R$' + v }, grid: { color: grade } },
        y1: { position: 'right', beginAtZero: true, ticks: { color: '#f59e0b', callback: v => v + ' ' + unidade }, grid: { drawOnChartArea: false } }
      }
    }
  });
}

function renderChartsSanepar(faturas) {
  renderChartGastoConsumo('chart-san-gasto-consumo', faturas, 'm³', '#0077b6');
  const labels = faturas.map(f => f.referencia || formatarData(f.vencimento));
  const m3 = faturas.map(f => f.consumo || 0);
  const valores = faturas.map(f => f.valorPagar || f.valor || 0);

  const el1 = document.getElementById('chart-san-m3');
  if (el1) new Chart(el1, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'm³', data: m3, backgroundColor: '#0077b6', borderRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: coresGrafico().textoFraco, font: { size: 10 } } }, y: { ticks: { color: coresGrafico().textoFraco } } } }
  });

  const el2 = document.getElementById('chart-san-valor');
  if (el2) new Chart(el2, {
    type: 'line',
    data: { labels, datasets: [{ label: 'R$', data: valores, borderColor: '#0077b6', backgroundColor: 'rgba(0,119,182,0.1)', fill: true, tension: 0.4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: coresGrafico().textoFraco, font: { size: 10 } } }, y: { ticks: { color: coresGrafico().textoFraco, callback: v => 'R$' + v } } } }
  });
}

// ===== UNIDADES CONSUMIDORAS =====
function abrirModalUnidades() {
  abrirModal('🏠 Unidades Consumidoras', `
    <div style="margin-bottom:16px;">
      ${DB.unidadesConsumidoras.map(u => '<div style="background:var(--bg-secondary);border:1px solid ' + (u.ativa ? 'var(--green)' : 'var(--border)') + ';border-radius:8px;padding:14px;margin-bottom:10px;">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">'
        + '<strong>' + u.apelido + '</strong>'
        + '<div style="display:flex;gap:6px;align-items:center;">'
        + '<span class="badge ' + (u.ativa ? 'pago' : 'pendente') + '">' + (u.ativa ? 'Ativa' : 'Inativa') + '</span>'
        + '<button onclick="editarUC(' + u.id + ')" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary);padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;">✏️ Editar</button>'
        + '</div></div>'
        + '<div style="font-size:12px;color:var(--text-secondary);">UC ANEEL: <strong>' + (u.ucAneel || '-') + '</strong>' + (u.ucAntiga ? ' | UC Antiga: ' + u.ucAntiga : '') + '</div>'
        + (u.titular ? '<div style="font-size:12px;color:var(--text-secondary);">Titular: ' + u.titular + '</div>' : '')
        + (u.obs ? '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">📝 ' + u.obs + '</div>' : '')
        + '</div>'
      ).join('')}
    </div>
    <button class="btn-secondary btn-sm" onclick="fecharModal();setTimeout(()=>abrirModalNovaUC(),200)">+ Nova Unidade</button>
    <div class="modal-actions"><button class="btn-secondary" onclick="fecharModal()">Fechar</button></div>
  `, '500px');
}

function editarUC(id) {
  const u = DB.unidadesConsumidoras.find(u => u.id === id);
  if (!u) return;
  fecharModal();
  setTimeout(() => {
    abrirModal('✏️ Editar Unidade — ' + u.apelido, `
      <div class="form-row">
        <div class="form-group"><label>Apelido *</label><input id="uc-apelido" type="text" value="${u.apelido}" /></div>
        <div class="form-group"><label>Tipo</label><select id="uc-tipo">
          <option value="copel" ${u.tipo==='copel'?'selected':''}>⚡ Copel</option>
          <option value="sanepar" ${u.tipo==='sanepar'?'selected':''}>💧 Sanepar</option>
        </select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>UC ANEEL</label><input id="uc-aneel" type="text" value="${u.ucAneel||''}" /></div>
        <div class="form-group"><label>UC Antiga</label><input id="uc-antiga" type="text" value="${u.ucAntiga||''}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Titular</label><input id="uc-titular" type="text" value="${u.titular||''}" /></div>
        <div class="form-group"><label>Status</label><select id="uc-ativa">
          <option value="true" ${u.ativa?'selected':''}>Ativa</option>
          <option value="false" ${!u.ativa?'selected':''}>Inativa</option>
        </select></div>
      </div>
      <div class="form-group"><label>Observações</label><input id="uc-obs" type="text" value="${u.obs||''}" /></div>
      <div class="modal-actions">
        <button class="btn-danger" onclick="excluirUC(${id})">🗑️ Excluir</button>
        <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
        <button class="btn-primary" onclick="salvarEdicaoUC(${id})">💾 Salvar</button>
      </div>
    `, '480px');
  }, 200);
}

function salvarEdicaoUC(id) {
  const u = DB.unidadesConsumidoras.find(u => u.id === id);
  if (!u) return;
  u.apelido = document.getElementById('uc-apelido')?.value.trim() || u.apelido;
  u.tipo = document.getElementById('uc-tipo')?.value;
  u.ucAneel = document.getElementById('uc-aneel')?.value;
  u.ucAntiga = document.getElementById('uc-antiga')?.value;
  u.titular = document.getElementById('uc-titular')?.value;
  u.ativa = document.getElementById('uc-ativa')?.value === 'true';
  u.obs = document.getElementById('uc-obs')?.value;
  agendarSync();
  fecharModal();
  renderContas();
  showAlert('✅', 'Unidade atualizada!');
}

function excluirUC(id) {
  if (confirm('Excluir esta unidade consumidora?')) {
    DB.unidadesConsumidoras = DB.unidadesConsumidoras.filter(u => u.id !== id);
    agendarSync();
    fecharModal();
    renderContas();
    showAlert('🗑️', 'Unidade excluída.');
  }
}

function abrirModalNovaUC() {
  abrirModal('+ Nova Unidade Consumidora', `
    <div class="form-row">
      <div class="form-group"><label>Apelido *</label><input id="uc-apelido" type="text" placeholder="Ex: Casa dos Fundos" /></div>
      <div class="form-group"><label>Tipo</label><select id="uc-tipo"><option value="copel">⚡ Copel</option><option value="sanepar">💧 Sanepar</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>UC ANEEL</label><input id="uc-aneel" type="text" /></div>
      <div class="form-group"><label>UC Antiga</label><input id="uc-antiga" type="text" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Titular</label><input id="uc-titular" type="text" /></div>
      <div class="form-group"><label>Status</label><select id="uc-ativa"><option value="true">Ativa</option><option value="false">Inativa</option></select></div>
    </div>
    <div class="form-group"><label>Observações</label><input id="uc-obs" type="text" /></div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primary" onclick="salvarNovaUC()">💾 Salvar</button>
    </div>
  `, '480px');
}

function salvarNovaUC() {
  const apelido = document.getElementById('uc-apelido')?.value.trim();
  if (!apelido) { showAlert('⚠️', 'Informe o apelido.'); return; }
  DB.unidadesConsumidoras.push({
    id: gerarId(), apelido,
    tipo: document.getElementById('uc-tipo')?.value,
    ucAneel: document.getElementById('uc-aneel')?.value,
    ucAntiga: document.getElementById('uc-antiga')?.value,
    titular: document.getElementById('uc-titular')?.value,
    ativa: document.getElementById('uc-ativa')?.value === 'true',
    obs: document.getElementById('uc-obs')?.value
  });
  agendarSync();
  fecharModal();
  renderContas();
  showAlert('✅', 'Unidade cadastrada!');
}

// ===== LEITOR DE PDF =====
function importarPDF(tipo) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showAlert('⏳', 'Lendo PDF... aguarde.');
    setTimeout(async () => {
      try {
        const texto = await extrairTextoPDF(file);
        window._textoPDF = texto; // debug
        console.log('PDF texto extraído:', texto.substring(0, 500));
        const dados = parsearFatura(texto, tipo);
        console.log('Dados extraídos:', dados);
        fecharAlert();
        abrirModalNovaFatura(tipo);
        setTimeout(() => preencherFormulario(dados, tipo), 300);
      } catch(err) {
        fecharAlert();
        showAlert('❌', 'Erro ao ler PDF. Verifique se é um PDF digital (não escaneado).');
        console.error(err);
      }
    }, 500);
  };
  input.click();
}

async function extrairTextoPDF(file) {
  // Usa PDF.js via CDN para extrair texto
  if (!window.pdfjsLib) {
    await carregarPDFjs();
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let textoCompleto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const texto = content.items.map(item => item.str).join(' ');
    textoCompleto += texto + '\n';
  }
  return textoCompleto;
}

function carregarPDFjs() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ===== PARSEAR FATURAS =====
function parsearFatura(texto, tipo) {
  switch(tipo) {
    case 'copel':    return parsearCopel(texto);
    case 'sanepar':  return parsearSanepar(texto);
    case 'inova':    return parsearInova(texto);
    default:         return parsearGenerico(texto);
  }
}

function parsearCopel(texto) {
  const dados = {};
  const t = texto.replace(/\s+/g, ' ');

  // REF MES/ANO — ex: "07/2026"
  const ref = t.match(/REF[:\s]*MÊS\s*\/\s*ANO\s+(\d{2})\/(\d{4})/i) ||
              t.match(/\b(0[1-9]|1[0-2])\/(20\d{2})\b/);
  if (ref) {
    dados.referencia = ref[2] + '-' + ref[1].padStart(2,'0');
  }

  // VENCIMENTO — ex: "27/07/2026"
  const venc = t.match(/VENCIMENTO\s+(\d{2}\/\d{2}\/\d{4})/i) ||
               t.match(/DATA VENCIMENTO\s+(\d{2}\/\d{2}\/\d{4})/i) ||
               t.match(/(\d{2}\/\d{2}\/20\d{2})/);
  if (venc) dados.vencimento = converterData(venc[1]);

  // TOTAL A PAGAR — ex: "R$333,94"
  const valor = t.match(/TOTAL A PAGAR\s+R\$\s*([\d.,]+)/i) ||
                t.match(/VALOR DO DOCUMENTO\s+R\$([\d.,]+)/i) ||
                t.match(/R\$\s*([\d]{2,4},[\d]{2})/);
  if (valor) dados.valor = valor[1].replace(/\./g,'').replace(',','.');

  // NOTA FISCAL — ex: "242425413 - SÉRIE 3"
  const nf = t.match(/NOTA FISCAL\s+No\.?\s*([\d]+)/i) ||
             t.match(/([\d]{9})/);
  if (nf) { dados.nf = nf[1]; dados.nfCashback = nf[1]; }

  // SÉRIE
  const serie = t.match(/SÉRIE\s+(\d+)/i);
  if (serie) dados.serie = serie[1];

  // DATA EMISSÃO — ex: "09/07/2026"
  const emissao = t.match(/DATA DE EMISSÃO[:\s]+(\d{2}\/\d{2}\/\d{4})/i) ||
                  t.match(/DATA DO EMISSÃO[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
  if (emissao) dados.emissao = converterData(emissao[1]);

  // CHAVE DE ACESSO — 44 dígitos
  const chave = t.match(/Chave de Acesso\s+([\d\s]{40,60})(?=Protocolo|https)/i) ||
                t.match(/([\d]{4}\s[\d]{4}\s[\d]{4}\s[\d]{4}\s[\d]{4}\s[\d]{4}\s[\d]{4}\s[\d]{4}\s[\d]{4}\s[\d]{4}\s[\d]{4})/);
  if (chave) dados.chaveAcesso = chave[1].trim();

  // LEITURAS — padrão linha medidor Copel:
  // "0760801802 CONSUMO kWh TP 9494 9790 1 296"
  const medLeitura = t.match(/([\d]{7,12})\s+CONSUMO kWh\s+TP\s+([\d]{4,6})\s+([\d]{4,6})\s+\d+\s+([\d]{2,4})/i);
  if (medLeitura) {
    dados.medidor = medLeitura[1];
    dados.leituraAnterior = medLeitura[2];
    dados.leituraAtual = medLeitura[3];
    dados.consumo = medLeitura[4];
  }

  // Nº DIAS
  const dias = t.match(/Nº de dias\s+(\d+)/i) ||
               t.match(/\b(28|29|30|31|32)\s+dias/i) ||
               t.match(/\b(28|29|30|31|32)\b(?=\s+[\d]{2}\/[\d]{2}\/20)/);
  if (dias) dados.dias = dias[1];

  // BANDA TARIFÁRIA
  if (t.match(/Amarela/i)) dados.banda = 'Amarela';
  else if (t.match(/Vermelha 2/i)) dados.banda = 'Vermelha 2';
  else if (t.match(/Vermelha 1/i)) dados.banda = 'Vermelha 1';
  else if (t.match(/Verde/i)) dados.banda = 'Verde';

  // Itens extras da Copel
  // Padrão do PDF: "NOME UN [qtd] [preco_unitario] [valor_final] [pis] [icms]"
  // Exemplo: "MULTA POR ATRASO NO PAGAMENTO UN 5,910000 5,91"
  // Valor final sempre tem 2 casas decimais: XX,XX ou XXX,XX

  function extrairValorItem(texto, nomeItem) {
    const regex = new RegExp(nomeItem + '[\\w\\s,./]+?([\\d]+,[\\d]{2})(?=\\s+[\\d]|\\s*$)', 'i');
    const m = texto.match(regex);
    return m ? m[1].replace(',', '.') : null;
  }

  const multaVal = extrairValorItem(t, 'MULTA POR ATRASO NO PAGAMENTO');
  if (multaVal) dados.multaAtraso = multaVal;

  const jurosVal = extrairValorItem(t, 'JUROS CONTA ANTERIOR');
  if (jurosVal) dados.jurosConta = jurosVal;

  const acrescimoVal = extrairValorItem(t, 'ACRESCIMO MORATORIO');
  if (acrescimoVal) dados.acrescimoMoratorio = acrescimoVal;

  const ilumVal = extrairValorItem(t, 'CONT ILUMIN PUBLICA');
  if (ilumVal) dados.contIlumin = ilumVal;

  // LINHA DIGITÁVEL
  const linha = t.match(/([\d]{5}\.[\d]{5}\s[\d]{5}\.[\d]{6}\s[\d]{5}\.[\d]{6}\s[\d]\s[\d]{14})/);
  if (linha) dados.linhaDigitavel = linha[1];

  return dados;
}

function parsearSanepar(texto) {
  const dados = {};
  const t = texto.replace(/\s+/g, ' ');

  // Vencimento
  const venc = t.match(/VENCIMENTO\s+(\d{2}\/\d{2}\/\d{4})/i) ||
               t.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (venc) dados.vencimento = converterData(venc[1]);

  // Valor
  const valor = t.match(/TOTAL\s+R?\$?\s*([\d.,]+)/i);
  if (valor) dados.valor = valor[1].replace('.','').replace(',','.');

  // Referência
  const ref = t.match(/(\d{2}\/\d{4})/);
  if (ref) {
    const [mes, ano] = ref[1].split('/');
    dados.referencia = ano + '-' + mes;
  }

  // Matrícula
  const mat = t.match(/MATRÍCULA\s+([\d.]+)/i) ||
              t.match(/(\d{4}\.\d{4})/);
  if (mat) dados.matricula = mat[1];

  // Consumo m³
  const consumo = t.match(/CONSUMO[\/m³\s]+([\d]+)/i) ||
                  t.match(/(\d{1,3})\s+m[³3]/i);
  if (consumo) dados.consumo = consumo[1];

  // Leitura anterior e atual
  const lant = t.match(/LEITURA ANTERIOR\s+([\d]+)/i);
  const latual = t.match(/LEITURA ATUAL\s+([\d]+)/i);
  if (lant) dados.leituraAnterior = lant[1];
  if (latual) dados.leituraAtual = latual[1];

  // Próxima leitura
  const prox = t.match(/PRÓXIMA LEITURA\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (prox) dados.proximaLeitura = converterData(prox[1]);

  // Hidrômetro
  const hidro = t.match(/HIDRÔMETRO\s+([\w-]+)/i);
  if (hidro) dados.hidrometro = hidro[1];

  // Multas
  const multaAgua = t.match(/MULTA ÁGUA\s+([\d.,]+)/i);
  const multaEsgoto = t.match(/MULTA ESGOTO\s+([\d.,]+)/i);
  const juros = t.match(/JUROS MORATÓRIOS\s+([\d.,]+)/i);
  if (multaAgua) dados.multaAgua = multaAgua[1].replace(',','.');
  if (multaEsgoto) dados.multaEsgoto = multaEsgoto[1].replace(',','.');
  if (juros) dados.jurosMoratorios = juros[1].replace(',','.');

  // CTRL
  const ctrl = t.match(/CTRL[:\s]+([\d.]+)/i);
  if (ctrl) dados.ctrl = ctrl[1];

  return dados;
}

function parsearInova(texto) {
  const dados = {};
  const t = texto.replace(/\s+/g, ' ');

  // Vencimento
  const venc = t.match(/Vencimento\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (venc) dados.vencimento = converterData(venc[1]);

  // Valor
  const valor = t.match(/R\$\s*([\d.,]+)/);
  if (valor) dados.valor = valor[1].replace('.','').replace(',','.');

  // Referência
  const ref = t.match(/fatura do mês de (\w+)/i);
  if (ref) {
    const meses = {janeiro:'01',fevereiro:'02',março:'03',abril:'04',maio:'05',junho:'06',julho:'07',agosto:'08',setembro:'09',outubro:'10',novembro:'11',dezembro:'12'};
    const anoRef = t.match(/(\d{4})/);
    const mes = meses[ref[1].toLowerCase()];
    if (mes && anoRef) dados.referencia = anoRef[1] + '-' + mes;
  }

  // Desconto
  const desc = t.match(/Descontos[:\s]+R\$\s*([\d.,]+)/i);
  if (desc) dados.desconto = desc[1].replace('.','').replace(',','.');

  // Período
  const periodo = t.match(/de (\d{2}\/\d{2}\/\d{4}) a (\d{2}\/\d{2}\/\d{4})/i);
  if (periodo) dados.periodo = periodo[1] + ' a ' + periodo[2];

  // Contrato
  const contrato = t.match(/Contrato[:\s]+([\d]+)/i);
  if (contrato) dados.contrato = contrato[1];

  // Nr documento
  const nrDoc = t.match(/Nr\. do Documento[:\s]+([\d]+)/i) ||
                t.match(/(\d{6,})/);
  if (nrDoc) dados.nrDocumento = nrDoc[1];

  // PIX
  const pix = t.match(/(00020126[\w]+)/i);
  if (pix) dados.pix = pix[1];

  // Data emissão
  const emissao = t.match(/Data[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
  if (emissao) dados.emissao = converterData(emissao[1]);

  return dados;
}

function parsearGenerico(texto) {
  const dados = {};
  const t = texto.replace(/\s+/g, ' ');
  const venc = t.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (venc) dados.vencimento = converterData(venc[1]);
  const valor = t.match(/R\$\s*([\d.,]+)/);
  if (valor) dados.valor = valor[1].replace('.','').replace(',','.');
  return dados;
}

function converterData(data) {
  // Converte DD/MM/YYYY para YYYY-MM-DD
  if (!data) return '';
  const partes = data.split('/');
  if (partes.length === 3) return partes[2] + '-' + partes[1] + '-' + partes[0];
  return data;
}

// ===== PREENCHER FORMULÁRIO =====
function preencherFormulario(dados, tipo) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== '') el.value = val;
  };
  const setMoney = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) {
      el.value = 'R$ ' + parseFloat(val).toFixed(2).replace('.', ',');
    }
  };

  // Campos comuns (na folha da Sanepar as datas são digitadas como na fatura: dd/mm/aaaa e mm/aaaa)
  const ehSan = tipo === 'sanepar';
  set('fatura-vencimento', ehSan ? sanISOParaBr(dados.vencimento) : dados.vencimento);
  set('fatura-referencia', ehSan ? sanISOParaRef(dados.referencia) : dados.referencia);
  if (dados.valor) setMoney('fatura-valor', dados.valor);
  if (dados.consumo) set('fatura-consumo', dados.consumo);
  set('fatura-nf-cashback', dados.nfCashback);

  // Recalcula valor a pagar
  if (dados.desconto) {
    setMoney('fatura-desconto', dados.desconto);
  }
  calcularValorPagar();

  // Campos Copel
  if (tipo === 'copel') {
    set('cop-medidor', dados.medidor);
    set('cop-leit-ant', dados.leituraAnterior);
    set('cop-leit-atual', dados.leituraAtual);
    set('fatura-dias', dados.dias);
    set('cop-nf', dados.nf);
    set('cop-serie', dados.serie);
    set('cop-chave', dados.chaveAcesso);
    set('cop-linha-dig', dados.linhaDigitavel);
    if (dados.emissao) set('cop-emissao', dados.emissao);
    if (dados.banda) {
      const sel = document.getElementById('cop-banda');
      if (sel) sel.value = dados.banda;
    }
    if (dados.multaAtraso) setMoney('cop-extra-0', dados.multaAtraso);
    if (dados.jurosConta) setMoney('cop-extra-1', dados.jurosConta);
    if (dados.acrescimoMoratorio) setMoney('cop-extra-2', dados.acrescimoMoratorio);
    if (dados.contIlumin) setMoney('cop-extra-3', dados.contIlumin);

    // Abre detalhes automaticamente
    const det = document.querySelector('details');
    if (det) det.open = true;
  }

  // Campos Sanepar
  if (tipo === 'sanepar') {
    set('san-matricula', dados.matricula);
    set('san-hidrometro', dados.hidrometro);
    set('san-leit-ant', dados.leituraAnterior);
    set('san-leit-atual', dados.leituraAtual);
    set('san-prox-leit', sanISOParaBr(dados.proximaLeitura));
    set('san-ctrl', dados.ctrl);
    if (dados.valor) set('fatura-valor', Number(dados.valor).toFixed(2).replace('.', ','));
    // multas e juros viram linhas da lista "serviços lançados" (a primeira linha vazia é reaproveitada)
    [['MULTA ÁGUA', dados.multaAgua], ['MULTA ESGOTO', dados.multaEsgoto], ['JUROS MORATORIOS', dados.jurosMoratorios]].forEach(([desc, val]) => {
      if (!val) return;
      let linha = [...document.querySelectorAll('#san-serv-lista .row')].find(r => !r.querySelector('.sv-desc').value && !r.querySelector('.sv-val').value);
      if (!linha) { sanAddServico(); linha = [...document.querySelectorAll('#san-serv-lista .row')].pop(); }
      linha.querySelector('.sv-desc').value = desc;
      linha.querySelector('.sv-val').value = Number(val).toFixed(2).replace('.', ',');
    });
    sanPreencherMesesHist();
    calcularSan();
  }

  // Campos Inova
  if (tipo === 'inova') {
    set('inova-periodo', dados.periodo);
    set('inova-contrato', dados.contrato);
    set('inova-pix', dados.pix);
    set('inova-nr-doc', dados.nrDocumento);
    if (dados.emissao) set('inova-emissao', dados.emissao);
    calcularPrazoInova();
  }

  // Feedback visual
  showAlert('✅', 'PDF lido com sucesso! Revise os campos antes de salvar.');
}
