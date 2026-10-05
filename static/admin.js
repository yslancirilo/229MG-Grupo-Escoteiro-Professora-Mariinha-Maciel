let allData = [];
const TOKEN = document.getElementById('adminSection').getAttribute('data-token');

async function fetchApi(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api?${qs}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Erro de rede');
  }
  const data = await res.json();
  if (data.status === 'error') {
    throw new Error(data.message || 'Erro na resposta');
  }
  return data;
}

async function loadData() {
  try {
    const result = await fetchApi({ action: 'getData' });
    allData = result.data || [];
    renderTable(allData);
    updateCount();
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
    alert('Erro ao carregar dados: ' + e.message);
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
    const td1 = document.createElement('td');
    td1.textContent = idx + 1;
    const td2 = document.createElement('td');
    td2.textContent = row.data || '';
    const td3 = document.createElement('td');
    td3.textContent = row.nomeJovem || '';
    const td4 = document.createElement('td');
    td4.textContent = row.idadeJovem || '';
    const td5 = document.createElement('td');
    td5.textContent = row.nomeResponsavel || '';
    const td6 = document.createElement('td');
    td6.textContent = row.endereco || '';
    const td7 = document.createElement('td');
    td7.textContent = row.contato || '';
    const td8 = document.createElement('td');
    td8.textContent = row.confirmacao || '';
    const td9 = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'btn-delete';
    btn.textContent = 'Deletar';
    deleteRow(row.id)
    btn.addEventListener('click', () => deleteRow(row.id || idx));
    td9.appendChild(btn);
    
    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tr.appendChild(td4);
    tr.appendChild(td5);
    tr.appendChild(td6);
    tr.appendChild(td7);
    tr.appendChild(td8);
    tr.appendChild(td9);
    tbody.appendChild(tr);
  });
}

function updateCount() {
  document.getElementById('totalCount').textContent = `Total: ${allData.length} pré-inscrição(ões)`;
}

async function deleteRow(rowId) {
  if (confirm('Tem certeza que deseja deletar?')) {
    try {
      await fetchApi({ action: 'deleteRow', rowId: rowId });
      await loadData();
    } catch (e) {
      console.error('Erro ao deletar:', e);
      alert('Erro ao deletar: ' + e.message);
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
    row.map(cell => {
      const str = String(cell);
      if (str.match(/^[=+\-@]/)) return `'${str}`;
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
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
      await fetchApi({ action: 'clearAll' });
      allData = [];
      renderTable(allData);
      updateCount();
    } catch (e) {
      console.error('Erro ao limpar dados:', e);
      alert('Erro ao limpar dados: ' + e.message);
    }
  }
});

document.getElementById('btnLogout').addEventListener('click', function () {
  window.location.href = '/';
});

loadData();
