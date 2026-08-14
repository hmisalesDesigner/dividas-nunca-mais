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

function importarBackup(input) {
  const file = input.files[0];
  if (!file) return;
  importarJSON(file).then(() => {
    showAlert('✅', 'Backup importado com sucesso!');
    renderizarAlertas();
    navigateTo('dashboard', document.querySelector('.nav-item'));
  }).catch(e => {
    showAlert('❌', 'Erro ao importar: ' + e.message);
  });
  input.value = '';
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
