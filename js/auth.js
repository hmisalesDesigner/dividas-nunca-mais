// ===== AUTH - Versão simplificada e confiável =====
const CLIENT_ID = '956166140778-6mut3h6srbmer60tbrg73vspd8a47j0g.apps.googleusercontent.com';

let accessToken = null;
let gapiReady = false;

// GAPI carregada
function gapiLoaded() {
  gapi.load('client', async () => {
    try {
      await gapi.client.init({
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
      });
      gapiReady = true;
    } catch(e) {
      console.warn('GAPI init error:', e);
    }
  });
}

// Google Identity Services carregada
function gisLoaded() {
  try {
    window._tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: onTokenReceived
    });

    // Habilita botão quando GIS estiver pronto
    const btn = document.querySelector('.btn-google');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    concluirBarra();

  } catch(e) {
    console.warn('GIS error:', e);
  }
}

async function onTokenReceived(resp) {
  if (resp.error) {
    showAlert('❌', 'Erro no login. Tente novamente.');
    return;
  }

  accessToken = resp.access_token;

  // Busca dados do usuário
  try {
    const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).then(r => r.json());

    onLoginSuccess(userInfo);
  } catch(e) {
    showAlert('❌', 'Erro ao buscar dados do usuário.');
  }
}

function signInWithGoogle() {
  if (!window._tokenClient) {
    // Entra direto sem Google se APIs não carregaram
    const nome = prompt('Qual é o seu nome?') || 'Usuário';
    const email = prompt('Qual é o seu e-mail?') || '';
    onLoginSuccess({ name: nome, email: email, picture: '' });
    return;
  }
  window._tokenClient.requestAccessToken({ prompt: 'select_account' });
}

function onLoginSuccess(user) {
  DB.usuario.nome = user.name || 'Usuário';
  DB.usuario.email = user.email || '';
  DB.usuario.foto = user.picture || '';

  // Carrega dados do localStorage
  carregarLocalStorage();

  // Atualiza nome/email/foto com dados do Google (prioridade)
  DB.usuario.nome = user.name || DB.usuario.nome;
  DB.usuario.email = user.email || DB.usuario.email;
  DB.usuario.foto = user.picture || DB.usuario.foto;

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('user-photo').src = DB.usuario.foto || '';

  // Tenta Drive, depois abre modal
  carregarDoDrive().finally(() => abrirSaldoModal());
}

function carregarLocalStorage() {
  try {
    const saved = localStorage.getItem('dnm_db');
    if (saved) {
      const data = JSON.parse(saved);
      Object.assign(DB, data);
    }
  } catch(e) {}
}

function salvarLocalStorage() {
  try {
    localStorage.setItem('dnm_db', JSON.stringify(DB));
  } catch(e) {}
}

function abrirSaldoModal() {
  const nome = (DB.usuario.nome || 'Usuário').split(' ')[0];
  document.getElementById('saldo-nome').textContent = nome;
  if (DB.usuario.saldoAtual) {
    document.getElementById('input-saldo').value = formatarMoeda(DB.usuario.saldoAtual);
  }
  document.getElementById('saldo-modal').style.display = 'flex';
}

function salvarSaldoInicial() {
  const saldo = parseMoney(document.getElementById('input-saldo').value);
  if (saldo < 0) { showAlert('⚠️', 'Saldo não pode ser negativo.'); return; }

  DB.usuario.saldoAtual = saldo;
  salvarLocalStorage();

  document.getElementById('saldo-modal').style.display = 'none';
  iniciarApp();

  if (!DB.usuario.renda || DB.usuario.renda <= 0) {
    setTimeout(() => showAlert('💡', 'Cadastre sua renda mensal em Configurações!'), 800);
  }
}

function signOut() {
  if (confirm('Deseja sair da plataforma?')) {
    try {
      if (accessToken) google.accounts.oauth2.revoke(accessToken);
    } catch(e) {}
    accessToken = null;
    location.reload();
  }
}

// ===== BARRA DE PROGRESSO =====
let loadProgress = 0;
let progressInterval = null;

function iniciarBarraProgresso() {
  const etapas = [
    { pct: 15, status: 'Carregando APIs do Google...' },
    { pct: 35, status: 'Inicializando autenticação...' },
    { pct: 55, status: 'Configurando Drive...' },
    { pct: 75, status: 'Quase lá...' },
    { pct: 90, status: 'Finalizando...' },
  ];
  let etapaAtual = 0;

  progressInterval = setInterval(() => {
    if (etapaAtual < etapas.length) {
      const etapa = etapas[etapaAtual];
      atualizarBarra(etapa.pct, etapa.status);
      etapaAtual++;
    }
  }, 1200);
}

function atualizarBarra(pct, status) {
  const bar = document.getElementById('loading-bar');
  const pctEl = document.getElementById('loading-pct');
  const statusEl = document.getElementById('loading-status');
  if (bar) bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (statusEl && status) statusEl.textContent = status;
}

function concluirBarra() {
  clearInterval(progressInterval);
  atualizarBarra(100, 'Pronto! Clique em Entrar com Google');
  const pctEl = document.getElementById('loading-pct');
  if (pctEl) pctEl.style.color = '#22c55e';
}

// Botão sempre habilitado — não bloqueia o usuário
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.btn-google');
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  iniciarBarraProgresso();

  // Verifica progresso a cada segundo
  let checks = 0;
  const checker = setInterval(() => {
    checks++;
    const pct = Math.min(Math.round((checks / 15) * 90), 90);
    if (!window._tokenClient) {
      atualizarBarra(pct, 'Aguardando Google Identity Services...');
    }
    // GIS carregou
    if (window._tokenClient) {
      clearInterval(checker);
      concluirBarra();
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    }
    // Timeout: 15s — habilita botão mesmo sem GIS
    if (checks >= 15) {
      clearInterval(checker);
      concluirBarra();
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
      atualizarBarra(100, 'Pronto!');
    }
  }, 1000);
});
