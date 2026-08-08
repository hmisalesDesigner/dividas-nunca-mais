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

  page.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;">
      <div class="saldo-card">
        <div class="label">📅 Total este Mês</div>
        <div class="value">${formatarMoeda(totalMes)}</div>
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
      <button onclick="abrirModalNovaFatura('inova')" style="background:linear-gradient(135deg,#E8420D,#c73500);color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(232,66,13,0.4);">🌐 Nova Fatura Inova</button>
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
  `;
}

let filtroContaTipo = '', filtroContaStatus = '';
function filtrarFaturas(tipo, valor) {
  if (tipo === 'tipo') filtroContaTipo = valor;
  if (tipo === 'status') filtroContaStatus = valor;
  document.getElementById('tabela-faturas').innerHTML = renderTabelaFaturas();
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
    ${formBasico(tipo)}
    <details style="margin-bottom:16px;">
      <summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--text-secondary);padding:10px;background:var(--bg-primary);border-radius:8px;">
        + Detalhes (opcional)
      </summary>
      <div style="margin-top:12px;">
        ${formDetalhes(tipo)}
      </div>
    </details>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primary" onclick="salvarFatura()">💾 Salvar Fatura</button>
    </div>
  `, '640px');

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
    ${tipo === 'sanepar' ? '<div class="form-group"><label>Matrícula</label><input id="san-matricula" type="text" placeholder="Ex: 2187.9436" /></div>' : ''}
    <div class="form-row">
      <div class="form-group">
        <label>Valor Original (R$) *</label>
        <input id="fatura-valor" type="text" placeholder="R$ 0,00" oninput="formatMoney(this);calcularValorPagar()" style="font-size:15px;font-weight:700;" />
      </div>
      ${tipo === 'inova' ? `
      <div class="form-group">
        <label>Desconto até Vencimento (R$)</label>
        <input id="fatura-desconto" type="text" value="R$ 20,00" oninput="formatMoney(this);calcularValorPagar()" style="color:var(--green);" />
      </div>` : '<div class="form-group"><label>Desconto (R$)</label><input id="fatura-desconto" type="text" placeholder="R$ 0,00" oninput="formatMoney(this);calcularValorPagar()" style="color:var(--green);" /></div>'}
    </div>
    <div style="background:rgba(34,197,94,0.1);border:1px solid var(--green);border-radius:8px;padding:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:13px;color:var(--green);">💰 Valor a pagar:</span>
      <span id="valor-pagar-preview" style="font-size:20px;font-weight:700;color:var(--green);">R$ 0,00</span>
    </div>
    ${conc.unidade ? `
    <div class="form-row">
      <div class="form-group">
        <label>Consumo (${conc.unidade}) *</label>
        <input id="fatura-consumo" type="number" placeholder="0" min="0" />
      </div>
      <div class="form-group">
        <label>Nº Dias</label>
        <input id="fatura-dias" type="number" placeholder="30" />
      </div>
    </div>` : ''}
    <div class="form-group">
      <label>🧾 Nº NF para Cashback (Nota Paraná / Dinheiro na Nota)</label>
      <input id="fatura-nf-cashback" type="text" placeholder="Nº da Nota Fiscal" />
    </div>
    <div class="form-group">
      <label>Observações</label>
      <textarea id="fatura-obs" placeholder="Ex: Inclui consumo da edícula" style="min-height:60px;"></textarea>
    </div>
  `;
}

function formDetalhes(tipo) {
  if (tipo === 'copel') return `
    <h4 style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;">⚡ Valores Cobrados a Mais</h4>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
      ${['Multa por Atraso','Juros Conta Anterior','Acréscimo Moratório','Cont. Ilum. Pública','Energia Cons. B.Amarela','Uso Sistema'].map((s,i) =>
        '<div class="form-group"><label style="font-size:11px;">' + s + '</label><input type="text" id="cop-extra-' + i + '" placeholder="R$ 0,00" oninput="formatMoney(this)" /></div>'
      ).join('')}
    </div>
    <h4 style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;">📊 Leituras</h4>
    <div class="form-row">
      <div class="form-group">
        <label>Medidor</label>
        <input id="cop-medidor" type="text" placeholder="Ex: 0760801802" />
      </div>
      <div class="form-group">
        <label>Leitura Anterior (KWh)</label>
        <input id="cop-leit-ant" type="number" placeholder="9494" oninput="calcularConsumo()" />
      </div>
      <div class="form-group">
        <label>Leitura Atual (KWh)</label>
        <input id="cop-leit-atual" type="number" placeholder="9790" oninput="calcularConsumo()" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Banda Tarifária</label>
        <select id="cop-banda">
          <option value="Verde">🟢 Verde</option>
          <option value="Amarela" selected>🟡 Amarela</option>
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
        <input id="cop-classif" type="text" placeholder="Ex: B1 Residencial" />
      </div>
    </div>
    <h4 style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;">🧾 Nota Fiscal</h4>
    <div class="form-row">
      <div class="form-group">
        <label>Nº Nota Fiscal</label>
        <input id="cop-nf" type="text" placeholder="Ex: 242425413" />
      </div>
      <div class="form-group">
        <label>Chave de Acesso</label>
        <input id="cop-chave" type="text" placeholder="4126 0704..." style="font-family:monospace;font-size:11px;" />
      </div>
    </div>
    <div class="form-group">
      <label>Linha Digitável</label>
      <input id="cop-linha-dig" type="text" placeholder="23790.04902..." style="font-family:monospace;font-size:11px;" />
    </div>
  `;

  if (tipo === 'sanepar') return `
    <h4 style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;">💧 Descrição dos Serviços Lançados</h4>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
      ${['AT. Monet. p/ Atraso','Multa Água','Multa Esgoto','Juros Moratórios','Taxa Coleta Lixo'].map((s,i) =>
        '<div class="form-group"><label style="font-size:11px;">' + s + '</label><input type="text" id="san-extra-' + i + '" placeholder="R$ 0,00" oninput="formatMoney(this)" /></div>'
      ).join('')}
    </div>
    <h4 style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;">💰 Faixas de Consumo (Valor m³/R$)</h4>
    <div style="background:var(--bg-primary);border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <div style="display:grid;grid-template-columns:1.5fr 80px 100px 100px 100px;gap:0;padding:8px 12px;border-bottom:1px solid var(--border);font-size:11px;color:var(--text-secondary);font-weight:600;">
        <span>Faixa</span><span>Volume m³</span><span>Preço m³ Água</span><span>Total Água</span><span>Total Esgoto</span>
      </div>
      ${['Res. Mínimo','De 6 a 10m³','De 11 a 15m³','De 16 a 20m³','Acima 20m³'].map((f,i) =>
        '<div style="display:grid;grid-template-columns:1.5fr 80px 100px 100px 100px;gap:0;padding:6px 12px;border-bottom:1px solid var(--border);align-items:center;">'
        + '<span style="font-size:12px;">' + f + '</span>'
        + '<input type="number" id="san-fx-vol-' + i + '" placeholder="0" style="background:transparent;border:none;color:var(--text-primary);font-size:12px;padding:2px;" />'
        + '<input type="text" id="san-fx-preco-' + i + '" placeholder="0,00" style="background:transparent;border:none;color:var(--yellow);font-size:12px;padding:2px;" />'
        + '<input type="text" id="san-fx-agua-' + i + '" placeholder="0,00" style="background:transparent;border:none;color:var(--text-primary);font-size:12px;padding:2px;" />'
        + '<input type="text" id="san-fx-esgoto-' + i + '" placeholder="0,00" style="background:transparent;border:none;color:var(--text-secondary);font-size:12px;padding:2px;" />'
        + '</div>'
      ).join('')}
    </div>
    <h4 style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;">📊 Leituras</h4>
    <div class="form-row">
      <div class="form-group">
        <label>Hidrômetro</label>
        <input id="san-hidrometro" type="text" placeholder="Ex: Y25LN0176138-4-1" />
      </div>
      <div class="form-group">
        <label>Leitura Anterior (m³)</label>
        <input id="san-leit-ant" type="number" oninput="calcularConsumoSan()" />
      </div>
      <div class="form-group">
        <label>Leitura Atual (m³)</label>
        <input id="san-leit-atual" type="number" oninput="calcularConsumoSan()" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Data da Leitura</label>
        <input id="san-data-leit" type="date" />
      </div>
      <div class="form-group">
        <label>Próxima Leitura</label>
        <input id="san-prox-leit" type="date" />
      </div>
      <div class="form-group">
        <label>Média m³ (5 meses)</label>
        <input id="san-media" type="number" placeholder="19" />
      </div>
    </div>
    <div class="form-group">
      <label>CTRL</label>
      <input id="san-ctrl" type="text" placeholder="Ex: 2187.9436.0726.3100" style="font-family:monospace;" />
    </div>
  `;

  if (tipo === 'inova') return `
    <div class="form-row">
      <div class="form-group">
        <label>Período do Serviço</label>
        <input id="inova-periodo" type="text" placeholder="Ex: 16/07/2026 a 15/08/2026" />
      </div>
      <div class="form-group">
        <label>Contrato</label>
        <input id="inova-contrato" type="text" placeholder="Ex: 23639" />
      </div>
    </div>
    <div class="form-group">
      <label>Prazo Máximo (28 dias após vencimento)</label>
      <input id="inova-prazo-max" type="date" readonly style="opacity:0.7;" />
    </div>
    <div class="form-group">
      <label>PIX Copia e Cola</label>
      <textarea id="inova-pix" placeholder="00020126910014br.gov.bcb.pix..." style="font-family:monospace;font-size:11px;min-height:60px;"></textarea>
    </div>
    <div class="form-group">
      <label>Linha Digitável</label>
      <input id="inova-linha-dig" type="text" placeholder="74891.12636..." style="font-family:monospace;font-size:11px;" />
    </div>
  `;

  if (tipo === 'sercomtel') return `
    <div class="form-row">
      <div class="form-group">
        <label>Nº da Fatura</label>
        <input id="sercom-nr" type="text" placeholder="Número da fatura" />
      </div>
      <div class="form-group">
        <label>Linha Digitável</label>
        <input id="sercom-linha" type="text" placeholder="Código de barras" style="font-family:monospace;" />
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

// ===== SALVAR =====
function salvarFatura() {
  const tipo = document.getElementById('fatura-tipo')?.value;
  const vencimento = document.getElementById('fatura-vencimento')?.value;
  const valor = parseMoney(document.getElementById('fatura-valor')?.value);
  if (!vencimento) { showAlert('⚠️', 'Informe o vencimento.'); return; }
  if (!valor || valor <= 0) { showAlert('⚠️', 'Informe o valor.'); return; }

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
    extras = {
      matricula: get('san-matricula'),
      hidrometro: get('san-hidrometro'),
      leituraAnterior: get('san-leit-ant'),
      leituraAtual: get('san-leit-atual'),
      dataLeitura: get('san-data-leit'),
      proximaLeitura: get('san-prox-leit'),
      media: get('san-media'),
      ctrl: get('san-ctrl'),
      extras: {
        atMonet: getMoney('san-extra-0'),
        multaAgua: getMoney('san-extra-1'),
        multaEsgoto: getMoney('san-extra-2'),
        jurosMoratorios: getMoney('san-extra-3'),
        taxaLixo: getMoney('san-extra-4')
      },
      faixas: [0,1,2,3,4].map(i => ({
        volume: parseFloat(document.getElementById('san-fx-vol-'+i)?.value) || 0,
        precoM3: document.getElementById('san-fx-preco-'+i)?.value || '',
        totalAgua: document.getElementById('san-fx-agua-'+i)?.value || '',
        totalEsgoto: document.getElementById('san-fx-esgoto-'+i)?.value || ''
      })).filter(f => f.volume > 0)
    };
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
    referencia: get('fatura-referencia'),
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

  if (f.extras) {
    const itens = Object.entries(f.extras).filter(([k,v]) => v > 0);
    if (itens.length > 0) {
      html += '<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:12px;margin-bottom:12px;">'
        + '<div style="font-size:12px;font-weight:600;color:var(--red);margin-bottom:8px;">⚠️ Cobranças Adicionais</div>'
        + itens.map(([k,v]) => '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span style="color:var(--text-secondary);">' + k + '</span><span style="color:var(--red);font-weight:600;">' + formatarMoeda(v) + '</span></div>').join('')
        + '<div style="border-top:1px solid rgba(239,68,68,0.2);margin-top:6px;padding-top:6px;display:flex;justify-content:space-between;font-size:13px;font-weight:700;"><span>Total Extras</span><span style="color:var(--red);">' + formatarMoeda(itens.reduce((s,[k,v]) => s+v, 0)) + '</span></div>'
        + '</div>';
    }
  }

  if (f.faixas && f.faixas.length > 0) {
    html += '<div style="background:var(--bg-secondary);border-radius:8px;padding:12px;margin-bottom:12px;">'
      + '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">💧 Faixas de Consumo</div>'
      + f.faixas.map(fx => '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span>' + fx.volume + ' m³ × ' + (fx.precoM3 || '-') + '</span><span style="color:var(--blue);">R$ ' + (fx.totalAgua || '0') + ' água / R$ ' + (fx.totalEsgoto || '0') + ' esgoto</span></div>').join('')
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
        <h2 style="font-size:18px;font-weight:700;">Copel — Energia Elétrica</h2>
        <p style="font-size:13px;color:var(--text-secondary);">Histórico e índices de consumo</p>
      </div>
      <button class="btn-primary" style="margin-left:auto;background:#003399;" onclick="abrirModalNovaFatura('copel')">+ Nova Fatura</button>
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
        <h2 style="font-size:18px;font-weight:700;">Sanepar — Água e Esgoto</h2>
        <p style="font-size:13px;color:var(--text-secondary);">Histórico e índices de consumo</p>
      </div>
      <button class="btn-primary" style="margin-left:auto;background:#0077b6;" onclick="abrirModalNovaFatura('sanepar')">+ Nova Fatura</button>
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

function renderExtrasCard(extras, icon) {
  const itens = Object.entries(extras).filter(([k,v]) => v > 0);
  if (itens.length === 0) return '';
  const totalExtras = itens.reduce((s,[k,v]) => s+v, 0);
  return '<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:16px;margin-bottom:20px;">'
    + '<div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:12px;">' + icon + ' Cobranças Extras — Última Fatura</div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">'
    + itens.map(([k,v]) => '<div style="background:var(--bg-card);border-radius:8px;padding:10px;"><div style="font-size:11px;color:var(--text-secondary);">' + k + '</div><div style="font-size:15px;font-weight:700;color:var(--red);">' + formatarMoeda(v) + '</div></div>').join('')
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
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#666', font: { size: 10 } } }, y: { ticks: { color: '#666' } } } }
  });

  const el2 = document.getElementById('chart-copel-valor');
  if (el2) new Chart(el2, {
    type: 'line',
    data: { labels, datasets: [{ label: 'R$', data: valores, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#666', font: { size: 10 } } }, y: { ticks: { color: '#666', callback: v => 'R$' + v } } } }
  });
}

function renderChartsSanepar(faturas) {
  const labels = faturas.map(f => f.referencia || formatarData(f.vencimento));
  const m3 = faturas.map(f => f.consumo || 0);
  const valores = faturas.map(f => f.valorPagar || f.valor || 0);

  const el1 = document.getElementById('chart-san-m3');
  if (el1) new Chart(el1, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'm³', data: m3, backgroundColor: '#0077b6', borderRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#666', font: { size: 10 } } }, y: { ticks: { color: '#666' } } } }
  });

  const el2 = document.getElementById('chart-san-valor');
  if (el2) new Chart(el2, {
    type: 'line',
    data: { labels, datasets: [{ label: 'R$', data: valores, borderColor: '#0077b6', backgroundColor: 'rgba(0,119,182,0.1)', fill: true, tension: 0.4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#666', font: { size: 10 } } }, y: { ticks: { color: '#666', callback: v => 'R$' + v } } } }
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
