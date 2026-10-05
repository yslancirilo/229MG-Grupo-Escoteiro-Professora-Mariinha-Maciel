let allData = [];

async function fetchApi(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api?${qs}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error('Erro de rede');
  return res.json();
}

async function loadData() {
  try {
    const result = await fetchApi({ action: 'getData', token: TOKEN });
    allData = result.data || [];
    renderTable(allData);
    updateCount();
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
  }
}

function renderTable(data) {
  const tbody = document.getElementById('tableBody');
  const emptyMsg = document.getElementById('emptyMsg');
  
  tbody.innerHTML = '';
  
  if (data.length === 0) {
    emptyMsg.classList.remove('hidden');
    return;
  }
  
  emptyMsg.classList.add('hidden');
  
  data.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${row.data || ''}</td>
      <td>${row.nomeJovem || ''}</td>
      <td>${row.idadeJovem || ''}</td>
      <td>${row.nomeResponsavel || ''}</td>
      <td>${row.endereco || ''}</td>
      <td>${row.contato || ''}</td>
      <td>${row.confirmacao || ''}</td>
      <td><button class="btn-delete" onclick="deleteRow(${idx})">Deletar</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function updateCount() {
  document.getElementById('totalCount').textContent = `Total: ${allData.length} pré-inscrição(ões)`;
}

async function deleteRow(idx) {
  if (confirm('Tem certeza que deseja deletar?')) {
    const row = allData[idx];
    try {
      await fetchApi({ action: 'deleteRow', token: TOKEN, rowId: row.id || idx });
      allData.splice(idx, 1);
      renderTable(allData);
      updateCount();
    } catch (e) {
      console.error('Erro ao deletar:', e);
      alert('Erro ao deletar registro');
    }
  }
}

document.getElementById('searchInput').addEventListener('input', function () {
  const query = this.value.toLowerCase();
  const filtered = allData.filter(row => 
    (row.nomeJovem || '').toLowerCase().includes(query) ||
    (row.nomeResponsavel || '').toLowerCase().includes(query)
  );
  renderTable(filtered);
});

document.getElementById('btnExport').addEventListener('click', function () {
  if (allData.length === 0) {
    alert('Nenhum dado para exportar');
    return;
  }
  
  const headers = ['#', 'Data', 'Jovem', 'Idade', 'Responsável', 'Endereço', 'Contato', 'Confirmação'];
  const rows = allData.map((row, idx) => [
    idx + 1,
    row.data || '',
    row.nomeJovem || '',
    row.idadeJovem || '',
    row.nomeResponsavel || '',
    row.endereco || '',
    row.contato || '',
    row.confirmacao || '',
  ]);
  
  const csv = [headers, ...rows].map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `inscricoes_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
});

document.getElementById('btnClearAll').addEventListener('click', async function () {
  if (confirm('Tem certeza que deseja limpar TODOS os dados?')) {
    try {
      await fetchApi({ action: 'clearAll', token: TOKEN });
      allData = [];
      renderTable(allData);
      updateCount();
    } catch (e) {
      console.error('Erro ao limpar dados:', e);
      alert('Erro ao limpar dados');
    }
  }
});

document.getElementById('btnLogout').addEventListener('click', function () {
  window.location.href = '/';
});

loadData();
