// ===== UTILS =====

// Formata moeda PT-BR
// Escapa HTML — usado por qualquer tela que monte markup com dado do usuário
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

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

// Modal com campos para preencher nunca fecha sozinho: nem por clique fora, nem por Esc.
// Só fecha pelos botões ✕ / Cancelar / Salvar (chamadas sem evento).
function modalVisivel() {
  const m = document.getElementById('modal-overlay');
  return !!m && m.style.display !== 'none';
}
function modalTemFormulario() {
  return modalVisivel() && !!document.querySelector('#modal-body input:not([type=hidden]), #modal-body textarea, #modal-body select');
}
function fecharModal(e) {
  if (e && modalTemFormulario()) return;   // clique no fundo escuro: ignorado em formulários
  if (!e || e.target === document.getElementById('modal-overlay')) {
    // Fechar de propósito descarta o rascunho da fatura (Cancelar / Salvar / ✕)
    if (document.getElementById('fatura-tipo') && typeof rascunhoFaturaLimpar === 'function') rascunhoFaturaLimpar();
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

// Janela de confirmação para ações que apagam dados. Fica acima de qualquer modal
// (z-index 2001) e o botão de cancelar é o primeiro, para não confirmar sem querer.
function pedirConfirmacao(icone, msg, textoOk, onOk) {
  const acoes = document.getElementById('alert-acoes');
  document.getElementById('alert-icon').textContent = icone;
  document.getElementById('alert-message').textContent = msg;
  acoes.innerHTML = '<button id="alert-nao" style="background:var(--bg-tertiary);color:var(--text-primary);margin-right:10px;">Cancelar</button>'
    + '<button id="alert-sim" style="background:var(--red);color:#fff;">' + (textoOk || 'Apagar') + '</button>';
  const fim = () => { acoes.innerHTML = '<button onclick="fecharAlert()">OK</button>'; fecharAlert(); };
  document.getElementById('alert-nao').onclick = fim;
  document.getElementById('alert-sim').onclick = () => { fim(); onOk(); };
  document.getElementById('alert-popup').style.display = 'block';
  document.getElementById('alert-overlay').style.display = 'block';
  document.getElementById('alert-nao').focus();
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
// Não disparam com modal aberto nem enquanto se digita em um campo, e nunca bloqueiam
// Ctrl+Z / Ctrl+Y (desfazer/refazer do navegador).
function atalhosLiberados() {
  if (modalVisivel()) return false;
  const a = document.activeElement;
  return !(a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable));
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && atalhosLiberados()) {
    switch(e.key) {
      case 'n': e.preventDefault(); abrirModalNovaDivida(); break;
      case 'f': e.preventDefault(); focarBusca(); break;
      case 'e': e.preventDefault(); exportarExcel(); break;
      case 'i': e.preventDefault(); document.getElementById('import-file')?.click(); break;
    }
  }
  if (e.key === 'Escape') {
    if (!modalTemFormulario()) fecharModal();
    fecharAlert();
    document.getElementById('alertas-panel').style.display = 'none';
  }
  if (e.key === 'Delete' && document.activeElement.dataset.dividaId) {
    moverParaLixeira(parseInt(document.activeElement.dataset.dividaId));
  }
});

// Fechar/recarregar a aba com formulário preenchido: o navegador pergunta antes.
window.addEventListener('beforeunload', e => {
  if (!modalTemFormulario()) return;
  const sujo = [...document.querySelectorAll('#modal-body input:not([type=hidden]), #modal-body textarea')]
    .some(el => (el.value || '').trim() !== '');
  if (sujo) { e.preventDefault(); e.returnValue = ''; }
});

function focarBusca() {
  const busca = document.querySelector('.search-input');
  if (busca) busca.focus();
}

// Categorias e subcategorias
const CATEGORIAS = {
  '👤 Pessoa Física': ['Amigos', 'Família', 'Pessoal'],
  '🏢 Pessoa Jurídica': ['Fornecedores', 'Serviços', 'Outros'],
  '💳 Cartões de Crédito': ['Nubank', 'Itaú', 'Bradesco', 'Santander', 'Inter', 'Sicoob', 'Outro'],
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


// ===== VERSÃO DO SITE =====
// Ao publicar uma nova versão do site, atualize este número (e a mensagem do commit).
const SITE_VERSION = 'v1.22';
function aplicarVersaoSite() {
  document.querySelectorAll('.site-ver').forEach(el => { el.textContent = SITE_VERSION; });
}
document.addEventListener('DOMContentLoaded', aplicarVersaoSite);

// ===== BOTÃO ATUALIZAR (Dashboard) =====
// Envia o que ainda não foi salvo, traz a versão mais recente do Drive e redesenha a tela.
// Pergunta ao servidor qual é a versão publicada (ignora o cache). null = não deu para saber.
async function versaoPublicada() {
  try {
    const r = await fetch('js/utils.js?x=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    const m = (await r.text()).match(/SITE_VERSION\s*=\s*'([^']+)'/);
    return m ? m[1] : null;
  } catch (e) { return null; }
}

// 🔄 Atualizar: (1) guarda o que ainda não foi salvo, (2) se há versão nova do site, recarrega a página
// (o mesmo que Ctrl+R), (3) senão relê o Google Drive e redesenha a tela aberta.
async function atualizarSite() {
  const botoes = Array.from(document.querySelectorAll('[data-atualizar]'));
  if (botoes.some(b => b.disabled)) return;
  const texto = b => { botoes.forEach(x => { x.textContent = b; }); };
  botoes.forEach(b => { b.disabled = true; });
  texto('⏳ Atualizando...');
  let recarregando = false;
  try {
    if (syncPendente) { // não perde alterações recentes antes de recarregar
      clearTimeout(syncTimeout);
      salvarLocalStorage();
      await salvarNoDrive();
      syncPendente = false;
    }
    const nova = await versaoPublicada();
    if (nova && nova !== SITE_VERSION) {
      recarregando = true;
      showAlert('⬆️', 'Há uma versão nova do site (' + nova + '). Recarregando...');
      setTimeout(() => location.reload(), 900);
      return;
    }
    const comToken = typeof accessToken !== 'undefined' && !!accessToken;
    const doDrive = comToken ? await carregarDoDrive() : false;
    if (typeof migrarProgramas === 'function') migrarProgramas();
    salvarLocalStorage();
    atualizarDatetime();
    if (typeof renderizarAlertas === 'function') renderizarAlertas();
    if (typeof atualizarBadgeBeneficios === 'function') atualizarBadgeBeneficios();
    renderDashboard();
    const ben = document.getElementById('beneficios-app');
    if (ben && ben.style.display !== 'none' && typeof renderBeneficios === 'function') renderBeneficios();
    showAlert(doDrive ? '✅' : '⚠️', doDrive ? 'Dados atualizados com o Google Drive. Site na versão ' + SITE_VERSION + '.'
      : comToken ? 'Não consegui ler o Google Drive agora (a sessão pode ter expirado). Mostrando os dados deste navegador.'
      : 'Sem conexão com o Google Drive neste momento: só a tela foi atualizada, com os dados deste navegador.');
    if (typeof autoImportarSorteios === 'function') setTimeout(() => autoImportarSorteios(), 1200);
  } catch (e) {
    console.warn('Erro ao atualizar:', e);
    showAlert('❌', 'Não foi possível atualizar. Tente novamente.');
  } finally {
    if (!recarregando) { botoes.forEach(b => { b.disabled = false; b.textContent = '🔄 Atualizar'; }); }
  }
}


// ===== TEMA CLARO / ESCURO =====
// Escuro é o padrão. O tema é aplicado como atributo data-tema no <html>;
// as variáveis de cor em css/main.css fazem o resto.
function aplicarTema(tema) {
  const claro = tema === 'claro';
  if (claro) document.documentElement.setAttribute('data-tema', 'claro');
  else document.documentElement.removeAttribute('data-tema');
  try { localStorage.setItem('dnm_tema', claro ? 'claro' : 'escuro'); } catch (e) {}
}

function temaAtual() {
  return document.documentElement.getAttribute('data-tema') === 'claro' ? 'claro' : 'escuro';
}

// Cores para Chart.js (canvas não lê variáveis CSS).
function coresGrafico() {
  return temaAtual() === 'claro'
    ? { texto: '#4b5563', textoFraco: '#6b7280', grade: 'rgba(0,0,0,0.08)', fundo: '#e5e7eb' }
    : { texto: '#9a9a9a', textoFraco: '#666', grade: '#2e2f33', fundo: '#2e2f33' };
}

// Cria um gráfico Chart.js destruindo antes o que já estiver no mesmo canvas.
// Evita "Canvas is already in use" quando a página é redesenhada (ex.: marcar fatura como paga).
function novoGrafico(el, cfg) {
  const existente = (typeof Chart.getChart === 'function') ? Chart.getChart(el) : null;
  if (existente) existente.destroy();
  return new Chart(el, cfg);
}
