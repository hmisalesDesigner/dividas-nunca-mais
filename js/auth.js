// ===== AUTH =====
const CLIENT_ID = '956166140778-6mut3h6srbmer60tbrg73vspd8a47j0g.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Inicializa GAPI
function gapiLoaded() {
  gapi.load('client', async () => {
    await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
    gapiInited = true;
  });
}

// Inicializa Google Identity Services
function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: async (resp) => {
      if (resp.error) { console.error(resp); return; }
      // Busca dados do usuário
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${gapi.client.getToken().access_token}` }
      }).then(r => r.json());
      onLoginSuccess(userInfo);
    }
  });
  gisInited = true;
}

// Botão Login com Google
function signInWithGoogle() {
  if (!gapiInited || !gisInited) {
    // Fallback modo demo se APIs não carregaram
    onLoginSuccess({ name: 'Bruno', email: 'bruno@gmail.com', picture: '' });
    return;
  }
  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    tokenClient.requestAccessToken({ prompt: '' });
  }
}

function onLoginSuccess(user) {
  DB.usuario.nome = user.name || user.nome || 'Usuário';
  DB.usuario.email = user.email || '';
  DB.usuario.foto = user.picture || user.foto || '';

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('user-photo').src = DB.usuario.foto;

  // Tenta carregar dados do Drive antes de pedir saldo
  carregarDoDrive().then(carregou => {
    if (carregou) {
      iniciarApp();
    } else {
      abrirSaldoModal();
    }
  });
}

function abrirSaldoModal() {
  document.getElementById('saldo-nome').textContent = DB.usuario.nome.split(' ')[0];
  if (DB.usuario.renda) document.getElementById('input-renda').value = formatarMoeda(DB.usuario.renda);
  if (DB.usuario.saldoAtual) document.getElementById('input-saldo').value = formatarMoeda(DB.usuario.saldoAtual);
  document.getElementById('saldo-modal').style.display = 'flex';
}

function salvarSaldoInicial() {
  const renda = parseMoney(document.getElementById('input-renda').value);
  const saldo = parseMoney(document.getElementById('input-saldo').value);

  if (!renda || renda <= 0) { showAlert('⚠️', 'Por favor, informe sua renda mensal.'); return; }
  if (saldo < 0) { showAlert('⚠️', 'Saldo não pode ser negativo.'); return; }

  DB.usuario.renda = renda;
  DB.usuario.saldoAtual = saldo;

  document.getElementById('saldo-modal').style.display = 'none';
  iniciarApp();
}

function signOut() {
  if (confirm('Deseja sair da plataforma?')) {
    const token = gapi.client.getToken();
    if (token) google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
    location.reload();
  }
}
