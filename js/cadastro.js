// ===== CADASTRO =====
let filtroCategoria = '', filtroStatus = '', filtroBusca = '';

function renderCadastro() {
  const page = document.getElementById('page-cadastro');
  page.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <input type="text" class="search-input" placeholder="🔍 Buscar dívida..." oninput="filtrarCadastro('busca', this.value)" />
        <select class="filter" onchange="filtrarCadastro('categoria', this.value)">
          <option value="">Todas as Categorias</option>
          ${Object.keys(CATEGORIAS).map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <select class="filter" onchange="filtrarCadastro('status', this.value)">
          <option value="">Todos os Status</option>
          <option value="pendente">Pendente</option>
          <option value="atrasado">Atrasado</option>
          <option value="pago">Pago</option>
        </select>
      </div>
      <div class="toolbar-right">
        <button class="btn-secondary btn-sm" onclick="abrirLixeira()">🗑️ Lixeira</button>
        <button class="btn-primary" onclick="abrirModalNovaDivida()">+ Nova Dívida <span class="shortcut">Ctrl+N</span></button>
      </div>
    </div>

    <div class="card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Dias em Atraso</th>
              <th>Parcelas</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="tabela-dividas"></tbody>
        </table>
      </div>
    </div>

    <div style="margin-top:16px; display:flex; gap:10px;">
      <button class="btn-secondary btn-sm" onclick="abrirModalAcordo()">🤝 Registrar Acordo</button>
    </div>
  `;
  renderTabelaDividas();
}

function filtrarCadastro(tipo, valor) {
  if (tipo === 'categoria') filtroCategoria = valor;
  if (tipo === 'status') filtroStatus = valor;
  if (tipo === 'busca') filtroBusca = valor.toLowerCase();
  renderTabelaDividas();
}

function getStatusCalc(divida) {
  if (divida.status === 'pago') return 'pago';
  const dias = calcularDiasAtraso(divida);
  if (dias > 0) return 'atrasado';
  return 'pendente';
}

function renderTabelaDividas() {
  const tbody = document.getElementById('tabela-dividas');
  if (!tbody) return;

  let dividas = getDividas();

  if (filtroCategoria) dividas = dividas.filter(d => d.categoria === filtroCategoria);
  if (filtroStatus) dividas = dividas.filter(d => getStatusCalc(d) === filtroStatus);
  if (filtroBusca) dividas = dividas.filter(d => d.nome.toLowerCase().includes(filtroBusca));

  if (dividas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📋</div><p>Nenhuma dívida encontrada. Clique em "+ Nova Dívida" para começar.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = dividas.map(d => {
    const status = getStatusCalc(d);
    const dias = calcularDiasAtraso(d);
    const parcTotais = d.totalParcelas || 1;
    const parcPagas = d.parcelas ? d.parcelas.filter(p => p.pago).length : 0;
    return `
      <tr>
        <td><strong>${d.nome}</strong>${d.observacoes ? `<br><span style="color:var(--text-muted);font-size:11px">${d.observacoes.substring(0,40)}...</span>` : ''}</td>
        <td style="font-size:12px">${d.categoria || '-'}</td>
        <td>${formatarMoeda(d.valor)}</td>
        <td>${formatarData(d.dataVencimento)}</td>
        <td>${dias > 0 ? `<span style="color:var(--red)">${dias} dias</span>` : '<span style="color:var(--green)">Em dia</span>'}</td>
        <td>${parcPagas}/${parcTotais}</td>
        <td><span class="badge ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn-secondary btn-sm" onclick="abrirModalEditarDivida(${d.id})" title="Editar">✏️</button>
            <button class="btn-secondary btn-sm" onclick="abrirModalPagamento(${d.id})" title="Registrar Pagamento">💳</button>
            <button class="btn-secondary btn-sm" onclick="duplicarDividaUI(${d.id})" title="Duplicar">📋</button>
            <button class="btn-danger btn-sm" onclick="confirmarLixeira(${d.id})" title="Mover para lixeira">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function abrirModalNovaDivida() {
  abrirModal('+ Nova Dívida', formDivida(), '680px');
  renderCategorias('form-categoria');
}

function abrirModalEditarDivida(id) {
  const d = DB.dividas.find(div => div.id === id);
  if (!d) return;
  abrirModal('✏️ Editar Dívida', formDivida(d), '680px');
  renderCategorias('form-categoria');
  document.getElementById('form-categoria').value = d.categoria;
  renderSubcategorias(d.categoria, 'form-subcategoria');
  document.getElementById('form-subcategoria').value = d.subcategoria;
}

function formDivida(d = {}) {
  return `
    <div class="form-row">
      <div class="form-group">
        <label>Nome da Dívida *</label>
        <input id="form-nome" type="text" value="${d.nome || ''}" placeholder="Ex: Cartão Nubank" oninput="validarCampo(this,'obrigatorio')" />
      </div>
      <div class="form-group">
        <label>Categoria *</label>
        <select id="form-categoria" onchange="renderSubcategorias(this.value,'form-subcategoria')">
          <option value="">Selecionar...</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Subcategoria</label>
        <select id="form-subcategoria"><option value="">Selecionar...</option></select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="form-status">
          <option value="pendente" ${d.status==='pendente'?'selected':''}>Pendente</option>
          <option value="atrasado" ${d.status==='atrasado'?'selected':''}>Atrasado</option>
          <option value="pago" ${d.status==='pago'?'selected':''}>Pago</option>
        </select>
      </div>
    </div>
    <div class="form-row-3">
      <div class="form-group">
        <label>Valor Total (R$) *</label>
        <input id="form-valor" type="text" value="${d.valor ? formatarMoeda(d.valor) : ''}" placeholder="R$ 0,00" oninput="formatMoney(this)" />
      </div>
      <div class="form-group">
        <label>Data de Vencimento *</label>
        <input id="form-vencimento" type="date" value="${d.dataVencimento || ''}" />
      </div>
      <div class="form-group">
        <label>Nº de Parcelas</label>
        <input id="form-parcelas" type="number" value="${d.totalParcelas || 1}" min="1" oninput="validarCampo(this,'numero')" />
      </div>
    </div>
    <div class="form-row-3">
      <div class="form-group">
        <label>Juros (% ao mês)</label>
        <input id="form-juros-mes" type="text" value="${d.jurosMes || ''}" placeholder="Ex: 2,5" oninput="formatPercent(this)" />
      </div>
      <div class="form-group">
        <label>Juros (% ao ano)</label>
        <input id="form-juros-ano" type="text" value="${d.jurosAno || ''}" placeholder="Ex: 30" oninput="formatPercent(this)" />
      </div>
      <div class="form-group">
        <label>Tipo de Juros</label>
        <select id="form-tipo-juros">
          <option value="composto" ${d.tipoJuros==='composto'?'selected':''}>Composto</option>
          <option value="simples" ${d.tipoJuros==='simples'?'selected':''}>Simples</option>
          <option value="rotativo" ${d.tipoJuros==='rotativo'?'selected':''}>Rotativo (Cartão)</option>
        </select>
      </div>
    </div>
    <div class="form-row-3">
      <div class="form-group">
        <label>Multa por Atraso (R$)</label>
        <input id="form-multa" type="text" value="${d.multa ? formatarMoeda(d.multa) : ''}" placeholder="R$ 0,00" oninput="formatMoney(this)" />
      </div>
      <div class="form-group">
        <label>Juros de Mora (% ao mês)</label>
        <input id="form-mora" type="text" value="${d.mora || ''}" placeholder="Ex: 1" oninput="formatPercent(this)" />
      </div>
      <div class="form-group">
        <label>IOF / Outras Taxas (R$)</label>
        <input id="form-iof" type="text" value="${d.iof ? formatarMoeda(d.iof) : ''}" placeholder="R$ 0,00" oninput="formatMoney(this)" />
      </div>
    </div>
    <div class="form-group">
      <label>Credor / Nome do Cobrador</label>
      <input id="form-credor" type="text" value="${d.credor || ''}" placeholder="Ex: Banco Itaú" />
    </div>
    <div class="form-group">
      <label>Observações</label>
      <textarea id="form-obs" placeholder="Informações adicionais do boleto, contrato, etc.">${d.observacoes || ''}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primary" onclick="salvarDivida(${d.id || 0})">💾 Salvar</button>
    </div>
  `;
}

function salvarDivida(id) {
  const nome = document.getElementById('form-nome').value.trim();
  const categoria = document.getElementById('form-categoria').value;
  const valor = parseMoney(document.getElementById('form-valor').value);
  const vencimento = document.getElementById('form-vencimento').value;

  if (!nome) { showAlert('⚠️', 'Informe o nome da dívida.'); return; }
  if (!categoria) { showAlert('⚠️', 'Selecione uma categoria.'); return; }
  if (!valor || valor <= 0) { showAlert('⚠️', 'Informe um valor válido.'); return; }
  if (!vencimento) { showAlert('⚠️', 'Informe a data de vencimento.'); return; }

  const parcelas = parseInt(document.getElementById('form-parcelas').value) || 1;
  const jurosMes = parseFloat(document.getElementById('form-juros-mes').value.replace(',', '.')) || 0;

  if (parcelas > 1 && valor > 0 && jurosMes === 0) {
    // aviso mas não bloqueia
  }

  const dados = {
    nome,
    categoria,
    subcategoria: document.getElementById('form-subcategoria').value,
    valor,
    dataVencimento: vencimento,
    status: document.getElementById('form-status').value,
    totalParcelas: parcelas,
    jurosMes,
    jurosAno: parseFloat(document.getElementById('form-juros-ano').value.replace(',', '.')) || 0,
    tipoJuros: document.getElementById('form-tipo-juros').value,
    multa: parseMoney(document.getElementById('form-multa').value),
    mora: parseFloat(document.getElementById('form-mora').value.replace(',', '.')) || 0,
    iof: parseMoney(document.getElementById('form-iof').value),
    credor: document.getElementById('form-credor').value.trim(),
    observacoes: document.getElementById('form-obs').value.trim()
  };

  if (id) {
    editarDivida(id, dados);
    showAlert('✅', 'Dívida atualizada com sucesso!');
  } else {
    adicionarDivida(dados);
    showAlert('✅', 'Dívida cadastrada com sucesso!');
  }

  fecharModal();
  renderTabelaDividas();
  renderizarAlertas();
}

function confirmarLixeira(id) {
  const d = DB.dividas.find(div => div.id === id);
  if (!d) return;
  if (confirm(`Mover "${d.nome}" para a lixeira?`)) {
    moverParaLixeira(id);
    renderTabelaDividas();
    showAlert('🗑️', 'Dívida movida para a lixeira.');
  }
}

function duplicarDividaUI(id) {
  const nova = duplicarDivida(id);
  renderTabelaDividas();
  showAlert('📋', `"${nova.nome}" duplicada com sucesso!`);
}

function abrirLixeira() {
  const lixeira = DB.dividas.filter(d => d.lixeira);
  const html = lixeira.length === 0
    ? '<div class="empty-state"><div class="empty-icon">🗑️</div><p>Lixeira vazia</p></div>'
    : `<table style="width:100%"><thead><tr><th>Nome</th><th>Valor</th><th>Ações</th></tr></thead><tbody>
      ${lixeira.map(d => `
        <tr>
          <td>${d.nome}</td>
          <td>${formatarMoeda(d.valor)}</td>
          <td><button class="btn-secondary btn-sm" onclick="restaurarDividaUI(${d.id})">↩️ Restaurar</button></td>
        </tr>
      `).join('')}
    </tbody></table>`;
  abrirModal('🗑️ Lixeira', html);
}

function restaurarDividaUI(id) {
  restaurarDaLixeira(id);
  fecharModal();
  renderTabelaDividas();
  showAlert('↩️', 'Dívida restaurada com sucesso!');
}

function abrirModalPagamento(dividaId) {
  const d = DB.dividas.find(div => div.id === dividaId);
  if (!d) return;
  const parcelas = d.parcelas && d.parcelas.length > 0 ? d.parcelas : null;

  const html = `
    <p style="color:var(--text-secondary);margin-bottom:16px;">Dívida: <strong>${d.nome}</strong></p>
    ${parcelas ? `
      <div class="form-group">
        <label>Selecionar Parcelas</label>
        <div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px;">
          ${parcelas.map((p, i) => !p.pago ? `
            <label style="display:flex;align-items:center;gap:8px;padding:6px;cursor:pointer;">
              <input type="checkbox" data-parcela="${i}" value="${i}" />
              Parcela ${p.numero} — ${formatarData(p.dataVencimento)} — ${formatarMoeda(p.valor)}
            </label>
          ` : '').join('')}
        </div>
      </div>
    ` : ''}
    <div class="form-row">
      <div class="form-group">
        <label>Valor Pago (R$)</label>
        <input id="pag-valor" type="text" placeholder="R$ 0,00" oninput="formatMoney(this)" />
      </div>
      <div class="form-group">
        <label>Data do Pagamento</label>
        <input id="pag-data" type="date" value="${new Date().toISOString().split('T')[0]}" />
      </div>
    </div>
    <div class="form-group">
      <label>Observação</label>
      <input id="pag-obs" type="text" placeholder="Ex: Pago via PIX" />
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primary" onclick="confirmarPagamento(${dividaId})">✅ Confirmar Pagamento</button>
    </div>
  `;
  abrirModal('💳 Registrar Pagamento', html);
}

function confirmarPagamento(dividaId) {
  const valorPago = parseMoney(document.getElementById('pag-valor').value);
  const dataPagamento = document.getElementById('pag-data').value;
  const obs = document.getElementById('pag-obs').value;

  if (!valorPago || valorPago <= 0) { showAlert('⚠️', 'Informe o valor pago.'); return; }

  const checkboxes = document.querySelectorAll('[data-parcela]:checked');
  const parcelasIds = Array.from(checkboxes).map(c => parseInt(c.value));

  registrarPagamento(dividaId, parcelasIds.length > 0 ? parcelasIds : null, valorPago, dataPagamento, obs);
  fecharModal();
  renderTabelaDividas();
  showAlert('✅', 'Pagamento registrado com sucesso!');
}

function abrirModalAcordo() {
  const dividas = getDividas().filter(d => d.status !== 'pago');
  const html = `
    <p style="color:var(--text-secondary);margin-bottom:16px;">Selecione as dívidas e parcelas do acordo:</p>
    <div style="max-height:250px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:16px;">
      ${dividas.map(d => `
        <label style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-bottom:1px solid var(--border);">
          <input type="checkbox" data-acordo="${d.id}" />
          <div>
            <div style="font-weight:600">${d.nome}</div>
            <div style="font-size:11px;color:var(--text-secondary)">${formatarMoeda(d.valor)} — ${d.categoria}</div>
          </div>
        </label>
      `).join('')}
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Valor Negociado (R$)</label>
        <input id="acordo-valor" type="text" placeholder="R$ 0,00" oninput="formatMoney(this)" />
      </div>
      <div class="form-group">
        <label>Data do Acordo</label>
        <input id="acordo-data" type="date" value="${new Date().toISOString().split('T')[0]}" />
      </div>
    </div>
    <div class="form-group">
      <label>Observação do Acordo</label>
      <input id="acordo-obs" type="text" placeholder="Ex: Desconto de 30% negociado com credor" />
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primary" onclick="confirmarAcordo()">🤝 Confirmar Acordo</button>
    </div>
  `;
  abrirModal('🤝 Registrar Acordo', html);
}

function confirmarAcordo() {
  const checks = document.querySelectorAll('[data-acordo]:checked');
  const valor = parseMoney(document.getElementById('acordo-valor').value);
  const data = document.getElementById('acordo-data').value;
  const obs = document.getElementById('acordo-obs').value;

  if (checks.length === 0) { showAlert('⚠️', 'Selecione ao menos uma dívida.'); return; }
  if (!valor || valor <= 0) { showAlert('⚠️', 'Informe o valor negociado.'); return; }

  const valorPorDivida = valor / checks.length;
  checks.forEach(c => {
    registrarPagamento(parseInt(c.dataset.acordo), null, valorPorDivida, data, obs);
  });

  fecharModal();
  renderTabelaDividas();
  showAlert('🤝', `Acordo registrado para ${checks.length} dívida(s)!`);
}
