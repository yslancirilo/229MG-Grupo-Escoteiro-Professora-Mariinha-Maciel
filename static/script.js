document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('formPreInscricao');
const successMsg = document.getElementById('successMsg');
const btnSubmit = form.querySelector('button[type="submit"]');
const btnNext = document.getElementById('btnNext');
const btnBack = document.getElementById('btnBack');

if (btnNext) btnNext.addEventListener('click', nextStep);
if (btnBack) btnBack.addEventListener('click', prevStep);

document.getElementById('contato').addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d*)$/, '($1) $2-$3');
  else if (v.length > 2) v = v.replace(/^(\d{2})(\d*)$/, '($1) $2');
  this.value = v;
});

function sanitize(str) {
  return String(str).replace(/[<>"'`]/g, '').trim().slice(0, 500);
}

function setError(id, msg) {
  const el = document.getElementById('err-' + id);
  const input = document.getElementById(id);
  if (el) el.textContent = msg;
  if (input) input.classList.toggle('invalid', !!msg);
}

function clearErrors() {
  ['nomeJovem', 'idadeJovem', 'nomeResponsavel', 'endereco', 'contato', 'lgpd', 'confirmacao']
    .forEach(id => setError(id, ''));
}

function validateStep1() {
  let ok = true;
  console.log('Iniciando validação step1');
  
  if (!document.getElementById('nomeJovem').value || document.getElementById('nomeJovem').value.length < 2) {
    console.log('Erro: nomeJovem inválido');
    setError('nomeJovem', 'Informe o nome do jovem.'); ok = false;
  }
  
  const idade = parseInt(document.getElementById('idadeJovem').value);
  if (!idade || idade < 7 || idade > 11) {
    console.log('Erro: idade inválida', idade);
    setError('idadeJovem', 'Idade deve estar entre 7 e 11 anos.'); ok = false;
  }
  
  if (!document.getElementById('nomeResponsavel').value || document.getElementById('nomeResponsavel').value.length < 5) {
    console.log('Erro: nomeResponsavel inválido');
    setError('nomeResponsavel', 'Informe o nome completo do responsável.'); ok = false;
  }
  
  if (!document.getElementById('endereco').value || document.getElementById('endereco').value.length < 5) {
    console.log('Erro: endereco inválido');
    setError('endereco', 'Informe o endereço.'); ok = false;
  }
  
  if (document.getElementById('contato').value.replace(/\D/g, '').length < 10) {
    console.log('Erro: contato inválido');
    setError('contato', 'Informe um telefone válido com DDD.'); ok = false;
  }
  
  if (!document.getElementById('lgpd').checked) {
    console.log('Erro: lgpd não marcado');
    setError('lgpd', 'É necessário aceitar o termo LGPD.'); ok = false;
  }
  
  console.log('Validação step1 resultado:', ok);
  return ok;
}

function validateStep2() {
  let ok = true;
  const confirmacao = document.querySelector('input[name="confirmacao"]:checked');
  if (!confirmacao) {
    setError('confirmacao', 'Selecione uma opção.'); ok = false;
  }
  return ok;
}

function nextStep() {
  clearErrors();
  console.log('nextStep chamado');
  if (!validateStep1()) {
    console.log('Validação falhou');
    return;
  }
  console.log('Validação passou, mudando para step2');
  document.getElementById('step1').classList.remove('active');
  document.getElementById('step2').classList.remove('hidden');
  document.getElementById('step2').classList.add('active');
  console.log('Step2 classes:', document.getElementById('step2').className);
}

function prevStep() {
  clearErrors();
  document.getElementById('step2').classList.remove('active');
  document.getElementById('step2').classList.add('hidden');
  document.getElementById('step1').classList.add('active');
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  clearErrors();

  if (!validateStep2()) return;

  const data = {
    nomeJovem: sanitize(document.getElementById('nomeJovem').value),
    idadeJovem: document.getElementById('idadeJovem').value,
    nomeResponsavel: sanitize(document.getElementById('nomeResponsavel').value),
    endereco: sanitize(document.getElementById('endereco').value),
    contato: sanitize(document.getElementById('contato').value),
    lgpd: document.getElementById('lgpd').checked,
    confirmacao: document.querySelector('input[name="confirmacao"]:checked').value,
  };

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Enviando...';

  try {
    const params = new URLSearchParams({ action: 'submit', ...data }).toString();
    await fetch(`/api?${params}`);
    setTimeout(() => {
      form.classList.add('hidden');
      successMsg.classList.remove('hidden');
    }, 1500);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Enviar Inscrição';
  }
});
