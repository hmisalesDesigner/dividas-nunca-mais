// ===== CONFIGURAÇÕES =====
function renderConfiguracoes() {
  const page = document.getElementById('page-configuracoes');
  const u = DB.usuario;

  page.innerHTML = `
    <!-- Perfil -->
    <div class="config-section">
      <h3>👤 Perfil</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Nome *</label>
          <input id="cfg-nome" type="text" value="${u.nome || ''}" placeholder="Seu nome completo" />
        </div>
        <div class="form-group">
          <label>E-mail *</label>
          <input id="cfg-email" type="email" value="${u.email || ''}" placeholder="seu@email.com" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Data de Nascimento</label>
          <input id="cfg-nascimento" type="date" value="${u.dataNascimento || ''}" />
        </div>
        <div class="form-group">
          <label>Avatar</label>
          <div style="display:flex;align-items:center;gap:12px;">
            <img id="cfg-avatar-preview" src="${u.foto || ''}" style="width:40px;height:40px;border-radius:50%;border:2px solid var(--border);${u.foto ? '' : 'display:none'}" />
            <span style="color:var(--text-secondary);font-size:12px;">Foto do Google (automática)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Financeiro -->
    <div class="config-section">
      <h3>💰 Financeiro</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Renda Mensal (R$) *</label>
          <input id="cfg-renda" type="text" value="${formatarMoeda(u.renda || 0)}" oninput="formatMoney(this)" />
        </div>
        <div class="form-group">
          <label>Alertar quando saldo for menor que (R$)</label>
          <input id="cfg-limite" type="text" value="${formatarMoeda(u.limiteAlerta || 500)}" oninput="formatMoney(this)" />
        </div>
        <div class="form-group">
          <label>Lembrar de atualizar o NFScanner a cada (dias)</label>
          <input id="cfg-nfs-prazo" type="number" min="1" max="60" value="${u.nfsPrazoDias || 7}" />
        </div>
      </div>
    </div>

    <!-- Aparência -->
    <div class="config-section">
      <h3>🎨 Aparência</h3>
      <div class="toggle-wrapper">
        <span>Tema Claro / Escuro</span>
        <label class="toggle">
          <input type="checkbox" id="cfg-tema" ${u.tema === 'escuro' ? 'checked' : ''} onchange="alternarTema(this.checked)" />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <!-- Segurança -->
    <div class="config-section">
      <h3>🔒 Segurança</h3>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-weight:600;">Conta Google</div>
          <div style="font-size:12px;color:var(--text-secondary);">${u.email || 'Não conectado'}</div>
        </div>
        <button class="btn-danger" onclick="signOut()">Desconectar</button>
      </div>
    </div>

    <!-- Dados -->
    <div class="config-section">
      <h3>💾 Dados</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <button class="btn-secondary" onclick="exportarJSON()">📦 Exportar Backup (JSON)</button>
        <button class="btn-secondary" onclick="document.getElementById('import-file').click()">📥 Importar Backup</button>
        ${existeEstadoPreImportacao() ? '<button class="btn-secondary" onclick="desfazerUltimaImportacao()">↩️ Desfazer importação</button>' : ''}
        <button class="btn-secondary" onclick="exportarExcel()">📊 Exportar Excel</button>
        <input type="file" id="import-file" accept=".json" style="display:none;" onchange="importarBackup(this)" />
      </div>
      <div style="margin-top:12px;font-size:12px;color:var(--text-muted);">
        Dados sincronizados automaticamente com o Google Drive.
      </div>
    </div>

    <!-- Origens de Pagamento -->
    <div class="config-section">
      <h3>💸 Origens de Pagamento</h3>
      <div id="origens-lista" style="margin-bottom:12px;">
        ${(DB.origensPagamento || []).map(o => `
          <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin-bottom:8px;">
            <span style="font-size:13px;">${o.emoji} <strong>${o.tipo}</strong> — ${o.titular}</span>
            <button onclick="removerOrigem(${o.id})" class="btn-danger btn-sm">✕</button>
          </div>
        `).join('')}
      </div>
      <div style="display:grid;grid-template-columns:60px 1fr 1fr auto;gap:8px;align-items:end;">
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Emoji</label>
          <input id="nova-origem-emoji" type="text" placeholder="🏦" maxlength="2" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Tipo</label>
          <input id="nova-origem-tipo" type="text" placeholder="Ex: Banco, Cashback..." />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Titular</label>
          <input id="nova-origem-titular" type="text" placeholder="Ex: Henrique" />
        </div>
        <button class="btn-primary btn-sm" onclick="adicionarOrigem()" style="margin-bottom:0;">+ Adicionar</button>
      </div>
    </div>

    <!-- Salvar -->
    <div style="display:flex;justify-content:flex-end;margin-top:8px;">
      <button class="btn-primary" onclick="salvarConfiguracoes()">💾 Salvar Configurações</button>
    </div>
  `;
}

function salvarConfiguracoes() {
  const nome = document.getElementById('cfg-nome').value.trim();
  const email = document.getElementById('cfg-email').value.trim();
  const renda = parseMoney(document.getElementById('cfg-renda').value);

  if (!nome) { showAlert('⚠️', 'Informe seu nome.'); return; }
  if (!email) { showAlert('⚠️', 'Informe seu e-mail.'); return; }
  if (!renda || renda <= 0) { showAlert('⚠️', 'Informe sua renda mensal.'); return; }

  DB.usuario.nome = nome;
  DB.usuario.email = email;
  DB.usuario.dataNascimento = document.getElementById('cfg-nascimento').value;
  DB.usuario.renda = renda;
  DB.usuario.limiteAlerta = parseMoney(document.getElementById('cfg-limite').value) || 500;
  DB.usuario.nfsPrazoDias = Math.max(1, parseInt(document.getElementById('cfg-nfs-prazo').value, 10) || 7);
  try { localStorage.setItem('nfs_prazo_dias', String(DB.usuario.nfsPrazoDias)); } catch (e) {}

  // Salva tudo no localStorage
  salvarLocalStorage();

  agendarSync();

  // Atualiza saudação no header se tiver
  const titulo = document.getElementById('page-title');
  if (titulo) titulo.textContent = 'Configurações';

  showAlert('✅', 'Configurações salvas com sucesso!');
  renderizarAlertas();
}

function alternarTema(escuro) {
  DB.usuario.tema = escuro ? 'escuro' : 'claro';
  salvarLocalStorage();
  agendarSync();
}

// Nunca aplica direto: mostra o que vai mudar e espera confirmacao.
// Um arquivo parcial (so algumas listas) e um backup completo entram pelo mesmo
// botao, entao o usuario precisa ver qual dos dois esta carregando.
function importarBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const nome = file.name;
  lerJSONImportacao(file).then(function(data) {
    window._importPendente = data;
    mostrarPreviaImportacao(data, nome);
  }).catch(function(e) {
    showAlert('❌', 'Erro ao ler: ' + e.message);
  });
  input.value = '';
}

function mostrarPreviaImportacao(data, nomeArquivo) {
  const a = analisarImportacao(data);

  const linhas = a.mudancas.map(function(m) {
    const n = (v) => (v === null ? '—' : v);
    const cor = m.perde > 0 ? 'var(--red)' : 'var(--text-primary)';
    const nota = m.perde > 0
      ? '<span style="color:var(--red);">substitui, perde ' + m.perde + '</span>'
      : (m.agora === null ? 'novo' : 'substitui');
    return '<tr><td style="padding:6px 8px;">' + esc(m.rotulo) + '</td>'
      + '<td style="padding:6px 8px;text-align:center;color:var(--text-secondary);">' + n(m.agora) + '</td>'
      + '<td style="padding:6px 8px;text-align:center;color:' + cor + ';font-weight:600;">' + n(m.depois) + '</td>'
      + '<td style="padding:6px 8px;font-size:11px;">' + nota + '</td></tr>';
  }).join('');

  const aviso = a.completo
    ? '<div style="background:rgba(34,197,94,0.1);border:1px solid var(--green);border-radius:8px;padding:12px;margin-bottom:14px;">'
      + '<strong style="color:var(--green);">📦 Backup completo</strong>'
      + '<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">O arquivo traz todas as áreas principais. Serve para restaurar o app inteiro.</div></div>'
    : '<div style="background:rgba(245,158,11,0.1);border:1px solid #f59e0b;border-radius:8px;padding:12px;margin-bottom:14px;">'
      + '<strong style="color:#f59e0b;">⚠️ Importação parcial</strong>'
      + '<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">Este arquivo <strong>não é um backup completo</strong>. Ele traz só algumas listas e vai <strong>substituir</strong> cada uma delas por inteiro. O resto continua como está.</div></div>';

  const intactas = a.intactas.length
    ? '<div style="font-size:11px;color:var(--text-secondary);margin-top:12px;">Não será tocado: ' + a.intactas.map(esc).join(', ') + '.</div>'
    : '';

  abrirModal('Conferir antes de importar', ''
    + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">Arquivo: <strong>' + esc(nomeArquivo) + '</strong></div>'
    + aviso
    + '<table style="width:100%;border-collapse:collapse;font-size:13px;">'
    + '<thead><tr style="border-bottom:1px solid var(--border);font-size:11px;color:var(--text-secondary);">'
    + '<th style="text-align:left;padding:6px 8px;">Lista</th><th style="padding:6px 8px;">Agora</th>'
    + '<th style="padding:6px 8px;">Depois</th><th style="text-align:left;padding:6px 8px;">Efeito</th></tr></thead>'
    + '<tbody>' + linhas + '</tbody></table>'
    + intactas
    + '<div style="font-size:11px;color:var(--text-secondary);margin-top:12px;">O estado atual fica guardado e você pode desfazer logo depois.</div>'
    + '<div class="modal-actions" style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">'
    + '<button class="btn-secondary" onclick="cancelarImportacao()">Cancelar</button>'
    + '<button class="btn-primary" onclick="confirmarImportacao()">Importar</button></div>', '560px');
}

function cancelarImportacao() {
  window._importPendente = null;
  fecharModal();
}

function confirmarImportacao() {
  const data = window._importPendente;
  if (!data) { fecharModal(); return; }
  aplicarImportacao(data);
  window._importPendente = null;
  fecharModal();
  renderizarAlertas();
  navigateTo('dashboard', document.querySelector('.nav-item'));
  showAlert('✅', 'Importado. Se não era o que você esperava, volte em Configurações e clique em Desfazer importação.');
}

function desfazerUltimaImportacao() {
  if (!desfazerImportacao()) { showAlert('⚠️', 'Não há importação recente para desfazer.'); return; }
  renderConfiguracoes();
  renderizarAlertas();
  navigateTo('dashboard', document.querySelector('.nav-item'));
  showAlert('↩️', 'Importação desfeita. Os dados voltaram ao estado anterior.');
}

function adicionarOrigem() {
  const emoji = document.getElementById('nova-origem-emoji')?.value.trim() || '💰';
  const tipo = document.getElementById('nova-origem-tipo')?.value.trim();
  const titular = document.getElementById('nova-origem-titular')?.value.trim();
  if (!tipo || !titular) { showAlert('⚠️', 'Informe o tipo e o titular.'); return; }
  if (!DB.origensPagamento) DB.origensPagamento = [];
  DB.origensPagamento.push({ id: gerarId(), emoji, tipo, titular });
  agendarSync();
  renderConfiguracoes();
  showAlert('✅', 'Origem adicionada!');
}

function removerOrigem(id) {
  if (confirm('Remover esta origem?')) {
    DB.origensPagamento = DB.origensPagamento.filter(o => o.id !== id);
    agendarSync();
    renderConfiguracoes();
  }
}
