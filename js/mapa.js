// ===== MAPA FINANCEIRO =====
function renderMapa() {
  const page = document.getElementById('page-mapa');
  const dividas = getDividas();
  const totalGeral = getTotalDividas();

  // Agrupa por categoria
  const porCategoria = {};
  dividas.forEach(d => {
    const cat = d.categoria || 'Outros';
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(d);
  });

  page.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div>
        <h3 style="font-size:15px;font-weight:600;">Mapa Financeiro</h3>
        <p style="color:var(--text-secondary);font-size:13px;">Visualização hierárquica das suas dívidas</p>
      </div>
      <div style="display:flex;gap:12px;font-size:12px;color:var(--text-secondary);">
        <span>🟢 Pago</span>
        <span>🟡 Pendente</span>
        <span>🔴 Atrasado</span>
        <span>⚪ Futuro</span>
      </div>
    </div>

    <div class="card" style="overflow:auto;">
      <div id="tree-root" style="display:flex;flex-direction:column;align-items:center;padding:20px;min-width:900px;">

        <!-- Nó raiz -->
        <div class="tree-node" style="background:var(--bg-secondary);border-color:#3b82f6;box-shadow:0 0 20px rgba(59,130,246,0.3);margin-bottom:0;">
          <div class="node-label" style="color:#93c5fd;">TOTAL DE DÍVIDAS</div>
          <div class="node-value" style="color:#ef4444;">${formatarMoeda(totalGeral)}</div>
        </div>

        <!-- Linha conectora raiz -->
        <div style="width:2px;height:32px;background:var(--border);"></div>

        <!-- Categorias -->
        <div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;">
          ${Object.entries(porCategoria).map(([cat, divs]) => {
            const totalCat = divs.reduce((s, d) => s + (d.valor || 0), 0);
            const todasPagas = divs.every(d => d.status === 'pago');
            const algumAtrasada = divs.some(d => calcularDiasAtraso(d) > 0 && d.status !== 'pago');
            const statusCat = todasPagas ? 'pago' : algumAtrasada ? 'atrasado' : 'pendente';

            return `
              <div style="display:flex;flex-direction:column;align-items:center;">
                <div class="tree-node ${statusCat}" onclick="toggleCategoria('cat-${CSS.escape(cat)}')" style="cursor:pointer;">
                  <div class="node-label">${cat.replace(/^[^\s]+\s/, '')}</div>
                  <div class="node-value">${formatarMoeda(totalCat)}</div>
                  <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${divs.length} dívida(s) ▼</div>
                </div>

                <!-- Dívidas da categoria -->
                <div id="cat-${cat.replace(/[^a-zA-Z0-9]/g, '_')}" style="display:none;margin-top:8px;">
                  <div style="width:2px;height:16px;background:var(--border);margin:0 auto;"></div>
                  <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
                    ${divs.map(d => {
                      const status = getStatusCalcMapa(d);
                      const dias = calcularDiasAtraso(d);
                      return `
                        <div style="display:flex;flex-direction:column;align-items:center;">
                          <div style="width:2px;height:16px;background:var(--border);"></div>
                          <div class="tree-node ${status}" style="min-width:140px;position:relative;"
                            onmouseenter="showTooltip(event,${JSON.stringify(JSON.stringify(d)).slice(1,-1)})"
                            onmouseleave="hideTooltip()">
                            <div class="node-label">${d.nome.substring(0,20)}</div>
                            <div class="node-value">${formatarMoeda(d.valor)}</div>
                            ${dias > 0 ? `<div style="font-size:10px;color:var(--red);">${dias}d atraso</div>` : ''}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${Object.keys(porCategoria).length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🗺️</div>
            <p>Nenhuma dívida cadastrada ainda.<br>Vá para Cadastro e adicione suas dívidas.</p>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Tooltip -->
    <div id="tree-tooltip" style="display:none;position:fixed;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:12px;z-index:500;pointer-events:none;min-width:200px;"></div>
  `;
}

function getStatusCalcMapa(d) {
  if (d.status === 'pago') return 'pago';
  if (calcularDiasAtraso(d) > 0) return 'atrasado';
  return 'pendente';
}

function toggleCategoria(id) {
  // id tem CSS.escape aplicado, precisa do id original
  const els = document.querySelectorAll('[id^="cat-"]');
  els.forEach(el => {
    if (el.id === id.replace('cat-', 'cat-')) {
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
  });
  // Alternativa simples: busca pelo id direto
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function showTooltip(event, dividaJson) {
  try {
    const d = JSON.parse(dividaJson);
    const tooltip = document.getElementById('tree-tooltip');
    const dias = calcularDiasAtraso(d);
    tooltip.innerHTML = `
      <div style="font-weight:600;margin-bottom:8px;">${d.nome}</div>
      <div style="color:var(--text-secondary);">Valor: <span style="color:var(--text-primary)">${formatarMoeda(d.valor)}</span></div>
      <div style="color:var(--text-secondary);">Vencimento: <span style="color:var(--text-primary)">${formatarData(d.dataVencimento)}</span></div>
      <div style="color:var(--text-secondary);">Juros: <span style="color:var(--text-primary)">${d.jurosMes || 0}% a.m.</span></div>
      <div style="color:var(--text-secondary);">Status: <span class="badge ${getStatusCalcMapa(d)}">${d.status}</span></div>
      ${dias > 0 ? `<div style="color:var(--red);margin-top:4px;">⚠️ ${dias} dias em atraso</div>` : ''}
    `;
    tooltip.style.display = 'block';
    tooltip.style.left = (event.clientX + 12) + 'px';
    tooltip.style.top = (event.clientY - 10) + 'px';
  } catch(e) {}
}

function hideTooltip() {
  document.getElementById('tree-tooltip').style.display = 'none';
}
