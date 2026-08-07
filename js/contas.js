// ===== CONTAS RECORRENTES =====

const CONCESSIONARIAS = {
  copel: {
    nome: 'Copel',
    logo: '⚡',
    cor: '#003399',
    unidade: 'KWh',
    tipo: 'energia'
  },
  sanepar: {
    nome: 'Sanepar',
    logo: '💧',
    cor: '#0077b6',
    unidade: 'm³',
    tipo: 'agua'
  },
  inova: {
    nome: 'Inova Fibra',
    logo: '🌐',
    cor: '#e63946',
    unidade: null,
    tipo: 'internet'
  },
  sercomtel: {
    nome: 'Sercomtel',
    logo: '📞',
    cor: '#2d6a4f',
    unidade: null,
    tipo: 'telefone'
  },
  outro: {
    nome: 'Outro',
    logo: '📄',
    cor: '#666',
    unidade: null,
    tipo: 'outro'
  }
};

// Inicializa dados
if (!DB.contas) DB.contas = [];
if (!DB.faturas) DB.faturas = [];
if (!DB.unidadesConsumidoras) DB.unidadesConsumidoras = [
  { id: 1, apelido: 'Casa do Meio', tipo: 'copel', ucAneel: '189811103131', ucAntiga: '47443162(B)', titular: 'Margarida Trujilio', ativa: true, obs: 'Inclui consumo da edícula (gato)' },
  { id: 2, apelido: 'Salão Comercial', tipo: 'copel', ucAneel: '77229603141', ucAntiga: '', titular: '', ativa: false, obs: 'Desativado' },
  { id: 3, apelido: 'Edícula', tipo: 'copel', ucAneel: '77229503156', ucAntiga: '', titular: '', ativa: false, obs: 'Sem fatura - gato na casa do meio' },
];

function renderContas() {
  const page = document.getElementById('page-contas');

  // Totais
  const faturasMes = DB.faturas.filter(f => {
    const d = new Date(f.vencimento);
    const hoje = new Date();
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  });
  const totalMes = faturasMes.reduce((s, f) => s + (f.valorPagar || f.valor || 0), 0);
  const atrasadas = DB.faturas.filter(f => {
    if (f.pago) return false;
    return new Date(f.vencimento) < new Date();
  });

  page.innerHTML = `
    <!-- Resumo -->
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

    <!-- Toolbar -->
    <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
      <button class="btn-primary" onclick="abrirModalNovaFatura('copel')">⚡ Nova Fatura Copel</button>
      <button class="btn-primary" style="background:#0077b6;" onclick="abrirModalNovaFatura('sanepar')">💧 Nova Fatura Sanepar</button>
      <button class="btn-primary" style="background:#e63946;" onclick="abrirModalNovaFatura('inova')">🌐 Nova Fatura Inova</button>
      <button class="btn-secondary" onclick="abrirModalNovaFatura('sercomtel')">📞 Sercomtel</button>
      <button class="btn-secondary" onclick="abrirModalNovaFatura('outro')">📄 Outra</button>
      <button class="btn-secondary" onclick="abrirModalUnidades()">🏠 Unid. Consumidoras</button>
    </div>

    <!-- Lista de faturas -->
    <div class="card">
      <div class="section-header">
        <h3>📋 Faturas Cadastradas</h3>
        <div style="display:flex;gap:8px;">
          <select class="filter" onchange="filtrarFaturas('tipo', this.value)">
            <option value="">Todas</option>
            <option value="copel">⚡ Copel</option>
            <option value="sanepar">💧 Sanepar</option>
            <option value="inova">🌐 Inova Fibra</option>
            <option value="sercomtel">📞 Sercomtel</option>
          </select>
          <select class="filter" onchange="filtrarFaturas('status', this.value)">
            <option value="">Todos Status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="atrasado">Atrasado</option>
          </select>
        </div>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Concessionária</th>
              <th>Referência</th>
              <th>Vencimento</th>
              <th>Consumo</th>
              <th>Valor Original</th>
              <th>Desconto</th>
              <th>Valor a Pagar</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="tabela-faturas">${renderTabelaFaturas()}</tbody>
        </table>
      </div>
    </div>

    <!-- Histórico de consumo -->
    ${DB.faturas.length > 0 ? `
    <div class="card" style="margin-top:16px;">
      <h3 style="font-size:14px;font-weight:600;margin-bottom:16px;">📊 Histórico de Consumo</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div>
          <h4 style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">⚡ Copel (KWh)</h4>
          <canvas id="chart-copel-hist" height="150"></canvas>
        </div>
        <div>
          <h4 style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">💧 Sanepar (m³)</h4>
          <canvas id="chart-sanepar-hist" height="150"></canvas>
        </div>
      </div>
    </div>` : ''}
  `;

  setTimeout(() => renderHistoricoCharts(), 100);
}

let filtroContaTipo = '';
let filtroContaStatus = '';

function filtrarFaturas(tipo, valor) {
  if (tipo === 'tipo') filtroContaTipo = valor;
  if (tipo === 'status') filtroContaStatus = valor;
  document.getElementById('tabela-faturas').innerHTML = renderTabelaFaturas();
}

function renderTabelaFaturas() {
  let faturas = [...DB.faturas].sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento));
  if (filtroContaTipo) faturas = faturas.filter(f => f.tipo === filtroContaTipo);
  if (filtroContaStatus) faturas = faturas.filter(f => getStatusFatura(f) === filtroContaStatus);

  if (faturas.length === 0) return `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">📄</div><p>Nenhuma fatura cadastrada.</p></div></td></tr>`;

  return faturas.map(f => {
    const conc = CONCESSIONARIAS[f.tipo] || CONCESSIONARIAS.outro;
    const status = getStatusFatura(f);
    const diasAtraso = status === 'atrasado' ? Math.floor((new Date() - new Date(f.vencimento)) / (1000*60*60*24)) : 0;
    return `<tr>
      <td><span style="font-size:18px;">${conc.logo}</span> <strong>${conc.nome}</strong>${f.apelido ? '<br><span style="font-size:11px;color:var(--text-secondary);">' + f.apelido + '</span>' : ''}</td>
      <td>${f.referencia || '-'}</td>
      <td>${formatarData(f.vencimento)}${diasAtraso > 0 ? '<br><span style="color:var(--red);font-size:11px;">'+diasAtraso+'d atraso</span>' : ''}</td>
      <td>${f.consumo ? f.consumo + ' ' + (conc.unidade || '') : '-'}</td>
      <td>${formatarMoeda(f.valor)}</td>
      <td style="color:var(--green)">${f.desconto ? '- ' + formatarMoeda(f.desconto) : '-'}</td>
      <td><strong>${formatarMoeda(f.valorPagar || f.valor)}</strong></td>
      <td><span class="badge ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn-secondary btn-sm" onclick="verDetalhesFatura(${f.id})" title="Ver detalhes">👁️</button>
          <button class="btn-secondary btn-sm" onclick="editarFatura(${f.id})" title="Editar">✏️</button>
          ${!f.pago ? `<button class="btn-primary btn-sm" onclick="marcarFaturaPaga(${f.id})" title="Marcar paga">✅</button>` : ''}
          <button class="btn-danger btn-sm" onclick="excluirFatura(${f.id})" title="Excluir">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function getStatusFatura(f) {
  if (f.pago) return 'pago';
  if (new Date(f.vencimento) < new Date()) return 'atrasado';
  return 'pendente';
}

// ===== FORMULÁRIOS ESPECÍFICOS =====

function abrirModalNovaFatura(tipo) {
  const conc = CONCESSIONARIAS[tipo];
  let formHtml = '';

  switch(tipo) {
    case 'copel': formHtml = formCopel(); break;
    case 'sanepar': formHtml = formSanepar(); break;
    case 'inova': formHtml = formInova(); break;
    case 'sercomtel': formHtml = formSercomtel(); break;
    default: formHtml = formGenerico(); break;
  }

  abrirModal(`${conc.logo} Nova Fatura — ${conc.nome}`, `
    <input type="hidden" id="fatura-tipo" value="${tipo}" />
    ${formHtml}
    <div class="modal-actions">
      <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primary" onclick="salvarFatura()">💾 Salvar Fatura</button>
    </div>
  `, '720px');

  // Preenche select de unidades consumidoras Copel
  if (tipo === 'copel') {
    const sel = document.getElementById('fatura-uc');
    if (sel) {
      DB.unidadesConsumidoras.filter(u => u.tipo === 'copel').forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.apelido + ' (' + u.ucAneel + ')';
        sel.appendChild(opt);
      });
    }
  }
}

function formCopel() {
  return `
    <div style="background:rgba(0,51,153,0.08);border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;color:#93c5fd;">
      ⚡ DANF3E — Nota Fiscal Eletrônica de Energia Elétrica — Copel Distribuição S.A.
    </div>

    <h4 style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;text-transform:uppercase;">📋 Identificação</h4>
    <div class="form-row">
      <div class="form-group">
        <label>Unidade Consumidora</label>
        <select id="fatura-uc"><option value="">Selecionar...</option></select>
      </div>
      <div class="form-group">
        <label>Referência (Mês/Ano)</label>
        <input id="fatura-referencia" type="month" />
      </div>
    </div>
    <div class="form-row-3">
      <div class="form-group">
        <label>Classificação</label>
        <input id="copel-classificacao" type="text" value="B1 Residencial / Residencial" />
      </div>
      <div class="form-group">
        <label>Tipo de Fornecimento</label>
        <input id="copel-fornecimento" type="text" placeholder="Ex: Monofasico /50A" />
      </div>
      <div class="form-group">
        <label>Banda Tarifária</label>
        <select id="copel-banda">
          <option value="Verde">🟢 Verde</option>
          <option value="Amarela">🟡 Amarela</option>
          <option value="Vermelha 1">🔴 Vermelha 1</option>
          <option value="Vermelha 2">🔴 Vermelha 2</option>
          <option value="Escassez">⚫ Escassez</option>
        </select>
      </div>
    </div>

    <h4 style="font-size:13px;color:var(--text-secondary);margin:16px 0 12px;text-transform:uppercase;">🧾 Nota Fiscal</h4>
    <div class="form-row">
      <div class="form-group">
        <label>Nº Nota Fiscal</label>
        <input id="copel-nf" type="text" placeholder="Ex: 242425413" />
      </div>
      <div class="form-group">
        <label>Série</label>
        <input id="copel-serie" type="text" placeholder="Ex: 3" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Data de Emissão</label>
        <input id="copel-emissao" type="date" />
      </div>
      <div class="form-group">
        <label>Período Fiscal</label>
        <input id="copel-periodo-fiscal" type="date" />
      </div>
    </div>
    <div class="form-group">
      <label>Chave de Acesso</label>
      <input id="copel-chave" type="text" placeholder="4126 0704 3688 9800 0106..." style="font-family:monospace;font-size:12px;" />
    </div>
    <div class="form-group">
      <label>Protocolo de Autorização</label>
      <input id="copel-protocolo" type="text" placeholder="Ex: 1412600034899588" />
    </div>

    <h4 style="font-size:13px;color:var(--text-secondary);margin:16px 0 12px;text-transform:uppercase;">📊 Leituras</h4>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">
      <div class="form-group">
        <label>Medidor</label>
        <input id="copel-medidor" type="text" placeholder="Ex: 0760801802" />
      </div>
      <div class="form-group">
        <label>Leitura Anterior</label>
        <input id="copel-leit-ant" type="number" placeholder="9494" />
      </div>
      <div class="form-group">
        <label>Leitura Atual</label>
        <input id="copel-leit-atual" type="number" placeholder="9790" oninput="calcularConsumo()" />
      </div>
      <div class="form-group">
        <label>Nº Dias</label>
        <input id="copel-dias" type="number" placeholder="30" />
      </div>
      <div class="form-group">
        <label>Consumo KWh</label>
        <input id="fatura-consumo" type="number" placeholder="296" style="background:rgba(34,197,94,0.1);" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Data Leitura Anterior</label>
        <input id="copel-data-ant" type="date" />
      </div>
      <div class="form-group">
        <label>Data Leitura Atual</label>
        <input id="copel-data-atual" type="date" />
      </div>
      <div class="form-group">
        <label>Próxima Leitura</label>
        <input id="copel-prox-leit" type="date" />
      </div>
    </div>

    <h4 style="font-size:13px;color:var(--text-secondary);margin:16px 0 12px;text-transform:uppercase;">💰 Itens da Fatura</h4>
    <div style="background:var(--bg-primary);border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <div style="display:grid;grid-template-columns:2fr 80px 100px 100px 80px 80px 80px;gap:0;padding:8px 12px;border-bottom:1px solid var(--border);font-size:11px;color:var(--text-secondary);font-weight:600;">
        <span>Item</span><span>Unid.</span><span>Qtd.</span><span>Preço Unit.</span><span>Valor</span><span>PIS/COFINS</span><span>ICMS</span>
      </div>
      ${['Energia Elet Consumo','Energia Elet Uso Sistema','Energia Cons. B.Amarela','Multa por Atraso','Juros Conta Anterior','Acréscimo Moratório','Cont. Ilumin. Pública Município'].map((item, i) => `
        <div style="display:grid;grid-template-columns:2fr 80px 100px 100px 80px 80px 80px;gap:0;padding:6px 12px;border-bottom:1px solid var(--border);align-items:center;">
          <span style="font-size:12px;">${item}</span>
          <span style="font-size:11px;color:var(--text-muted);">${i < 3 ? 'kWh' : 'UN'}</span>
          <input type="number" id="cop-item-qtd-${i}" placeholder="0" style="background:transparent;border:none;color:var(--text-primary);font-size:12px;padding:2px;" />
          <input type="text" id="cop-item-preco-${i}" placeholder="0,000000" style="background:transparent;border:none;color:var(--text-primary);font-size:12px;padding:2px;font-family:monospace;" />
          <input type="text" id="cop-item-valor-${i}" placeholder="0,00" oninput="formatMoneyInline(this);calcularTotalCopel()" style="background:transparent;border:none;color:var(--text-primary);font-size:12px;padding:2px;" />
          <input type="text" id="cop-item-pis-${i}" placeholder="0,00" style="background:transparent;border:none;color:var(--text-secondary);font-size:11px;padding:2px;" />
          <input type="text" id="cop-item-icms-${i}" placeholder="0,00" style="background:transparent;border:none;color:var(--text-secondary);font-size:11px;padding:2px;" />
        </div>
      `).join('')}
    </div>

    <h4 style="font-size:13px;color:var(--text-secondary);margin:16px 0 12px;text-transform:uppercase;">🏛️ Tributos</h4>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
      ${['ICMS','COFINS','PIS'].map((t, i) => `
        <div style="background:var(--bg-primary);border-radius:8px;padding:10px;">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">${t}</div>
          <div class="form-row">
            <div class="form-group" style="margin:0;">
              <label style="font-size:10px;">Base (R$)</label>
              <input type="text" id="cop-trib-base-${i}" placeholder="0,00" style="font-size:12px;" />
            </div>
            <div class="form-group" style="margin:0;">
              <label style="font-size:10px;">Alíquota (%)</label>
              <input type="text" id="cop-trib-aliq-${i}" placeholder="0%" style="font-size:12px;" />
            </div>
            <div class="form-group" style="margin:0;">
              <label style="font-size:10px;">Valor (R$)</label>
              <input type="text" id="cop-trib-valor-${i}" placeholder="0,00" style="font-size:12px;" />
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <h4 style="font-size:13px;color:var(--text-secondary);margin:16px 0 12px;text-transform:uppercase;">💳 Pagamento</h4>
    <div class="form-row">
      <div class="form-group">
        <label>Vencimento *</label>
        <input id="fatura-vencimento" type="date" />
      </div>
      <div class="form-group">
        <label>Total a Pagar (R$) *</label>
        <input id="fatura-valor" type="text" placeholder="R$ 0,00" oninput="formatMoney(this)" style="font-size:16px;font-weight:700;" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Linha Digitável</label>
        <input id="copel-linha-dig" type="text" placeholder="23790.04902..." style="font-family:monospace;font-size:12px;" />
      </div>
      <div class="form-group">
        <label>Nº Documento</label>
        <input id="copel-nr-doc" type="text" placeholder="FAT-01-..." />
      </div>
    </div>
    <div class="form-group">
      <label>Nota Fiscal para Dinheiro na Nota / Nota Paraná</label>
      <div style="display:flex;gap:10px;align-items:center;">
        <input id="copel-nf-cashback" type="text" placeholder="Nº da NF para cashback" style="flex:1;" />
        <span style="font-size:11px;color:var(--green);">🧾 Pode gerar cashback!</span>
      </div>
    </div>
    <div class="form-group">
      <label>Observações</label>
      <textarea id="fatura-obs" placeholder="Ex: Inclui consumo da edícula"></textarea>
    </div>
  `;
}

function formSanepar() {
  return `
    <div style="background:rgba(0,119,182,0.08);border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;color:#93c5fd;">
      💧 Companhia de Saneamento do Paraná — Fatura de Água e Esgoto
    </div>

    <h4 style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;text-transform:uppercase;">📋 Identificação</h4>
    <div class="form-row">
      <div class="form-group">
        <label>Matrícula *</label>
        <input id="san-matricula" type="text" placeholder="Ex: 2187.9436" />
      </div>
      <div class="form-group">
        <label>Referência (Mês/Ano)</label>
        <input id="fatura-referencia" type="month" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Hidrômetro</label>
        <input id="san-hidrometro" type="text" placeholder="Ex: Y25LN0176138-4-1" />
      </div>
      <div class="form-group">
        <label>Roteiro de Leitura</label>
        <input id="san-roteiro" type="text" placeholder="Ex: 167-09-25-010-57382" />
      </div>
    </div>
    <div class="form-group">
      <label>Nome do Cliente</label>
      <input id="san-cliente" type="text" placeholder="Ex: Margarida Trujilio Misales Escudero" />
    </div>

    <h4 style="font-size:13px;color:var(--text-secondary);margin:16px 0 12px;text-transform:uppercase;">📊 Leituras</h4>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">
      <div class="form-group">
        <label>Leitura Anterior (m³)</label>
        <input id="san-leit-ant" type="number" placeholder="173" />
      </div>
      <div class="form-group">
        <label>Leitura Atual (m³)</label>
        <input id="san-leit-atual" type="number" placeholder="190" oninput="calcularConsumoSanepar()" />
      </div>
      <div class="form-group">
        <label>Consumo (m³)</label>
        <input id="fatura-consumo" type="number" placeholder="17" style="background:rgba(34,197,94,0.1);" />
      </div>
      <div class="form-group">
        <label>Nº Dias</label>
        <input id="san-dias" type="number" placeholder="31" />
      </div>
      <div class="form-group">
        <label>Média m³ (5 meses)</label>
        <input id="san-media" type="number" placeholder="19" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Data Leitura</label>
        <input id="san-data-leit" type="date" />
      </div>
      <div class="form-group">
        <label>Previsão Próxima Leitura</label>
        <input id="san-prox-leit" type="date" />
      </div>
      <div class="form-group">
        <label>Motivo Ausência Leitura</label>
        <input id="san-motivo-ausencia" type="text" placeholder="Deixar em branco se houver leitura" />
      </div>
    </div>

    <h4 style="font-size:13px;color:var(--text-secondary);margin:16px 0 12px;text-transform:uppercase;">💰 Faixas de Consumo</h4>
    <div style="background:var(--bg-primary);border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <div style="display:grid;grid-template-columns:1fr 80px 80px 80px 80px;gap:0;padding:8px 12px;border-bottom:1px solid var(--border);font-size:11px;color:var(--text-secondary);font-weight:600;">
        <span>Faixa</span><span>Volume (m³)</span><span>Valor m³ Água</span><span>Total Água</span><span>Total Esgoto</span>
      </div>
      ${['Res. Mínimo','De 6 a 10m³','De 11 a 15m³','De 16 a 20m³','Acima 20m³'].map((f, i) => `
        <div style="display:grid;grid-template-columns:1fr 80px 80px 80px 80px;gap:0;padding:6px 12px;border-bottom:1px solid var(--border);align-items:center;">
          <span style="font-size:12px;">${f}</span>
          <input type="number" id="san-fx-vol-${i}" placeholder="0" style="background:transparent;border:none;color:var(--text-primary);font-size:12px;padding:2px;" />
          <input type="text" id="san-fx-preco-${i}" placeholder="0,00" style="background:transparent;border:none;color:var(--text-primary);font-size:12px;padding:2px;" />
          <input type="text" id="san-fx-agua-${i}" placeholder="0,00" style="background:transparent;border:none;color:var(--text-primary);font-size:12px;padding:2px;" />
          <input type="text" id="san-fx-esgoto-${i}" placeholder="0,00" style="background:transparent;border:none;color:var(--text-secondary);font-size:12px;padding:2px;" />
        </div>
      `).join('')}
    </div>

    <h4 style="font-size:13px;color:var(--text-secondary);margin:16px 0 12px;text-transform:uppercase;">📋 Serviços Adicionais</h4>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
      ${['AT. Monet. p/ Atraso','Multa Água','Multa Esgoto','Juros Moratórios','Taxa Coleta Lixo'].map((s, i) => `
        <div class="form-group">
          <label style="font-size:11px;">${s}</label>
          <input type="text" id="san-serv-${i}" placeholder="R$ 0,00" oninput="formatMoney(this)" />
        </div>
      `).join('')}
    </div>

    <h4 style="font-size:13px;color:var(--text-secondary);margin:16px 0 12px;text-transform:uppercase;">💳 Pagamento</h4>
    <div class="form-row">
      <div class="form-group">
        <label>Vencimento *</label>
        <input id="fatura-vencimento" type="date" />
      </div>
      <div class="form-group">
        <label>Total a Pagar (R$) *</label>
        <input id="fatura-valor" type="text" placeholder="R$ 0,00" oninput="formatMoney(this)" style="font-size:16px;font-weight:700;" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>CTRL</label>
        <input id="san-ctrl" type="text" placeholder="Ex: 2187.9436.0726.3100" style="font-family:monospace;" />
      </div>
      <div class="form-group">
        <label>Tributos Federais (R$)</label>
        <input id="san-tributos" type="text" placeholder="Ex: R$ 19,20" />
      </div>
    </div>
    <div class="form-group">
      <label>Nota Fiscal para Dinheiro na Nota / Nota Paraná</label>
      <div style="display:flex;gap:10px;align-items:center;">
        <input id="san-nf-cashback" type="text" placeholder="Nº da NF para cashback" style="flex:1;" />
        <span style="font-size:11px;color:var(--green);">🧾 Pode gerar cashback!</span>
      </div>
    </div>
    <div class="form-group">
      <label>Observações</label>
      <textarea id="fatura-obs" placeholder="Observações adicionais"></textarea>
    </div>
  `;
}

function formInova() {
  return `
    <div style="background:rgba(230,57,70,0.08);border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;color:#fca5a5;">
      🌐 Inova Fibra Telecom Ltda — Internet via Fibra
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Referência (Mês/Ano)</label>
        <input id="fatura-referencia" type="month" />
      </div>
      <div class="form-group">
        <label>Período de Serviço</label>
        <input id="inova-periodo" type="text" placeholder="Ex: 16/07/2026 a 15/08/2026" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Nº do Documento</label>
        <input id="inova-nr-doc" type="text" placeholder="Ex: 651797" />
      </div>
      <div class="form-group">
        <label>Contrato</label>
        <input id="inova-contrato" type="text" placeholder="Ex: 23639" />
      </div>
    </div>
    <div class="form-group">
      <label>Código de Pagamento (Linha Digitável)</label>
      <input id="inova-linha-dig" type="text" placeholder="74891.12636 81690.307186..." style="font-family:monospace;font-size:12px;" />
    </div>
    <div class="form-group">
      <label>PIX Copia e Cola</label>
      <textarea id="inova-pix" placeholder="00020126910014br.gov.bcb.pix..." style="font-family:monospace;font-size:11px;min-height:60px;"></textarea>
    </div>

    <h4 style="font-size:13px;color:var(--text-secondary);margin:16px 0 12px;text-transform:uppercase;">💰 Valores</h4>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
      <div class="form-group">
        <label>Valor Original (R$) *</label>
        <input id="fatura-valor" type="text" placeholder="R$ 119,90" oninput="formatMoney(this);calcularValorInova()" style="font-weight:700;" />
      </div>
      <div class="form-group">
        <label>Desconto até Vencimento</label>
        <input id="inova-desconto" type="text" value="R$ 20,00" oninput="formatMoney(this);calcularValorInova()" style="color:var(--green);" />
      </div>
      <div class="form-group">
        <label>Multa Atraso (2%)</label>
        <input id="inova-multa" type="text" placeholder="R$ 0,00" oninput="formatMoney(this)" />
      </div>
      <div class="form-group">
        <label>Juros (1,2% a.m.)</label>
        <input id="inova-juros" type="text" placeholder="R$ 0,00" oninput="formatMoney(this)" />
      </div>
    </div>
    <div style="background:rgba(34,197,94,0.1);border:1px solid var(--green);border-radius:8px;padding:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:13px;color:var(--green);">💰 Valor a pagar com desconto:</span>
      <span id="inova-valor-final" style="font-size:18px;font-weight:700;color:var(--green);">R$ 0,00</span>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Data de Emissão</label>
        <input id="inova-emissao" type="date" />
      </div>
      <div class="form-group">
        <label>Vencimento *</label>
        <input id="fatura-vencimento" type="date" />
      </div>
      <div class="form-group">
        <label>Prazo Máximo (28 dias)</label>
        <input id="inova-prazo-max" type="date" readonly style="opacity:0.7;" />
      </div>
    </div>

    <h4 style="font-size:13px;color:var(--text-secondary);margin:16px 0 12px;text-transform:uppercase;">🏛️ Tributos</h4>
    <div class="form-row">
      <div class="form-group">
        <label>Tributos Federais (13,45%)</label>
        <input id="inova-trib-fed" type="text" placeholder="R$ 0,00" />
      </div>
      <div class="form-group">
        <label>Municipais (2,00%)</label>
        <input id="inova-trib-mun" type="text" placeholder="R$ 0,00" />
      </div>
      <div class="form-group">
        <label>Chave IBPT</label>
        <input id="inova-ibpt" type="text" placeholder="Ex: 42CA5A" />
      </div>
    </div>
    <div class="form-group">
      <label>Observações</label>
      <textarea id="fatura-obs" placeholder="Observações adicionais"></textarea>
    </div>
  `;
}

function formSercomtel() {
  return `
    <div style="background:rgba(45,106,79,0.08);border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;color:#86efac;">
      📞 Sercomtel — Telefone Fixo
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Referência (Mês/Ano)</label>
        <input id="fatura-referencia" type="month" />
      </div>
      <div class="form-group">
        <label>Nº da Fatura</label>
        <input id="sercom-nr" type="text" placeholder="Número da fatura" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Vencimento *</label>
        <input id="fatura-vencimento" type="date" />
      </div>
      <div class="form-group">
        <label>Valor (R$) *</label>
        <input id="fatura-valor" type="text" placeholder="R$ 0,00" oninput="formatMoney(this)" style="font-weight:700;" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Multa por Atraso</label>
        <input id="sercom-multa" type="text" placeholder="R$ 0,00" oninput="formatMoney(this)" />
      </div>
      <div class="form-group">
        <label>Juros</label>
        <input id="sercom-juros" type="text" placeholder="R$ 0,00" oninput="formatMoney(this)" />
      </div>
    </div>
    <div class="form-group">
      <label>Linha Digitável</label>
      <input id="sercom-linha" type="text" placeholder="Código de barras" style="font-family:monospace;" />
    </div>
    <div class="form-group">
      <label>Observações</label>
      <textarea id="fatura-obs" placeholder="Ex: Dívida com Sercomtel - telefone fixo"></textarea>
    </div>
  `;
}

function formGenerico() {
  return `
    <div class="form-row">
      <div class="form-group">
        <label>Nome da Conta *</label>
        <input id="fatura-apelido" type="text" placeholder="Ex: Conta de Luz" />
      </div>
      <div class="form-group">
        <label>Referência (Mês/Ano)</label>
        <input id="fatura-referencia" type="month" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Vencimento *</label>
        <input id="fatura-vencimento" type="date" />
      </div>
      <div class="form-group">
        <label>Valor (R$) *</label>
        <input id="fatura-valor" type="text" placeholder="R$ 0,00" oninput="formatMoney(this)" style="font-weight:700;" />
      </div>
    </div>
    <div class="form-group">
      <label>Observações</label>
      <textarea id="fatura-obs" placeholder="Observações adicionais"></textarea>
    </div>
  `;
}

// ===== CÁLCULOS AUXILIARES =====
function calcularConsumo() {
  const ant = parseFloat(document.getElementById('copel-leit-ant')?.value) || 0;
  const atual = parseFloat(document.getElementById('copel-leit-atual')?.value) || 0;
  if (ant && atual && atual > ant) {
    document.getElementById('fatura-consumo').value = atual - ant;
  }
}

function calcularConsumoSanepar() {
  const ant = parseFloat(document.getElementById('san-leit-ant')?.value) || 0;
  const atual = parseFloat(document.getElementById('san-leit-atual')?.value) || 0;
  if (ant && atual && atual > ant) {
    document.getElementById('fatura-consumo').value = atual - ant;
  }
}

function calcularValorInova() {
  const orig = parseMoney(document.getElementById('fatura-valor')?.value) || 0;
  const desc = parseMoney(document.getElementById('inova-desconto')?.value) || 0;
  const final = Math.max(0, orig - desc);
  const el = document.getElementById('inova-valor-final');
  if (el) el.textContent = formatarMoeda(final);

  // Calcula prazo máximo (28 dias após vencimento)
  const venc = document.getElementById('fatura-vencimento')?.value;
  if (venc) {
    const prazo = new Date(venc);
    prazo.setDate(prazo.getDate() + 28);
    const prazoEl = document.getElementById('inova-prazo-max');
    if (prazoEl) prazoEl.value = prazo.toISOString().split('T')[0];
  }
}

// ===== SALVAR FATURA =====
function salvarFatura() {
  const tipo = document.getElementById('fatura-tipo')?.value;
  const vencimento = document.getElementById('fatura-vencimento')?.value;
  const valorInput = document.getElementById('fatura-valor')?.value;
  const valor = parseMoney(valorInput);

  if (!vencimento) { showAlert('⚠️', 'Informe o vencimento.'); return; }
  if (!valor || valor <= 0) { showAlert('⚠️', 'Informe o valor.'); return; }

  const referencia = document.getElementById('fatura-referencia')?.value || '';
  const consumo = parseFloat(document.getElementById('fatura-consumo')?.value) || null;
  const obs = document.getElementById('fatura-obs')?.value || '';
  const apelido = document.getElementById('fatura-apelido')?.value || '';

  // Desconto Inova
  const desconto = tipo === 'inova' ? parseMoney(document.getElementById('inova-desconto')?.value) : 0;
  const valorPagar = desconto > 0 ? Math.max(0, valor - desconto) : valor;

  // Dados específicos por tipo
  const dadosEspecificos = coletarDadosEspecificos(tipo);

  const fatura = {
    id: gerarId(),
    tipo,
    apelido,
    referencia,
    vencimento,
    valor,
    desconto,
    valorPagar,
    consumo,
    obs,
    pago: false,
    criadaEm: new Date().toISOString(),
    ...dadosEspecificos
  };

  if (!DB.faturas) DB.faturas = [];
  DB.faturas.push(fatura);
  agendarSync();
  fecharModal();
  renderContas();
  showAlert('✅', 'Fatura cadastrada com sucesso!');
}

function coletarDadosEspecificos(tipo) {
  const get = (id) => document.getElementById(id)?.value || '';
  const getMoney = (id) => parseMoney(document.getElementById(id)?.value) || 0;

  switch(tipo) {
    case 'copel':
      return {
        ucId: get('fatura-uc'),
        classificacao: get('copel-classificacao'),
        fornecimento: get('copel-fornecimento'),
        banda: get('copel-banda'),
        nf: get('copel-nf'),
        serie: get('copel-serie'),
        emissao: get('copel-emissao'),
        periodoFiscal: get('copel-periodo-fiscal'),
        chaveAcesso: get('copel-chave'),
        protocolo: get('copel-protocolo'),
        medidor: get('copel-medidor'),
        leituraAnterior: get('copel-leit-ant'),
        leituraAtual: get('copel-leit-atual'),
        dataLeitAnt: get('copel-data-ant'),
        dataLeitAtual: get('copel-data-atual'),
        proximaLeitura: get('copel-prox-leit'),
        linhaDigitavel: get('copel-linha-dig'),
        nrDocumento: get('copel-nr-doc'),
        nfCashback: get('copel-nf-cashback')
      };
    case 'sanepar':
      return {
        matricula: get('san-matricula'),
        hidrometro: get('san-hidrometro'),
        roteiro: get('san-roteiro'),
        cliente: get('san-cliente'),
        leituraAnterior: get('san-leit-ant'),
        leituraAtual: get('san-leit-atual'),
        dataLeitura: get('san-data-leit'),
        proximaLeitura: get('san-prox-leit'),
        motivoAusencia: get('san-motivo-ausencia'),
        ctrl: get('san-ctrl'),
        tributosFederais: get('san-tributos'),
        nfCashback: get('san-nf-cashback')
      };
    case 'inova':
      return {
        periodo: get('inova-periodo'),
        nrDocumento: get('inova-nr-doc'),
        contrato: get('inova-contrato'),
        linhaDigitavel: get('inova-linha-dig'),
        pix: get('inova-pix'),
        emissao: get('inova-emissao'),
        prazoMaximo: get('inova-prazo-max'),
        ibpt: get('inova-ibpt')
      };
    case 'sercomtel':
      return {
        nrFatura: get('sercom-nr'),
        linhaDigitavel: get('sercom-linha'),
        multa: getMoney('sercom-multa'),
        juros: getMoney('sercom-juros')
      };
    default:
      return {};
  }
}

// ===== DETALHES DA FATURA =====
function verDetalhesFatura(id) {
  const f = DB.faturas.find(f => f.id === id);
  if (!f) return;
  const conc = CONCESSIONARIAS[f.tipo] || CONCESSIONARIAS.outro;

  let detalhes = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div style="background:var(--bg-secondary);border-radius:8px;padding:16px;">
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">Vencimento</div>
        <div style="font-size:18px;font-weight:700;">${formatarData(f.vencimento)}</div>
      </div>
      <div style="background:var(--bg-secondary);border-radius:8px;padding:16px;">
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">Total a Pagar</div>
        <div style="font-size:18px;font-weight:700;color:var(--green);">${formatarMoeda(f.valorPagar || f.valor)}</div>
        ${f.desconto ? `<div style="font-size:11px;color:var(--green);">Desconto: -${formatarMoeda(f.desconto)}</div>` : ''}
      </div>
    </div>
  `;

  // Detalhes específicos
  if (f.tipo === 'copel') {
    detalhes += `
      <div style="background:var(--bg-secondary);border-radius:8px;padding:16px;margin-bottom:12px;">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">🧾 NOTA FISCAL</div>
        <div style="font-size:13px;">NF: <strong>${f.nf || '-'}</strong> | Série: ${f.serie || '-'} | Emissão: ${formatarData(f.emissao)}</div>
        ${f.chaveAcesso ? `<div style="font-size:10px;color:var(--text-muted);margin-top:4px;font-family:monospace;word-break:break-all;">${f.chaveAcesso}</div>` : ''}
      </div>
      <div style="background:var(--bg-secondary);border-radius:8px;padding:16px;margin-bottom:12px;">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">⚡ LEITURAS</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:12px;">
          <div><div style="color:var(--text-muted)">Leit. Anterior</div><strong>${f.leituraAnterior || '-'}</strong></div>
          <div><div style="color:var(--text-muted)">Leit. Atual</div><strong>${f.leituraAtual || '-'}</strong></div>
          <div><div style="color:var(--text-muted)">Consumo</div><strong>${f.consumo || '-'} KWh</strong></div>
          <div><div style="color:var(--text-muted)">Banda</div><strong>${f.banda || '-'}</strong></div>
        </div>
      </div>
    `;
  }

  if (f.tipo === 'sanepar') {
    detalhes += `
      <div style="background:var(--bg-secondary);border-radius:8px;padding:16px;margin-bottom:12px;">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">💧 LEITURAS</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:12px;">
          <div><div style="color:var(--text-muted)">Matrícula</div><strong>${f.matricula || '-'}</strong></div>
          <div><div style="color:var(--text-muted)">Leit. Anterior</div><strong>${f.leituraAnterior || '-'} m³</strong></div>
          <div><div style="color:var(--text-muted)">Leit. Atual</div><strong>${f.leituraAtual || '-'} m³</strong></div>
          <div><div style="color:var(--text-muted)">Consumo</div><strong>${f.consumo || '-'} m³</strong></div>
        </div>
      </div>
    `;
  }

  if (f.tipo === 'inova') {
    detalhes += `
      <div style="background:var(--bg-secondary);border-radius:8px;padding:16px;margin-bottom:12px;">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">🌐 INOVA FIBRA</div>
        <div style="font-size:12px;">Período: <strong>${f.periodo || '-'}</strong> | Contrato: ${f.contrato || '-'}</div>
        ${f.pix ? `<div style="margin-top:8px;font-size:11px;font-weight:600;color:var(--text-secondary);">PIX Copia e Cola:</div>
        <div style="font-size:10px;font-family:monospace;word-break:break-all;background:var(--bg-primary);padding:8px;border-radius:4px;margin-top:4px;">${f.pix}</div>` : ''}
      </div>
    `;
  }

  // NF para cashback
  if (f.nfCashback) {
    detalhes += `
      <div style="background:rgba(34,197,94,0.1);border:1px solid var(--green);border-radius:8px;padding:12px;margin-bottom:12px;">
        <div style="font-size:12px;font-weight:600;color:var(--green);">🧾 NF para Cashback</div>
        <div style="font-size:14px;font-weight:700;margin-top:4px;">${f.nfCashback}</div>
        <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Use no Dinheiro na Nota ou Nota Paraná</div>
      </div>
    `;
  }

  if (f.obs) {
    detalhes += `<div style="font-size:12px;color:var(--text-secondary);margin-top:8px;">📝 ${f.obs}</div>`;
  }

  abrirModal(`${conc.logo} ${conc.nome} — ${f.referencia || formatarData(f.vencimento)}`, detalhes, '600px');
}

function marcarFaturaPaga(id) {
  const f = DB.faturas.find(f => f.id === id);
  if (!f) return;
  f.pago = true;
  f.dataPagamento = new Date().toISOString().split('T')[0];
  agendarSync();
  renderContas();
  showAlert('✅', 'Fatura marcada como paga!');
}

function editarFatura(id) {
  showAlert('ℹ️', 'Para editar, exclua e recadastre a fatura.');
}

function excluirFatura(id) {
  const f = DB.faturas.find(f => f.id === id);
  if (!f) return;
  if (confirm('Excluir esta fatura?')) {
    DB.faturas = DB.faturas.filter(f => f.id !== id);
    agendarSync();
    renderContas();
    showAlert('🗑️', 'Fatura excluída.');
  }
}

// ===== UNIDADES CONSUMIDORAS =====
function abrirModalUnidades() {
  abrirModal('🏠 Unidades Consumidoras Copel', `
    <div style="margin-bottom:16px;">
      ${DB.unidadesConsumidoras.map((u, i) => `
        <div style="background:var(--bg-secondary);border:1px solid ${u.ativa ? 'var(--green)' : 'var(--border)'};border-radius:8px;padding:14px;margin-bottom:10px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <strong>${u.apelido}</strong>
            <span class="badge ${u.ativa ? 'pago' : 'pendente'}">${u.ativa ? 'Ativa' : 'Inativa'}</span>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);">
            UC ANEEL: <strong>${u.ucAneel || '-'}</strong> | UC Antiga: ${u.ucAntiga || '-'}
          </div>
          ${u.titular ? `<div style="font-size:12px;color:var(--text-secondary);">Titular: ${u.titular}</div>` : ''}
          ${u.obs ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">📝 ${u.obs}</div>` : ''}
        </div>
      `).join('')}
    </div>
    <button class="btn-secondary btn-sm" onclick="abrirModalNovaUC()">+ Nova Unidade</button>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="fecharModal()">Fechar</button>
    </div>
  `, '520px');
}

function abrirModalNovaUC() {
  fecharModal();
  setTimeout(() => {
    abrirModal('+ Nova Unidade Consumidora', `
      <div class="form-row">
        <div class="form-group">
          <label>Apelido *</label>
          <input id="uc-apelido" type="text" placeholder="Ex: Casa dos Fundos" />
        </div>
        <div class="form-group">
          <label>Tipo</label>
          <select id="uc-tipo">
            <option value="copel">⚡ Copel</option>
            <option value="sanepar">💧 Sanepar</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>UC ANEEL</label>
          <input id="uc-aneel" type="text" placeholder="Ex: 189811103131" />
        </div>
        <div class="form-group">
          <label>UC Antiga</label>
          <input id="uc-antiga" type="text" placeholder="Ex: 47443162(B)" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Titular</label>
          <input id="uc-titular" type="text" placeholder="Nome do titular" />
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="uc-ativa">
            <option value="true">Ativa</option>
            <option value="false">Inativa</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Observações</label>
        <input id="uc-obs" type="text" placeholder="Ex: Inclui consumo da edícula" />
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
        <button class="btn-primary" onclick="salvarNovaUC()">💾 Salvar</button>
      </div>
    `, '480px');
  }, 200);
}

function salvarNovaUC() {
  const apelido = document.getElementById('uc-apelido')?.value.trim();
  if (!apelido) { showAlert('⚠️', 'Informe o apelido.'); return; }
  DB.unidadesConsumidoras.push({
    id: gerarId(),
    apelido,
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
  showAlert('✅', 'Unidade consumidora cadastrada!');
}

// ===== GRÁFICOS HISTÓRICO =====
function renderHistoricoCharts() {
  const copelFaturas = DB.faturas.filter(f => f.tipo === 'copel' && f.consumo).slice(-12);
  const sanFaturas = DB.faturas.filter(f => f.tipo === 'sanepar' && f.consumo).slice(-12);

  const copelEl = document.getElementById('chart-copel-hist');
  if (copelEl && copelFaturas.length > 0) {
    new Chart(copelEl, {
      type: 'bar',
      data: {
        labels: copelFaturas.map(f => f.referencia || formatarData(f.vencimento)),
        datasets: [{ label: 'KWh', data: copelFaturas.map(f => f.consumo), backgroundColor: '#003399', borderRadius: 4 }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#666', font: { size: 10 } } }, y: { ticks: { color: '#666', font: { size: 10 } } } } }
    });
  }

  const sanEl = document.getElementById('chart-sanepar-hist');
  if (sanEl && sanFaturas.length > 0) {
    new Chart(sanEl, {
      type: 'bar',
      data: {
        labels: sanFaturas.map(f => f.referencia || formatarData(f.vencimento)),
        datasets: [{ label: 'm³', data: sanFaturas.map(f => f.consumo), backgroundColor: '#0077b6', borderRadius: 4 }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#666', font: { size: 10 } } }, y: { ticks: { color: '#666', font: { size: 10 } } } } }
    });
  }
}
