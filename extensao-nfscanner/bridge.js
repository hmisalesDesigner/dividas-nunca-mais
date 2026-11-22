// Ponte entre a extensão e o site (NFScanner / Dívidas Nunca Mais) em hmisalesdesigner.github.io
(function () {
  const K = 'nfs';
  const get = () => new Promise(r => chrome.storage.local.get(K, v => r(v[K] || { notas: {}, lastSync: 0, sorteios: [], lastSyncSorteios: 0 })));
  const set = d => new Promise(r => chrome.storage.local.set({ [K]: d }, r));

  // Informa ao site quando foi a última coleta (usado no lembrete do Dívidas Nunca Mais)
  get().then(d => {
    try {
      localStorage.setItem('nfs_ext_installed', '1');
      if (d.lastSync) localStorage.setItem('nfs_last_sync', String(d.lastSync));
      if (d.lastSyncSorteios) localStorage.setItem('nfs_last_sync_sorteios', String(d.lastSyncSorteios));
    } catch (e) {}
  });

  window.addEventListener('message', async ev => {
    if (ev.source !== window || !ev.data || ev.data.source !== 'nfscanner-app') return;
    const m = ev.data, reply = p => window.postMessage(Object.assign({ source: 'nfs-extension', reqId: m.reqId }, p), '*');
    const d = await get();
    const todas = Object.values(d.notas);
    if (m.type === 'NFS_PING') {
      reply({ type: 'NFS_PONG', ok: true, lastSync: d.lastSync || 0, total: todas.length,
        pendentes: todas.filter(n => n.html && !n.importado).length,
        sorteios: (d.sorteios || []).length, lastSyncSorteios: d.lastSyncSorteios || 0 });
    } else if (m.type === 'NFS_GET_PENDING') {
      const lote = todas.filter(n => n.html && !n.importado).slice(0, m.limit || 40);
      reply({ type: 'NFS_PENDING', notas: lote });
    } else if (m.type === 'NFS_GET_SORTEIOS') {
      reply({ type: 'NFS_SORTEIOS', sorteios: d.sorteios || [], lastSync: d.lastSyncSorteios || 0 });
    } else if (m.type === 'NFS_MARK_IMPORTED') {
      (m.ids || []).forEach(id => { if (d.notas[id]) { d.notas[id].importado = true; d.notas[id].html = ''; } });
      await set(d);
      reply({ type: 'NFS_MARKED', ok: true });
    }
  });
})();
