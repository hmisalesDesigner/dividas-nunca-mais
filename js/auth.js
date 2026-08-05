// ===== AUTH =====
const CLIENT_ID = '956166140778-6mut3h6srbmer60tbrg73vspd8a47j0g.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

let tokenClient;
let gapiInited = false;
let gisInited = false;

function gapiLoaded() {
  gapi.load('client', async () => {
    try {
      await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
      gapiInited = true;
      habilitarBotao();
    } catch(e) { console.warn('GAPI erro:', e); habilitarBotao(); }
  });
}

function gisLoaded() {
  try {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (resp) => {
        if (resp.error) { console.error(resp); showAlert('❌', 'Erro no login: ' + resp.error); return; }
        try {
          const token = gapi.client.getToken();
          const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token.access_token}` }
          }).then(r => r.json());
          onLoginSuccess(userInfo);
        } catch(e) { console.error('Erro ao buscar usuário:', e); }
      }
    });
    gisInited = true;
    habilitarBotao();
  } catch(e) { console.warn('GIS erro:', e); }
}

function habilitarBotao() {
  if (!gapiInited || !gisInited) return;
  const btn = document.querySelector('.btn-google');
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = ''; btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Entrar com Google'; }
}

function signInWithGoogle() {
  if (!gapiInited || !gisInited) {
    showAlert('⏳', 'Aguarde as APIs do Google carregarem...');
    return;
  }
  tokenClient.requestAccessToken({ prompt: 'select_account' });
}

function onLoginSuccess(user) {
  DB.usuario.nome = user.name || 'Usuário';
  DB.usuario.email = user.email || '';
  DB.usuario.foto = user.picture || '';

  // Carrega dados salvos do localStorage
  carregarLocalStorage();

  // Salva dados do usuário
  salvarLocalStorage();

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('user-photo').src = DB.usuario.foto || '';

  // Tenta carregar do Drive, depois abre modal de saldo
  carregarDoDrive().finally(() => abrirSaldoModal());
}

function carregarLocalStorage() {
  try {
    const savedDB = localStorage.getItem('dnm_db');
    if (savedDB) {
      const data = JSON.parse(savedDB);
      // Mantém nome/email/foto do Google, restaura o resto
      const nome = DB.usuario.nome;
      const email = DB.usuario.email;
      const foto = DB.usuario.foto;
      Object.assign(DB, data);
      DB.usuario.nome = nome || data.usuario?.nome || 'Usuário';
      DB.usuario.email = email || data.usuario?.email || '';
      DB.usuario.foto = foto || data.usuario?.foto || '';
    }
  } catch(e) { console.warn('localStorage load error:', e); }
}

function salvarLocalStorage() {
  try {
    localStorage.setItem('dnm_db', JSON.stringify(DB));
  } catch(e) { console.warn('localStorage save error:', e); }
}

function abrirSaldoModal() {
  const nome = (DB.usuario.nome || 'Usuário').split(' ')[0];
  document.getElementById('saldo-nome').textContent = nome;
  // Mostra saldo anterior se existir
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

  if (!DB.usuario.renda || DB.usuario.renda <= 0) {
    iniciarApp();
    setTimeout(() => showAlert('💡', 'Cadastre sua renda mensal em Configurações!'), 500);
  } else {
    iniciarApp();
  }
}

function signOut() {
  if (confirm('Deseja sair da plataforma?')) {
    try {
      const token = gapi.client.getToken();
      if (token) google.accounts.oauth2.revoke(token.access_token);
      gapi.client.setToken('');
    } catch(e) {}
    location.reload();
  }
}

// Botão começa desabilitado
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.btn-google');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    // Habilita após 8s mesmo sem APIs (fallback)
    setTimeout(() => {
      if (btn.disabled) { btn.disabled = false; btn.style.opacity = '1'; }
    }, 8000);
  }
});
