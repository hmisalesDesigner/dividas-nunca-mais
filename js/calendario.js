// ===== CALENDÁRIO FINANCEIRO =====
let calMesAtual = new Date().getMonth();
let calAnoAtual = new Date().getFullYear();

function renderCalendario() {
  const page = document.getElementById('page-calendario');
  page.innerHTML = `
    <div class="cal-wrapper">
      <div>
        <div class="cal-grid">
          <div class="cal-header">
            <button class="cal-nav" onclick="mudarMes(-1)">‹</button>
            <h3 id="cal-titulo"></h3>
            <button class="cal-nav" onclick="mudarMes(1)">›</button>
          </div>
          <!-- Legenda -->
          <div class="cal-legend">
            <div class="cal-legend-item"><div class="cal-legend-dot" style="background:var(--green)"></div>Pago</div>
            <div class="cal-legend-item"><div class="cal-legend-dot" style="background:var(--yellow)"></div>Pendente</div>
            <div class="cal-legend-item"><div class="cal-legend-dot" style="background:var(--red)"></div>Atrasado</div>
            <div class="cal-legend-item"><div class="cal-legend-dot" style="background:#3b82f6"></div>Vence Hoje</div>
          </div>
          <div class="cal-days-header">
            ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => `<div class="cal-day-label">${d}</div>`).join('')}
          </div>
          <div class="cal-days" id="cal-days"></div>
          <!-- Resumo -->
          <div class="cal-resumo">
            <div class="cal-resumo-item">
              <div class="label">Total a Pagar</div>
              <div class="value yellow" id="cal-total-pagar">-</div>
            </div>
            <div class="cal-resumo-item">
              <div class="label">Total Já Pago</div>
              <div class="value green" id="cal-total-pago">-</div>
            </div>
            <div class="cal-resumo-item">
              <div class="label">Total Atrasado</div>
              <div class="value red" id="cal-total-atrasado">-</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Próximos Vencimentos -->
      <div class="proximos-card">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:16px;">📋 Próximos Vencimentos</h3>
        <div id="proximos-list"></div>
      </div>
    </div>
  `;
  renderMes();
}

function mudarMes(dir) {
  calMesAtual += dir;
  if (calMesAtual > 11) { calMesAtual = 0; calAnoAtual++; }
  if (calMesAtual < 0) { calMesAtual = 11; calAnoAtual--; }
  renderMes();
}

function renderMes() {
  const titulo = document.getElementById('cal-titulo');
  const daysEl = document.getElementById('cal-days');
  if (!titulo || !daysEl) return;

  const nomeMes = new Date(calAnoAtual, calMesAtual, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  titulo.textContent = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  const hoje = new Date();
  const primeiroDia = new Date(calAnoAtual, calMesAtual, 1).getDay();
  const diasNoMes = new Date(calAnoAtual, calMesAtual + 1, 0).getDate();
  const dividas = getDividas();

  // Agrupa dívidas por dia do mês
  const porDia = {};
  dividas.forEach(d => {
    const venc = new Date(d.dataVencimento);
    if (venc.getMonth() === calMesAtual && venc.getFullYear() === calAnoAtual) {
      const dia = venc.getDate();
      if (!porDia[dia]) porDia[dia] = [];
      porDia[dia].push(d);
    }
  });

  let html = '';
  // Dias vazios antes do primeiro dia
  for (let i = 0; i < primeiroDia; i++) {
    html += '<div class="cal-day" style="opacity:0.3;"></div>';
  }
  // Dias do mês
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const ehHoje = dia === hoje.getDate() && calMesAtual === hoje.getMonth() && calAnoAtual === hoje.getFullYear();
    const dividasDia = porDia[dia] || [];
    html += `
      <div class="cal-day ${ehHoje ? 'today' : ''}">
        <div class="day-num" ${ehHoje ? 'style="color:var(--green)"' : ''}>${dia}</div>
        <div class="day-events">
          ${dividasDia.slice(0, 2).map(d => {
            const status = d.status === 'pago' ? 'pago' : calcularDiasAtraso(d) > 0 ? 'atrasado' : 'pendente';
            return `<div class="cal-event ${status}" title="${d.nome}: ${formatarMoeda(d.valor)}">${d.nome.substring(0,12)}</div>`;
          }).join('')}
          ${dividasDia.length > 2 ? `<div style="font-size:9px;color:var(--text-muted);">+${dividasDia.length - 2} mais</div>` : ''}
        </div>
      </div>
    `;
  }

  daysEl.innerHTML = html;

  // Resumo
  const totalPagar = dividas.filter(d => {
    const v = new Date(d.dataVencimento);
    return v.getMonth() === calMesAtual && v.getFullYear() === calAnoAtual && d.status !== 'pago';
  }).reduce((s, d) => s + d.valor, 0);

  const totalPago = getValorPagoMes();
  const totalAtrasado = getContasAtrasadas().reduce((s, d) => s + d.valor, 0);

  const totalPagarEl = document.getElementById('cal-total-pagar');
  const totalPagoEl = document.getElementById('cal-total-pago');
  const totalAtrasadoEl = document.getElementById('cal-total-atrasado');
  if (totalPagarEl) totalPagarEl.textContent = formatarMoeda(totalPagar);
  if (totalPagoEl) totalPagoEl.textContent = formatarMoeda(totalPago);
  if (totalAtrasadoEl) totalAtrasadoEl.textContent = formatarMoeda(totalAtrasado);

  renderProximos();
}

function renderProximos() {
  const list = document.getElementById('proximos-list');
  if (!list) return;

  const hoje = new Date();
  const proximos = getDividas()
    .filter(d => {
      const venc = new Date(d.dataVencimento);
      return venc >= hoje && d.status !== 'pago';
    })
    .sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento))
    .slice(0, 8);

  if (proximos.length === 0) {
    list.innerHTML = '<div style="color:var(--text-secondary);font-size:13px;">Nenhum vencimento próximo.</div>';
    return;
  }

  list.innerHTML = proximos.map(d => `
    <div class="proximo-item">
      <div class="p-name">${d.nome}</div>
      <div class="p-detail">${formatarMoeda(d.valor)} · ${formatarData(d.dataVencimento)}</div>
    </div>
  `).join('');
}
