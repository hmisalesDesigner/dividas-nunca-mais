// ===== ORÇAMENTOS =====
function renderOrcamentos() {
  const page = document.getElementById('page-orcamentos');
  const renda = DB.usuario.renda;
  const comprometido = getValorComprometidoMes();
  const saldo = DB.usuario.saldoAtual;

  page.innerHTML = `
    <!-- Resumo financeiro -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px;">
      <div class="indicator-card">
        <div class="ic-label">Renda Mensal</div>
        <div class="ic-value">${formatarMoeda(renda)}</div>
      </div>
      <div class="indicator-card">
        <div class="ic-label">Total Comprometido</div>
        <div class="ic-value yellow">${formatarMoeda(comprometido)}</div>
      </div>
      <div class="saldo-card">
        <div class="label">Saldo Disponível</div>
        <div class="value">${formatarMoeda(saldo)}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <!-- Simulador -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:16px;">💡 Simulador de Novo Compromisso</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Nome do Compromisso</label>
            <input id="orc-nome" type="text" placeholder="Ex: Carro novo" />
          </div>
          <div class="form-group">
            <label>Categoria</label>
            <select id="orc-categoria">
              <option value="">Selecionar...</option>
              ${Object.keys(CATEGORIAS).map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Valor Total (R$)</label>
            <input id="orc-valor" type="text" placeholder="R$ 0,00" oninput="formatMoney(this)" />
          </div>
          <div class="form-group">
            <label>Nº de Parcelas</label>
            <input id="orc-parcelas" type="number" value="12" min="1" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Taxa de Juros (% ao mês)</label>
            <input id="orc-juros" type="text" placeholder="Ex: 1,5" oninput="formatPercent(this)" />
          </div>
          <div class="form-group">
            <label>Tipo de Juros</label>
            <select id="orc-tipo-juros">
              <option value="composto">Composto</option>
              <option value="simples">Simples</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Data de Início</label>
            <input id="orc-inicio" type="date" value="${new Date().toISOString().split('T')[0]}" />
          </div>
          <div class="form-group">
            <label>Multa por Atraso (R$)</label>
            <input id="orc-multa" type="text" placeholder="R$ 0,00" oninput="formatMoney(this)" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Juros de Mora (% ao mês)</label>
            <input id="orc-mora" type="text" placeholder="Ex: 1" oninput="formatPercent(this)" />
          </div>
          <div class="form-group">
            <label>IOF / Outras Taxas (R$)</label>
            <input id="orc-iof" type="text" placeholder="R$ 0,00" oninput="formatMoney(this)" />
          </div>
        </div>
        <div class="form-group">
          <label>Observações</label>
          <input id="orc-obs" type="text" placeholder="Detalhes adicionais do compromisso" />
        </div>
        <div style="display:flex;gap:10px;margin-top:4px;">
          <button class="btn-primary" style="flex:1;" onclick="simularOrcamento()">🔍 Simular</button>
          <button class="btn-secondary" onclick="salvarOrcamento()">💾 Salvar</button>
        </div>

        <!-- Resultado -->
        <div id="orc-resultado" style="margin-top:16px;"></div>
      </div>

      <!-- Orçamentos salvos + Gráfico -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="card">
          <div class="section-header">
            <h3>📁 Orçamentos Salvos</h3>
          </div>
          <div id="orc-lista">
            ${renderListaOrcamentos()}
          </div>
        </div>
        <div class="chart-card">
          <h3>Projeção do Fluxo de Caixa</h3>
          <canvas id="chart-fluxo" height="160"></canvas>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => renderChartFluxo(), 50);
}

function renderListaOrcamentos() {
  if (!DB.orcamentos || DB.orcamentos.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">💡</div><p>Nenhum orçamento salvo.</p></div>';
  }
  return DB.orcamentos.map(o => {
    const cls = o.resultado === 'viavel' ? 'green' : o.resultado === 'arriscado' ? 'yellow' : 'red';
    const label = o.resultado === 'viavel' ? 'Viável ✅' : o.resultado === 'arriscado' ? 'Arriscado ⚠️' : 'Péssimo Negócio ❌';
    return `
      <div style="background:var(--bg-secondary);border:1px solid var(--border);border-left:3px solid var(--${cls});border-radius:8px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-weight:600;">${o.nome}</div>
          <div style="font-size:11px;color:var(--${cls});">${label}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700;">${formatarMoeda(o.valor)}</div>
          <div style="font-size:11px;color:var(--text-secondary);">${o.parcelas}x</div>
        </div>
      </div>
    `;
  }).join('');
}

function simularOrcamento() {
  const valor = parseMoney(document.getElementById('orc-valor').value);
  const parcelas = parseInt(document.getElementById('orc-parcelas').value) || 1;
  const juros = parseFloat(document.getElementById('orc-juros').value.replace(',', '.')) || 0;
  const renda = DB.usuario.renda;
  const saldo = DB.usuario.saldoAtual;
  const comprometido = getValorComprometidoMes();

  if (!valor || valor <= 0) { showAlert('⚠️', 'Informe o valor do compromisso.'); return; }

  const taxa = juros / 100;
  const parcela = taxa > 0
    ? valor * (taxa * Math.pow(1 + taxa, parcelas)) / (Math.pow(1 + taxa, parcelas) - 1)
    : valor / parcelas;

  const novoComprometido = comprometido + parcela;
  const novoSaldo = saldo - parcela;
  const percComprom = renda > 0 ? (novoComprometido / renda) * 100 : 100;

  let resultado, cls, label;
  if (percComprom <= 30 && novoSaldo > DB.usuario.limiteAlerta) {
    resultado = 'viavel'; cls = 'viavel'; label = '✅ Viável!';
  } else if (percComprom <= 50 && novoSaldo > 0) {
    resultado = 'arriscado'; cls = 'arriscado'; label = '⚠️ Arriscado';
  } else {
    resultado = 'furada'; cls = 'furada'; label = '❌ Péssimo Negócio';
  }

  document.getElementById('orc-resultado').innerHTML = `
    <div class="sim-result ${cls}">
      <div class="result-title">${label}</div>
      <div class="result-detail">
        <div>Parcela mensal: <strong>${formatarMoeda(parcela)}</strong></div>
        <div>Impacto no saldo: <strong>${formatarMoeda(novoSaldo)}</strong></div>
        <div>% da renda comprometida: <strong>${percComprom.toFixed(1)}%</strong></div>
        <div>Custo total: <strong>${formatarMoeda(parcela * parcelas)}</strong></div>
      </div>
    </div>
  `;

  // Salva resultado temporário para usar no salvar
  window._orcResultado = resultado;
}

function salvarOrcamento() {
  const nome = document.getElementById('orc-nome').value.trim();
  const valor = parseMoney(document.getElementById('orc-valor').value);
  const parcelas = parseInt(document.getElementById('orc-parcelas').value) || 1;

  if (!nome || !valor) { showAlert('⚠️', 'Simule o orçamento antes de salvar.'); return; }

  if (!DB.orcamentos) DB.orcamentos = [];
  DB.orcamentos.push({
    id: gerarId(), nome, valor, parcelas,
    resultado: window._orcResultado || 'arriscado',
    criadoEm: new Date().toISOString()
  });
  agendarSync();
  document.getElementById('orc-lista').innerHTML = renderListaOrcamentos();
  showAlert('✅', 'Orçamento salvo!');
}

function renderChartFluxo() {
  const el = document.getElementById('chart-fluxo');
  if (!el) return;
  const meses = [];
  const renda = [];
  const comprometido = [];
  const saldo = [];
  const rendaVal = DB.usuario.renda;
  let saldoAtual = DB.usuario.saldoAtual;
  const divMes = getValorComprometidoMes();

  for (let i = 0; i < 6; i++) {
    const d = new Date(); d.setMonth(d.getMonth() + i);
    meses.push(d.toLocaleString('pt-BR', { month: 'short' }));
    renda.push(rendaVal);
    comprometido.push(divMes);
    saldoAtual = saldoAtual + rendaVal - divMes;
    saldo.push(saldoAtual);
  }

  if (window._chartFluxo) window._chartFluxo.destroy();
  window._chartFluxo = new Chart(el, {
    type: 'line',
    data: {
      labels: meses,
      datasets: [
        { label: 'Renda', data: renda, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.3 },
        { label: 'Comprometido', data: comprometido, borderColor: '#eab308', backgroundColor: 'rgba(234,179,8,0.1)', fill: true, tension: 0.3 },
        { label: 'Saldo', data: saldo, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.3 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#9a9a9a', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#666' }, grid: { color: '#2e2f33' } },
        y: { ticks: { color: '#666', callback: v => 'R$' + v.toLocaleString('pt-BR') }, grid: { color: '#2e2f33' } }
      }
    }
  });
}
