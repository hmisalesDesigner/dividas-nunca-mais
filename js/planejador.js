// ===== PLANEJADOR DE QUITAÇÃO =====
function renderPlanejador() {
  const page = document.getElementById('page-planejador');
  const dividas = getDividas().filter(d => d.status !== 'pago');
  const priorizadas = dividas.sort((a, b) => calcularScorePrioridade(b) - calcularScorePrioridade(a));
  const dataQuitacao = calcularDataQuitacao(priorizadas);
  const totalEconomizado = getTotalEconomizado();

  page.innerHTML = `
    <!-- Simulador -->
    <div class="card" style="margin-bottom:16px;">
      <h3 style="font-size:14px;font-weight:600;margin-bottom:16px;">🧮 Simulador — Se eu tiver R$ X hoje, onde aplicar?</h3>
      <div style="display:flex;gap:12px;align-items:flex-end;">
        <div class="form-group" style="margin:0;flex:1;">
          <label>Valor disponível</label>
          <input id="sim-valor" type="text" placeholder="R$ 0,00" oninput="formatMoney(this)" />
        </div>
        <button class="btn-primary" onclick="simularAplicacao()">Simular →</button>
      </div>
      <div id="sim-resultado" style="margin-top:12px;"></div>
    </div>

    <!-- Projeção + Histórico -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div class="card" style="text-align:center;">
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">📅 Data Estimada para Quitar Tudo</div>
        <div style="font-size:22px;font-weight:700;color:var(--green);">${dataQuitacao}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">seguindo a ordem sugerida</div>
      </div>
      <div class="card" style="text-align:center;">
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">💰 Economia Total em Juros</div>
        <div style="font-size:22px;font-weight:700;color:var(--green);">${formatarMoeda(totalEconomizado)}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">economizados desde o início</div>
      </div>
    </div>

    <!-- Lista priorizada -->
    <div class="card">
      <div class="section-header">
        <h3>📋 Ordem Sugerida de Quitação</h3>
        <span style="font-size:12px;color:var(--text-secondary);">Score: 50% juros + 30% valor + 20% vencimento</span>
      </div>

      ${priorizadas.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">🎉</div>
          <p>Parabéns! Nenhuma dívida pendente encontrada.</p>
        </div>
      ` : priorizadas.map((d, i) => {
        const dias = calcularDiasAtraso(d);
        const juros = calcularJurosAcumulados(d);
        const score = calcularScorePrioridade(d);
        const urgencia = score >= 70 ? 'critico' : score >= 40 ? 'urgente' : 'em-dia';
        const urgenciaLabel = score >= 70 ? '🔴 Crítico' : score >= 40 ? '⏰ Urgente' : '✅ Em Dia';
        const economia = calcularEconomia(d);
        const prazo = calcularPrazoLimite(d);
        const impacto = calcularImpactoFluxo(d);

        return `
          <div class="plan-item">
            <div class="plan-rank" style="color:${i === 0 ? 'var(--red)' : i === 1 ? 'var(--yellow)' : 'var(--text-muted)'};">${i + 1}º</div>
            <div>
              <div class="plan-name">${d.nome}</div>
              <div class="plan-detail">${d.categoria} • Juros: ${d.jurosMes || 0}% a.m.</div>
            </div>
            <div style="text-align:center;">
              <span class="badge ${urgencia}">${urgenciaLabel}</span>
            </div>
            <div style="text-align:right;min-width:120px;">
              <div style="font-weight:700;">${formatarMoeda(d.valor)}</div>
              ${juros > 0 ? `<div style="font-size:11px;color:var(--red);">+${formatarMoeda(juros)} juros</div>` : ''}
            </div>
            <div style="text-align:center;min-width:160px;">
              <div style="font-size:11px;color:var(--text-secondary);">Prazo limite</div>
              <div style="font-size:12px;font-weight:600;color:${dias > 0 ? 'var(--red)' : 'var(--text-primary)'};">${prazo}</div>
              <div style="font-size:11px;color:var(--green);">Economiza: ${formatarMoeda(economia)}</div>
              <div style="font-size:11px;color:var(--text-secondary);">Impacto: ${impacto}</div>
            </div>
            <div>
              <button class="btn-primary btn-sm" onclick="abrirModalPagamento(${d.id})">💳 Pagar</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function calcularEconomia(divida) {
  const taxa = (divida.jurosMes || 0) / 100;
  if (taxa === 0) return 0;
  return divida.valor * taxa * 3; // economia estimada de 3 meses de juros
}

function calcularPrazoLimite(divida) {
  const dias = calcularDiasAtraso(divida);
  if (dias > 0) {
    // Dívida já atrasada: mostra prazo máximo antes de crescer muito
    const hoje = new Date();
    const prazo = new Date(hoje);
    prazo.setDate(prazo.getDate() + 30);
    return `Até ${formatarData(prazo.toISOString().split('T')[0])}`;
  }
  // Em dia: mostra data de vencimento
  return `Vence em ${formatarData(divida.dataVencimento)}`;
}

function calcularImpactoFluxo(divida) {
  const saldo = DB.usuario.saldoAtual;
  const valor = divida.valor;
  if (saldo <= 0) return '⚠️ Alto';
  const porc = (valor / saldo) * 100;
  if (porc >= 80) return '⚠️ Alto';
  if (porc >= 40) return '⚡ Médio';
  return '✅ Baixo';
}

function calcularDataQuitacao(dividas) {
  if (dividas.length === 0) return 'Nenhuma dívida!';
  const renda = DB.usuario.renda || 1;
  const totalDividas = dividas.reduce((s, d) => s + d.valor, 0);
  const mesesEstimados = Math.ceil(totalDividas / (renda * 0.3)); // 30% da renda para dívidas
  const data = new Date();
  data.setMonth(data.getMonth() + mesesEstimados);
  return data.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

function simularAplicacao() {
  const valor = parseMoney(document.getElementById('sim-valor').value);
  if (!valor || valor <= 0) { showAlert('⚠️', 'Informe um valor para simular.'); return; }

  const dividas = getDividas().filter(d => d.status !== 'pago');
  const priorizadas = dividas.sort((a, b) => calcularScorePrioridade(b) - calcularScorePrioridade(a));

  let restante = valor;
  const sugestoes = [];

  for (const d of priorizadas) {
    if (restante <= 0) break;
    const pagar = Math.min(restante, d.valor);
    sugestoes.push({ nome: d.nome, valor: pagar, economia: calcularEconomia(d) });
    restante -= pagar;
  }

  const html = sugestoes.length === 0
    ? '<div style="color:var(--text-secondary)">Nenhuma sugestão disponível.</div>'
    : `<div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="font-size:12px;font-weight:600;margin-bottom:8px;color:var(--green);">✅ Sugestão de aplicação de ${formatarMoeda(valor)}:</div>
        ${sugestoes.map((s, i) => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;">
            <span>${i + 1}. ${s.nome}</span>
            <span style="font-weight:600;">${formatarMoeda(s.valor)}</span>
          </div>
        `).join('')}
        <div style="margin-top:8px;font-size:12px;color:var(--green);">
          💰 Economia estimada em juros: ${formatarMoeda(sugestoes.reduce((s, x) => s + x.economia, 0))}
        </div>
      </div>`;

  document.getElementById('sim-resultado').innerHTML = html;
}
