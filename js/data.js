// ===== DATA STORE =====
// Central state management for Dívidas Nunca Mais!

const DB = {
  usuario: {
    nome: '',
    email: '',
    foto: '',
    renda: 0,
    saldoAtual: 0,
    limiteAlerta: 500,
    dataNascimento: '',
    tema: 'escuro'
  },
  dividas: [],
  pagamentos: [],
  orcamentos: [],
  _nextId: 1
};

function gerarId() {
  return DB._nextId++;
}

// ===== GOOGLE DRIVE SYNC =====
const DRIVE_FILENAME = 'dividas-nunca-mais-data.json';
let driveFileId = null;
let syncTimeout = null;

async function salvarNoDrive() {
  if (!accessToken) return;
  try {
    const content = JSON.stringify(DB, null, 2);
    const headers = { 
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    if (driveFileId) {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=media`, {
        method: 'PATCH', headers, body: content
      });
    } else {
      // Cria o arquivo
      const meta = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: DRIVE_FILENAME, mimeType: 'application/json' })
      }).then(r => r.json());
      driveFileId = meta.id;
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=media`, {
        method: 'PATCH', headers, body: content
      });
    }
    console.log('Drive sync OK');
  } catch(e) {
    console.warn('Drive save error:', e);
  }
}

async function carregarDoDrive() {
  if (!accessToken) return false;
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FILENAME}'+and+trashed=false&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).then(r => r.json());

    if (res.files && res.files.length > 0) {
      driveFileId = res.files[0].id;
      const data = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }).then(r => r.json());
      Object.assign(DB, data);
      console.log('Drive load OK');
      return true;
    }
  } catch(e) {
    console.warn('Drive load error:', e);
  }
  return false;
}

function agendarSync() {
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    // Salva no localStorage imediatamente
    if (typeof salvarLocalStorage === 'function') salvarLocalStorage();
    // Tenta salvar no Drive
    salvarNoDrive();
  }, 1500);
}

// ===== CRUD DÍVIDAS =====
function adicionarDivida(divida) {
  if (!divida.isExemplo) DB.dividas = DB.dividas.filter(d => !d.isExemplo);
  divida.id = gerarId();
  divida.criadaEm = new Date().toISOString();
  divida.parcelas = gerarParcelas(divida);
  DB.dividas.push(divida);
  agendarSync();
  return divida;
}

function editarDivida(id, dados) {
  const idx = DB.dividas.findIndex(d => d.id === id);
  if (idx !== -1) {
    DB.dividas[idx] = { ...DB.dividas[idx], ...dados };
    DB.dividas[idx].parcelas = gerarParcelas(DB.dividas[idx]);
    agendarSync();
  }
}

function moverParaLixeira(id) {
  const divida = DB.dividas.find(d => d.id === id);
  if (divida) {
    divida.lixeira = true;
    divida.lixeiraEm = new Date().toISOString();
    agendarSync();
  }
}

function restaurarDaLixeira(id) {
  const divida = DB.dividas.find(d => d.id === id);
  if (divida) {
    divida.lixeira = false;
    agendarSync();
  }
}

function duplicarDivida(id) {
  const divida = DB.dividas.find(d => d.id === id);
  if (divida) {
    const nova = { ...divida, id: gerarId(), criadaEm: new Date().toISOString(), nome: divida.nome + ' (cópia)' };
    nova.parcelas = gerarParcelas(nova);
    DB.dividas.push(nova);
    agendarSync();
    return nova;
  }
}

function getDividas(incluirLixeira = false) {
  return DB.dividas.filter(d => incluirLixeira ? d.lixeira : !d.lixeira);
}

// ===== PARCELAS =====
function gerarParcelas(divida) {
  if (!divida.totalParcelas || divida.totalParcelas <= 1) return [];
  const parcelas = [];
  const valorParcela = calcularValorParcela(divida);
  const dataInicio = new Date(divida.dataVencimento);
  for (let i = 0; i < divida.totalParcelas; i++) {
    const data = new Date(dataInicio);
    data.setMonth(data.getMonth() + i);
    parcelas.push({
      numero: i + 1,
      valor: valorParcela,
      dataVencimento: data.toISOString().split('T')[0],
      status: 'pendente',
      pago: false,
      valorPago: 0,
      dataPagamento: null
    });
  }
  return parcelas;
}

function calcularValorParcela(divida) {
  if (!divida.totalParcelas || divida.totalParcelas <= 1) return divida.valor;
  const n = divida.totalParcelas;
  const taxa = (divida.jurosMes || 0) / 100;
  if (taxa === 0) return divida.valor / n;
  // Tabela Price
  return divida.valor * (taxa * Math.pow(1 + taxa, n)) / (Math.pow(1 + taxa, n) - 1);
}

// ===== PAGAMENTOS =====
function registrarPagamento(dividaId, parcelasIds, valorPago, dataPagamento, observacao) {
  const divida = DB.dividas.find(d => d.id === dividaId);
  if (!divida) return;

  const pagamento = {
    id: gerarId(),
    dividaId,
    parcelasIds,
    valorPago,
    dataPagamento: dataPagamento || new Date().toISOString().split('T')[0],
    observacao,
    criadoEm: new Date().toISOString()
  };

  // Marca parcelas como pagas
  if (divida.parcelas && parcelasIds) {
    parcelasIds.forEach(pi => {
      const parcela = divida.parcelas[pi];
      if (parcela) {
        parcela.pago = true;
        parcela.status = 'pago';
        parcela.dataPagamento = pagamento.dataPagamento;
        parcela.valorPago = valorPago / parcelasIds.length;
      }
    });
  }

  // Atualiza status geral
  atualizarStatusDivida(divida);
  DB.pagamentos.push(pagamento);
  agendarSync();
  return pagamento;
}

function atualizarStatusDivida(divida) {
  if (!divida.parcelas || divida.parcelas.length === 0) return;
  const todas = divida.parcelas.length;
  const pagas = divida.parcelas.filter(p => p.pago).length;
  if (pagas === todas) divida.status = 'pago';
  else if (pagas > 0) divida.status = 'pendente';
}

// ===== CÁLCULOS =====
function calcularJurosAcumulados(divida) {
  const hoje = new Date();
  const venc = new Date(divida.dataVencimento);
  if (divida.status === 'pago' || hoje <= venc) return 0;
  const diasAtraso = Math.floor((hoje - venc) / (1000 * 60 * 60 * 24));
  const taxa = (divida.jurosMes || 0) / 100;
  if (taxa === 0) return 0;
  // Juros compostos
  return divida.valor * (Math.pow(1 + taxa, diasAtraso / 30) - 1);
}

function calcularDiasAtraso(divida) {
  if (divida.status === 'pago') return 0;
  const hoje = new Date();
  const venc = new Date(divida.dataVencimento);
  if (hoje <= venc) return 0;
  return Math.floor((hoje - venc) / (1000 * 60 * 60 * 24));
}

function calcularScorePrioridade(divida) {
  const juros = divida.jurosMes || 0;
  const valor = divida.valor || 0;
  const diasAtraso = calcularDiasAtraso(divida);
  // Normaliza cada fator (0-100)
  const scoreJuros = Math.min(juros * 5, 100); // até 20% = score 100
  const scoreValor = Math.min(valor / 100, 100); // até R$10k = score 100
  const scoreVenc = Math.min(diasAtraso, 100);
  return (scoreJuros * 0.5) + (scoreValor * 0.3) + (scoreVenc * 0.2);
}

function getTotalDividas() {
  return getDividas().filter(d => d.status !== 'pago').reduce((sum, d) => sum + (d.valor || 0), 0);
}

function getTotalJuros() {
  return getDividas().reduce((sum, d) => sum + calcularJurosAcumulados(d), 0);
}

function getTotalMultas() {
  return getDividas().filter(d => calcularDiasAtraso(d) > 0).reduce((sum, d) => sum + (d.multa || 0), 0);
}

function getContasAtrasadas() {
  return getDividas().filter(d => calcularDiasAtraso(d) > 0 && d.status !== 'pago');
}

function getContasVencendoSemana() {
  const hoje = new Date();
  const semana = new Date(hoje); semana.setDate(semana.getDate() + 7);
  return getDividas().filter(d => {
    const venc = new Date(d.dataVencimento);
    return venc >= hoje && venc <= semana && d.status !== 'pago';
  });
}

function getValorComprometidoMes() {
  const hoje = new Date();
  return getDividas().filter(d => {
    const venc = new Date(d.dataVencimento);
    return venc.getMonth() === hoje.getMonth() && venc.getFullYear() === hoje.getFullYear();
  }).reduce((sum, d) => sum + (d.valor || 0), 0);
}

function getValorPagoMes() {
  const hoje = new Date();
  return DB.pagamentos.filter(p => {
    const data = new Date(p.dataPagamento);
    return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
  }).reduce((sum, p) => sum + (p.valorPago || 0), 0);
}

function getPorcentagemQuitada() {
  const todas = DB.dividas.length;
  if (todas === 0) return 0;
  const pagas = DB.dividas.filter(d => d.status === 'pago').length;
  return Math.round((pagas / todas) * 100);
}

function getTotalEconomizado() {
  return DB.pagamentos.reduce((sum, p) => {
    const divida = DB.dividas.find(d => d.id === p.dividaId);
    if (!divida) return sum;
    const jurosEvitados = calcularJurosAcumulados(divida);
    return sum + jurosEvitados;
  }, 0);
}

// ===== ALERTAS =====
function gerarAlertas() {
  const alertas = [];
  const atrasadas = getContasAtrasadas();
  const semana = getContasVencendoSemana();
  const saldo = DB.usuario.saldoAtual;
  const limite = DB.usuario.limiteAlerta;

  atrasadas.forEach(d => alertas.push({
    tipo: 'red', msg: `⚠️ ${d.nome} está atrasada há ${calcularDiasAtraso(d)} dias!`
  }));
  semana.forEach(d => alertas.push({
    tipo: 'yellow', msg: `⏰ ${d.nome} vence em breve: ${formatarData(d.dataVencimento)}`
  }));
  if (saldo <= limite && saldo > 0) alertas.push({
    tipo: 'yellow', msg: `💰 Saldo disponível baixo: ${formatarMoeda(saldo)}`
  });
  if (saldo <= 0) alertas.push({
    tipo: 'red', msg: `🚨 Saldo negativo! Atenção ao seu fluxo de caixa.`
  });

  const meta50 = getPorcentagemQuitada();
  if (meta50 >= 50 && meta50 < 51) alertas.push({
    tipo: 'green', msg: `🎉 Parabéns! Você já quitou 50% das suas dívidas!`
  });

  return alertas;
}

// ===== EXPORT / IMPORT =====
function exportarJSON() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `dividas-nunca-mais-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

function importarJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        Object.assign(DB, data);
        agendarSync();
        resolve(true);
      } catch { reject(new Error('Arquivo inválido')); }
    };
    reader.readAsText(file);
  });
}

function exportarExcel() {
  // CSV simples compatível com Excel
  const headers = ['Nome','Categoria','Subcategoria','Valor','Vencimento','Status','Juros/Mês','Multa','Parcelas','Dias Atraso'];
  const rows = getDividas().map(d => [
    d.nome, d.categoria, d.subcategoria || '',
    d.valor, d.dataVencimento, d.status,
    d.jurosMes || 0, d.multa || 0,
    d.totalParcelas || 1, calcularDiasAtraso(d)
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `dividas-nunca-mais-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

// ===== CASHBACK & PONTOS =====
if (!DB.programas) DB.programas = [
  { id: 1, nome: 'Livelo', tipo: 'pontos', saldo: 0, expiracao: null, cor: '#e63946', logo: '💎' },
  { id: 2, nome: 'Méliuz', tipo: 'cashback', saldo: 0, expiracao: null, cor: '#00b4d8', logo: '💰' },
  { id: 3, nome: 'Dinheiro na Nota', tipo: 'cashback', saldo: 0, expiracao: null, cor: '#2d6a4f', logo: '🧾' },
  { id: 4, nome: 'Nota Paraná', tipo: 'pontos', saldo: 0, expiracao: null, cor: '#457b9d', logo: '📋' },
  { id: 5, nome: 'Meu Posto', tipo: 'pontos', saldo: 0, expiracao: null, cor: '#e9c46a', logo: '⛽' },
  { id: 6, nome: 'KMV', tipo: 'pontos', saldo: 0, expiracao: null, cor: '#f4a261', logo: '🚗' },
  { id: 7, nome: 'Nespresso Dolce Gusto', tipo: 'pontos', saldo: 0, expiracao: null, cor: '#6d4c41', logo: '☕' },
  { id: 8, nome: 'Azul Linhas Aéreas', tipo: 'pontos', saldo: 0, expiracao: null, cor: '#1d3557', logo: '✈️' },
];
if (!DB.resgates) DB.resgates = [];

function adicionarPrograma(programa) {
  programa.id = gerarId();
  DB.programas.push(programa);
  agendarSync();
}

function atualizarSaldoPrograma(id, novoSaldo) {
  const p = DB.programas.find(p => p.id === id);
  if (p) { p.saldo = novoSaldo; agendarSync(); }
}

function registrarResgate(programaId, quantidade, descricao) {
  const p = DB.programas.find(p => p.id === programaId);
  if (!p) return;
  p.saldo = Math.max(0, p.saldo - quantidade);
  DB.resgates.push({
    id: gerarId(),
    programaId,
    quantidade,
    descricao,
    data: new Date().toISOString().split('T')[0]
  });
  agendarSync();
}
