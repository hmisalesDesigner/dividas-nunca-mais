// ===== DASHBOARD =====
let chartsInstances = {};

function renderDashboard() {
  const page = document.getElementById('page-dashboard');
  const dividas = getDividas();
  const totalDividas = getTotalDividas();
  const totalJuros = getTotalJuros();
  const totalMultas = getTotalMultas();
  const atrasadas = getContasAtrasadas();
  const semana = getContasVencendoSemana();
  const comprometido = getValorComprometidoMes();
  const pagoMes = getValorPagoMes();
  const saldo = DB.usuario.saldoAtual;
  const porcQuitada = getPorcentagemQuitada();

  page.innerHTML = `
    <!-- Saldo + Indicadores principais -->
    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:16px; margin-bottom:16px;">
      <div class="saldo-card">
        <div class="label">💰 Saldo Disponível</div>
        <div class="value">${formatarMoeda(saldo)}</div>
        <div style="font-size:11px; color:#86efac; margin-top:6px;">Renda: ${formatarMoeda(DB.usuario.renda)}</div>
      </div>
      <div class="indicator-card" style="display:flex; flex-direction:column; justify-content:center;">
        <div class="ic-icon">📊</div>
        <div class="ic-label">Total das Dívidas</div>
        <div class="ic-value red">${formatarMoeda(totalDividas)}</div>
      </div>
      <div class="indicator-card" style="display:flex; flex-direction:column; justify-content:center;">
        <div class="ic-icon">✅</div>
        <div class="ic-label">Valor Já Pago este Mês</div>
        <div class="ic-value green">${formatarMoeda(pagoMes)}</div>
      </div>
    </div>

    <!-- 6 indicadores -->
    <div style="display:grid; grid-template-columns: repeat(6,1fr); gap:12px; margin-bottom:16px;">
      <div class="indicator-card">
        <div class="ic-icon">⚠️</div>
        <div class="ic-label">Contas Atrasadas</div>
        <div class="ic-value red">${atrasadas.length}</div>
      </div>
      <div class="indicator-card">
        <div class="ic-icon">⏰</div>
        <div class="ic-label">Vencem esta Semana</div>
        <div class="ic-value yellow">${semana.length}</div>
      </div>
      <div class="indicator-card">
        <div class="ic-icon">📈</div>
        <div class="ic-label">Juros Acumulados</div>
        <div class="ic-value red">${formatarMoeda(totalJuros)}</div>
      </div>
      <div class="indicator-card">
        <div class="ic-icon">🚨</div>
        <div class="ic-label">Total de Multas</div>
        <div class="ic-value red">${formatarMoeda(totalMultas)}</div>
      </div>
      <div class="indicator-card">
        <div class="ic-icon">📅</div>
        <div class="ic-label">Comprometido no Mês</div>
        <div class="ic-value yellow">${formatarMoeda(comprometido)}</div>
      </div>
      <div class="indicator-card">
        <div class="ic-icon">🎯</div>
        <div class="ic-label">Total de Dívidas</div>
        <div class="ic-value">${dividas.length}</div>
      </div>
    </div>

    <!-- Gráficos -->
    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:16px;">
      <div class="chart-card">
        <h3>Distribuição por Categoria</h3>
        <canvas id="chart-pizza" height="180"></canvas>
      </div>
      <div class="chart-card">
        <h3>Dívidas por Mês</h3>
        <canvas id="chart-barras" height="180"></canvas>
      </div>
      <div class="chart-card">
        <h3>Evolução dos Juros</h3>
        <canvas id="chart-linha" height="180"></canvas>
      </div>
      <div class="chart-card gauge-wrapper">
        <h3>Progresso de Quitação</h3>
        <canvas id="chart-gauge" height="180"></canvas>
        <div class="gauge-label">${porcQuitada}%</div>
        <div class="gauge-sub">das dívidas quitadas</div>
      </div>
    </div>
  `;

  // Renderiza charts após DOM estar pronto
  setTimeout(() => {
    renderCharts(dividas);
  }, 50);
}

function renderCharts(dividas) {
  // Destrói charts anteriores
  Object.values(chartsInstances).forEach(c => c.destroy());
  chartsInstances = {};

  const chartOpts = {
    responsive: true,
    plugins: { legend: { labels: { color: '#9a9a9a', font: { size: 11 } } } }
  };

  // PIZZA - Por categoria
  const catMap = {};
  dividas.forEach(d => {
    const cat = d.categoria || 'Outros';
    catMap[cat] = (catMap[cat] || 0) + (d.valor || 0);
  });
  const pizzaEl = document.getElementById('chart-pizza');
  if (pizzaEl) {
    chartsInstances.pizza = new Chart(pizzaEl, {
      type: 'doughnut',
      data: {
        labels: Object.keys(catMap).map(k => k.replace(/^[^\s]+\s/, '')),
        datasets: [{ data: Object.values(catMap), backgroundColor: ['#22c55e','#3b82f6','#eab308','#ef4444','#8b5cf6','#f97316','#06b6d4','#ec4899'], borderWidth: 0 }]
      },
      options: { ...chartOpts, cutout: '65%' }
    });
  }

  // BARRAS - Últimos 6 meses
  const meses = [];
  const valoresMeses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    meses.push(d.toLocaleString('pt-BR', { month: 'short' }));
    const mes = d.getMonth(); const ano = d.getFullYear();
    const total = dividas.filter(div => {
      const venc = new Date(div.dataVencimento);
      return venc.getMonth() === mes && venc.getFullYear() === ano;
    }).reduce((s, div) => s + (div.valor || 0), 0);
    valoresMeses.push(total);
  }
  const barrasEl = document.getElementById('chart-barras');
  if (barrasEl) {
    chartsInstances.barras = new Chart(barrasEl, {
      type: 'bar',
      data: {
        labels: meses,
        datasets: [{ label: 'R$', data: valoresMeses, backgroundColor: '#3b82f6', borderRadius: 4 }]
      },
      options: { ...chartOpts, scales: { x: { ticks: { color: '#666' }, grid: { color: '#2e2f33' } }, y: { ticks: { color: '#666', callback: v => 'R$' + v }, grid: { color: '#2e2f33' } } }, plugins: { legend: { display: false } } }
    });
  }

  // LINHA - Evolução juros
  const jurosData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const totalJ = dividas.reduce((s, div) => {
      const taxa = (div.jurosMes || 0) / 100;
      const mesesAtraso = i;
      return s + (div.valor || 0) * taxa * mesesAtraso;
    }, 0);
    jurosData.push(totalJ);
  }
  const linhaEl = document.getElementById('chart-linha');
  if (linhaEl) {
    chartsInstances.linha = new Chart(linhaEl, {
      type: 'line',
      data: {
        labels: meses,
        datasets: [{ label: 'Juros', data: jurosData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#ef4444' }]
      },
      options: { ...chartOpts, scales: { x: { ticks: { color: '#666' }, grid: { color: '#2e2f33' } }, y: { ticks: { color: '#666', callback: v => 'R$' + v.toFixed(0) }, grid: { color: '#2e2f33' } } }, plugins: { legend: { display: false } } }
    });
  }

  // GAUGE
  const porcQuitada = getPorcentagemQuitada();
  const gaugeEl = document.getElementById('chart-gauge');
  if (gaugeEl) {
    chartsInstances.gauge = new Chart(gaugeEl, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [porcQuitada, 100 - porcQuitada],
          backgroundColor: [porcQuitada > 50 ? '#22c55e' : porcQuitada > 25 ? '#eab308' : '#ef4444', '#2e2f33'],
          borderWidth: 0, circumference: 180, rotation: 270
        }]
      },
      options: { responsive: true, cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
  }
}
