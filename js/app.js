// ===== APP CONTROLLER =====

function iniciarApp() {
  document.getElementById('app').style.display = 'flex';

  // Restaura estado do sidebar
  const sidebarState = localStorage.getItem('dnm_sidebar');
  if (sidebarState === 'collapsed') {
    document.getElementById('sidebar').classList.add('collapsed');
  }

  // Agenda sync periódico no localStorage
  setInterval(() => salvarLocalStorage(), 30000);

  // Atualiza badge de benefícios uma vez ao iniciar
  setTimeout(() => {
    if (typeof atualizarBadgeBeneficios === 'function') atualizarBadgeBeneficios();
  }, 1000);

  // Atualiza header
  document.getElementById('user-photo').src = DB.usuario.foto || '';
  const benPhoto = document.getElementById('user-photo-ben');
  if (benPhoto) benPhoto.src = DB.usuario.foto || '';

  // Inicia datetime
  atualizarDatetime();
  setInterval(atualizarDatetime, 60000);

  // Renderiza alertas
  renderizarAlertas();

  // Vai para dashboard
  navigateTo('dashboard', document.querySelector('.nav-item'));

  // Dados de exemplo se banco estiver vazio
  if (DB.dividas.length === 0) carregarDadosExemplo();

  // Remove dados de exemplo após 24 horas
  removerExemplosExpirados();
}

function navigateTo(page, el) {
  // Esconde todas as pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Ativa a page selecionada
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  if (el) el.classList.add('active');

  // Atualiza título
  const titulos = {
    dashboard: 'Dashboard',
    cadastro: 'Cadastro de Dívidas',
    mapa: 'Mapa Financeiro',
    planejador: 'Planejador de Quitação',
    calendario: 'Calendário Financeiro',
    orcamentos: 'Orçamentos',
    configuracoes: 'Configurações',
    contas: 'Contas Recorrentes',

  };
  document.getElementById('page-title').textContent = titulos[page] || page;

  // Fecha alertas se abertos
  document.getElementById('alertas-panel').style.display = 'none';

  // Renderiza a page
  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'cadastro': renderCadastro(); break;
    case 'mapa': renderMapa(); break;
    case 'planejador': renderPlanejador(); break;
    case 'calendario': renderCalendario(); break;
    case 'orcamentos': renderOrcamentos(); break;
    case 'configuracoes': renderConfiguracoes(); break;
    case 'contas': renderContas(); break;

  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
  // Salva estado no localStorage
  localStorage.setItem('dnm_sidebar', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
}

// ===== DADOS DE EXEMPLO =====
function carregarDadosExemplo() {
  const hoje = new Date();
  const passado = (dias) => {
    const d = new Date(hoje); d.setDate(d.getDate() - dias);
    return d.toISOString().split('T')[0];
  };
  const futuro = (dias) => {
    const d = new Date(hoje); d.setDate(d.getDate() + dias);
    return d.toISOString().split('T')[0];
  };

  const exemplos = [
    { nome: 'Cartão Nubank', categoria: '💳 Cartões de Crédito', subcategoria: 'Nubank', valor: 1800, dataVencimento: passado(5), status: 'atrasado', jurosMes: 12, jurosAno: 144, tipoJuros: 'rotativo', multa: 80, totalParcelas: 1 },
    { nome: 'Aluguel', categoria: '🏠 Imóveis', subcategoria: 'Aluguel', valor: 1200, dataVencimento: passado(10), status: 'atrasado', jurosMes: 1, totalParcelas: 1 },
    { nome: 'Empréstimo Pessoal', categoria: '💰 Empréstimos', subcategoria: 'Banco', valor: 5000, dataVencimento: futuro(15), status: 'pendente', jurosMes: 3.5, totalParcelas: 12 },
    { nome: 'Plano de Saúde', categoria: '🔁 Gastos Recorrentes', subcategoria: 'Plano de Saúde', valor: 350, dataVencimento: futuro(5), status: 'pendente', jurosMes: 0, totalParcelas: 1 },
    { nome: 'IPVA Carro', categoria: '🚗 Veículos', subcategoria: 'IPVA', valor: 2400, dataVencimento: futuro(30), status: 'pendente', jurosMes: 0, totalParcelas: 3 },
    { nome: 'Internet', categoria: '🔁 Gastos Recorrentes', subcategoria: 'Internet', valor: 120, dataVencimento: futuro(10), status: 'pendente', jurosMes: 0, totalParcelas: 1 },
  ];

  exemplos.forEach(e => {
    e.isExemplo = true;
    e.exemploExpira = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    adicionarDivida(e);
  });
  renderizarAlertas();
}

function removerExemplosExpirados() {
  const agora = new Date();
  const antes = DB.dividas.length;
  DB.dividas = DB.dividas.filter(d => {
    if (d.isExemplo && d.exemploExpira) {
      return new Date(d.exemploExpira) > agora;
    }
    return true;
  });
  if (DB.dividas.length < antes) agendarSync();
}
