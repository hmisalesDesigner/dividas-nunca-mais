// ===== UTILS =====

// Formata moeda PT-BR
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

// Formata data PT-BR
function formatarData(dataStr) {
  if (!dataStr) return '-';
  const [y, m, d] = dataStr.split('-');
  return `${d}/${m}/${y}`;
}

// Parse money input
function parseMoney(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

// Formata input de moeda enquanto digita
function formatMoney(input) {
  let value = input.value.replace(/\D/g, '');
  if (!value) { input.value = ''; return; }
  value = (parseInt(value) / 100).toFixed(2);
  input.value = 'R$ ' + value.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // Valida: apenas números
  if (isNaN(parseMoney(input.value))) {
    input.classList.add('error');
    mostrarErroInput(input, 'Valor inválido');
  } else {
    input.classList.remove('error');
    removerErroInput(input);
  }
}

// Formata percentual enquanto digita
function formatPercent(input) {
  let value = input.value.replace(/[^\d,]/g, '');
  input.value = value;
}

// Validação em tempo real
function validarCampo(input, tipo) {
  const val = input.value.trim();
  input.classList.remove('error');
  removerErroInput(input);

  if (tipo === 'numero') {
    if (isNaN(parseFloat(val.replace(',', '.')))) {
      input.classList.add('error');
      mostrarErroInput(input, 'Digite apenas números');
      return false;
    }
  }
  if (tipo === 'obrigatorio' && !val) {
    input.classList.add('error');
    mostrarErroInput(input, 'Campo obrigatório');
    return false;
  }
  return true;
}

function mostrarErroInput(input, msg) {
  removerErroInput(input);
  const span = document.createElement('span');
  span.className = 'input-error-msg';
  span.textContent = msg;
  span.dataset.errorFor = input.id;
  input.parentNode.appendChild(span);
}

function removerErroInput(input) {
  const prev = input.parentNode.querySelector(`[data-error-for="${input.id}"]`);
  if (prev) prev.remove();
}

// Data/hora no header
function atualizarDatetime() {
  const el = document.getElementById('header-datetime');
  if (!el) return;
  const now = new Date();
  const opts = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  el.textContent = now.toLocaleString('pt-BR', opts);
}

// MODAL global
function abrirModal(titulo, htmlContent, largura = '600px') {
  document.getElementById('modal-content').style.maxWidth = largura;
  document.getElementById('modal-body').innerHTML = `<h2>${titulo}</h2>${htmlContent}`;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function fecharModal(e) {
  if (!e || e.target === document.getElementById('modal-overlay')) {
    document.getElementById('modal-overlay').style.display = 'none';
  }
}

// ALERT popup
function showAlert(icon, msg) {
  document.getElementById('alert-icon').textContent = icon;
  document.getElementById('alert-message').textContent = msg;
  document.getElementById('alert-popup').style.display = 'block';
  document.getElementById('alert-overlay').style.display = 'block';
}

function fecharAlert() {
  document.getElementById('alert-popup').style.display = 'none';
  document.getElementById('alert-overlay').style.display = 'none';
}

// Alertas painel
function toggleAlertas() {
  const panel = document.getElementById('alertas-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function renderizarAlertas() {
  const alertas = gerarAlertas();
  const badge = document.getElementById('notif-badge');
  const panel = document.getElementById('alertas-panel');

  if (alertas.length > 0) {
    badge.textContent = alertas.length;
    badge.style.display = 'flex';
    panel.innerHTML = alertas.map(a => `
      <div class="alerta-item ${a.tipo}">${a.msg}</div>
    `).join('');
  } else {
    badge.style.display = 'none';
    panel.innerHTML = '<div class="alerta-item" style="color:var(--text-secondary)">✅ Nenhum alerta no momento</div>';
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.ctrlKey) {
    switch(e.key) {
      case 'n': e.preventDefault(); abrirModalNovaDivida(); break;
      case 'f': e.preventDefault(); focarBusca(); break;
      case 'e': e.preventDefault(); exportarExcel(); break;
      case 'i': e.preventDefault(); document.getElementById('import-file')?.click(); break;
      case 'z': e.preventDefault(); break; // desfazer - TODO
      case 'y': e.preventDefault(); break; // refazer - TODO
    }
  }
  if (e.key === 'Escape') {
    fecharModal();
    fecharAlert();
    document.getElementById('alertas-panel').style.display = 'none';
  }
  if (e.key === 'Delete' && document.activeElement.dataset.dividaId) {
    moverParaLixeira(parseInt(document.activeElement.dataset.dividaId));
  }
});

function focarBusca() {
  const busca = document.querySelector('.search-input');
  if (busca) busca.focus();
}

// Categorias e subcategorias
const CATEGORIAS = {
  '👤 Pessoa Física': ['Amigos', 'Família', 'Pessoal'],
  '🏢 Pessoa Jurídica': ['Fornecedores', 'Serviços', 'Outros'],
  '💳 Cartões de Crédito': ['Nubank', 'Itaú', 'Bradesco', 'Santander', 'Inter', 'Outro'],
  '🏠 Imóveis': ['Aluguel', 'Financiamento', 'Condomínio', 'IPTU'],
  '🚗 Veículos': ['Financiamento', 'Seguro', 'IPVA', 'Manutenção'],
  '🏛️ Impostos': ['IRPF', 'MEI', 'INSS', 'ISS', 'Outro'],
  '🔁 Gastos Recorrentes': ['Internet', 'Telefone', 'Energia', 'Água', 'Plano de Saúde', 'Streaming', 'Outro'],
  '💰 Empréstimos': ['Banco', 'Cheque Especial', 'Consignado', 'Fintech', 'Outro']
};

function renderCategorias(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecionar...</option>';
  Object.keys(CATEGORIAS).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    sel.appendChild(opt);
  });
}

function renderSubcategorias(categoria, selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecionar...</option>';
  const subs = CATEGORIAS[categoria] || [];
  subs.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub; opt.textContent = sub;
    sel.appendChild(opt);
  });
}
