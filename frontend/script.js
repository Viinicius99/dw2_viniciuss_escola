// 🎯 SISTEMA DE SINCRONIZAÇÃO AUTOMÁTICA BACKEND/FRONTEND
// Este sistema garante que o frontend SEMPRE encontre o backend
// Funciona em qualquer PC, qualquer situação
console.log('🚀 Iniciando Sistema de Sincronização Automática...');

// Estado da conexão
let API_BASE = '';
let isBackendConnected = false;
let connectionRetries = 0;
const MAX_RETRIES = 30; // 30 tentativas = ~1 minuto

// 🔧 Função principal de sincronização automática
async function iniciarSincronizacao() {
    console.log('🔄 Buscando backend automaticamente...');
    
    // Lista de possíveis localizações do backend
    const tentativas = [
        'http://127.0.0.1:8005',     // Local padrão
        'http://localhost:8005',      // Local alternativo  
        window.location.origin,       // Mesmo servidor (se servido pelo FastAPI)
        'http://0.0.0.0:8005',       // Bind all interfaces
        localStorage.getItem('API_URL') // URL salva anteriormente
    ].filter(Boolean); // Remove valores null/undefined
    
    for (const url of tentativas) {
        if (await testarConexaoBackend(url)) {
            API_BASE = url;
            isBackendConnected = true;
            localStorage.setItem('API_URL', url); // Salva para próxima vez
            
            console.log(`✅ BACKEND CONECTADO: ${API_BASE}`);
            await verificarDadosIniciais();
            return true;
        }
    }
    
    // Se chegou aqui, nenhuma conexão funcionou
    console.error('🚨 BACKEND NÃO ENCONTRADO EM NENHUMA LOCALIZAÇÃO');
    mostrarStatusDesconectado();
    
    // Tenta reconectar automaticamente a cada 2 segundos
    setTimeout(reconectarAutomaticamente, 2000);
    return false;
}

// 🔍 Testa uma URL específica do backend
async function testarConexaoBackend(url) {
    try {
        console.log(`🔍 Testando: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
        
        const response = await fetch(`${url}/health`, {
            method: 'GET',
            mode: 'cors',
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ ${url} respondeu:`, data);
            return true;
        }
        
        console.log(`❌ ${url} retornou status ${response.status}`);
        return false;
        
    } catch (error) {
        console.log(`❌ ${url} falhou:`, error.message);
        return false;
    }
}

// 🔄 Função de reconexão automática
async function reconectarAutomaticamente() {
    if (isBackendConnected) return; // Já conectado
    
    connectionRetries++;
    console.log(`🔄 Tentativa de reconexão ${connectionRetries}/${MAX_RETRIES}...`);
    
    if (connectionRetries <= MAX_RETRIES) {
        const connected = await iniciarSincronizacao();
        if (connected) {
            connectionRetries = 0; // Reset contador
            atualizarStatusConectado();
            await carregarTudo(); // Recarrega dados
        }
    } else {
        console.error('🚨 Máximo de tentativas atingido. Parando reconexão automática.');
        mostrarInstrucoesManual();
    }
}

// 📊 Verifica se há dados no backend
async function verificarDadosIniciais() {
    try {
        const alunosResponse = await fetch(`${API_BASE}/alunos`);
        const turmasResponse = await fetch(`${API_BASE}/turmas`);
        
        if (alunosResponse.ok && turmasResponse.ok) {
            const alunos = await alunosResponse.json();
            const turmas = await turmasResponse.json();
            
            console.log(`📊 Dados encontrados: ${alunos.length} alunos, ${turmas.length} turmas`);
            
            // Mostra status na tela
            mostrarStatusSincronizado(alunos.length, turmas.length);
            
            return true;
        }
    } catch (error) {
        console.error('❌ Erro ao verificar dados:', error);
    }
    return false;
}

// 🎯 Mostra status de sincronização na tela
function mostrarStatusSincronizado(numAlunos, numTurmas) {
    const statusDiv = document.getElementById('connection-status') || criarStatusDiv();
    statusDiv.innerHTML = `
        <div style="background: #4CAF50; color: white; padding: 10px; border-radius: 5px; margin: 10px 0;">
            ✅ <strong>Sistema Sincronizado</strong> | 
            Backend: ${API_BASE} | 
            📊 ${numAlunos} alunos, ${numTurmas} turmas
        </div>
    `;
}

// 🚨 Mostra status desconectado
function mostrarStatusDesconectado() {
    const statusDiv = document.getElementById('connection-status') || criarStatusDiv();
    statusDiv.innerHTML = `
        <div style="background: #ff9800; color: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
            ⚠️ <strong>Buscando Backend...</strong> 
            <span id="retry-counter">Tentativa ${connectionRetries}/${MAX_RETRIES}</span>
            <div style="margin-top: 10px; font-size: 0.9em;">
                💡 Certifique-se que o backend está rodando: <code>python run.py</code>
            </div>
        </div>
    `;
    
    // Atualiza contador em tempo real
    const interval = setInterval(() => {
        const counter = document.getElementById('retry-counter');
        if (counter) {
            counter.textContent = `Tentativa ${connectionRetries}/${MAX_RETRIES}`;
        } else {
            clearInterval(interval);
        }
    }, 500);
}

// 📋 Cria div de status se não existir
function criarStatusDiv() {
    let statusDiv = document.getElementById('connection-status');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'connection-status';
        statusDiv.style.position = 'fixed';
        statusDiv.style.top = '10px';
        statusDiv.style.right = '10px';
        statusDiv.style.zIndex = '9999';
        statusDiv.style.maxWidth = '400px';
        document.body.appendChild(statusDiv);
    }
    return statusDiv;
}

// ✅ Atualiza para status conectado
function atualizarStatusConectado() {
    const statusDiv = document.getElementById('connection-status');
    if (statusDiv) {
        setTimeout(() => {
            statusDiv.style.opacity = '0';
            setTimeout(() => statusDiv.remove(), 300);
        }, 3000); // Remove após 3 segundos
    }
}

// 📖 Mostra instruções manuais quando falha
function mostrarInstrucoesManual() {
    const statusDiv = document.getElementById('connection-status') || criarStatusDiv();
    statusDiv.innerHTML = `
        <div style="background: #f44336; color: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
            🚨 <strong>Backend Não Encontrado</strong>
            <div style="margin-top: 10px;">
                <strong>Para sincronizar:</strong><br>
                1. Abra terminal na pasta do projeto<br>
                2. Execute: <code>python run.py</code><br>
                3. <button onclick="location.reload()" style="background: white; color: #f44336; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">🔄 Recarregar</button>
            </div>
        </div>
    `;
}

// 🌐 Função buildUrl atualizada
function buildUrl(path) {
    const p = String(path || '/');
    if (!API_BASE) {
        return p.startsWith('/') ? p : `/${p}`;
    }
    const trimmedBase = API_BASE.replace(/\/$/, '');
    return p.startsWith('/') ? `${trimmedBase}${p}` : `${trimmedBase}/${p}`;
}

// 🎯 Inicialização automática quando a página carrega
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Página carregada - iniciando sincronização...');
    await iniciarSincronizacao();
});

// 🔄 Reconecta quando volta do background
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !isBackendConnected) {
        console.log('👁️ Página ficou visível - verificando conexão...');
        iniciarSincronizacao();
    }
});

// Permite configurar a URL da API manualmente se necessário
window.setApiBase = function setApiBase(url) {
    try {
        if (!/^https?:\/\//i.test(url)) {
            console.error('URL inválida. Use http:// ou https://');
            return;
        }
        localStorage.setItem('API_URL', url.replace(/\/$/, ''));
        console.log('API_URL salva. Tentando conectar...');
        iniciarSincronizacao();
    } catch (e) {
        console.error('Falha ao salvar API_URL:', e);
    }
};

// Estado sincronizado com a API (FastAPI)
// Define a base da API de forma dinâmica para funcionar em qualquer PC.
// - Se estiver sendo servido por HTTP(S) (via FastAPI), usa mesma origem ('').
// - Se abrir via file://, usa valor salvo em localStorage('API_URL') ou fallback localhost.
const API_URL = (() => {
  try {
    // Se está no Live Server (porta 5500) ou file://, sempre usar backend na 8005
    if (typeof window !== 'undefined' && window.location) {
      const port = window.location.port;
      const protocol = window.location.protocol;
      
      console.log('Detectando ambiente - Port:', port, 'Protocol:', protocol);
      
      // Se está no Live Server (5500) ou file://, apontar para backend
      if (protocol === 'file:' || port === '5500' || port !== '8005') {
        const apiUrl = localStorage.getItem('API_URL') || 'http://127.0.0.1:8005';
        console.log('Usando API_URL para Live Server/file:', apiUrl);
        return apiUrl;
      }
      
      // Se está sendo servido pelo FastAPI (porta 8005), usar mesma origem
      if (port === '8005') {
        console.log('Detectado FastAPI - usando mesma origem');
        return '';
      }
    }
  } catch (_e) {}
  const fallback = localStorage.getItem('API_URL') || 'http://127.0.0.1:8005';
  console.log('Usando fallback API_URL:', fallback);
  return fallback;
})();

// Concatena a base da API e o caminho sem quebrar o esquema (http://)
function buildUrl_old(path) {
  const base = String(API_URL || '');
  const p = String(path || '/');
  if (!base) {
    // Mesmo host da página (servido pelo FastAPI)
    return p.startsWith('/') ? p : `/${p}`;
  }
  const trimmedBase = base.replace(/\/$/, '');
  return p.startsWith('/') ? `${trimmedBase}${p}` : `${trimmedBase}/${p}`;
}

// Permite configurar a URL da API quando o site é aberto via file:// em outro PC
// Uso no console do navegador: setApiBase('http://SEU_IP:8005') e recarregue
window.setApiBase_old = function setApiBase(url) {
  try {
    if (!/^https?:\/\//i.test(url)) {
      showFeedback('URL inválida. Use http:// ou https://', 'error');
      return;
    }
    localStorage.setItem('API_URL', url.replace(/\/$/, ''));
    showFeedback('API_URL salva. Carregando dados...', 'success');
    // Não recarregar a página, apenas recarregar os dados
    setTimeout(async () => {
      await carregarTudo();
    }, 300);
  } catch (e) {
    console.error('Falha ao salvar API_URL:', e);
  }
};
let students = [];
let transfersToday = 0;
let classes = [];
// Autenticação persistente
let token = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// Sistema de Login SIMPLIFICADO
async function doLogin(username, password) {
  try {
  const res = await fetch(buildUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${username}&password=${password}&grant_type=password`,
    });
    
    if (!res.ok) {
      throw new Error('Login falhou');
    }
    
    const data = await res.json();
    token = data.access_token;
    localStorage.setItem('token', token);

    // Buscar usuário
  const userRes = await fetch(buildUrl('/auth/me'), {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (userRes.ok) {
      currentUser = await userRes.json();
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    
    return true;
  } catch (err) {
    throw new Error('Usuário ou senha incorretos');
  }
}

// Função SIMPLES para carregar dados DO BANCO
async function carregarTudo() {
  try {
    console.log('=== CARREGANDO DADOS DO BANCO ===');
    console.log('API_URL:', API_URL);
    console.log('buildUrl("/turmas"):', buildUrl('/turmas'));
    console.log('buildUrl("/alunos"):', buildUrl('/alunos'));
    
    let carregouDaAPI = false;
    
    // Tentar carregar do banco sem token (se o backend permitir)
    try {
      // Carregar turmas do banco
      console.log('Fazendo fetch para turmas...');
    const turmasRes = await fetch(buildUrl('/turmas'));
      console.log('Response turmas status:', turmasRes.status);
      
      if (turmasRes.ok) {
        const turmasAPI = await turmasRes.json();
        console.log('Turmas API response:', turmasAPI);
        classes = Array.isArray(turmasAPI) ? turmasAPI.map(t => ({
          id: t.id,
          name: t.nome,
          capacity: t.capacidade,
          occupied: 0
        })) : [];
        console.log('Turmas carregadas do banco:', classes.length, classes);
        
        // Carregar alunos do banco
        console.log('Fazendo fetch para alunos...');
  const alunosRes = await fetch(buildUrl('/alunos'));
        console.log('Response alunos status:', alunosRes.status);
        
        if (alunosRes.ok) {
          const alunosAPI = await alunosRes.json();
          console.log('Alunos API response:', alunosAPI);
          students = Array.isArray(alunosAPI) ? alunosAPI.map(a => ({
            id: a.id,
            name: a.nome,
            birthDate: a.data_nascimento,
            email: a.email || '',
            status: a.status,
            classId: a.turma_id
          })) : [];
          console.log('Alunos carregados do banco:', students.length, students);
          carregouDaAPI = true;
        } else {
          console.log('Erro na resposta de alunos:', await alunosRes.text());
        }
      } else {
        console.log('Erro na resposta de turmas:', await turmasRes.text());
      }
    } catch (err) {
      console.error('Erro ao carregar do banco:', err);
      // Se falhar, deixar vazio (não carregar dados de exemplo)
      classes = [];
      students = [];
      showFeedback('Erro ao conectar com o banco. Verifique se o backend está rodando.', 'error');
      maybeShowApiBanner();
    }
    
    // Atualizar interface com dados do banco (ou vazio se falhou)
    console.log('Atualizando interface...');
    recomputeClassOccupancy();
    populateClassSelect();
    updateClassOccupancy();
    renderStudents(students);
    updateStatistics();
    
    console.log('=== INTERFACE ATUALIZADA ===');
    if (carregouDaAPI) {
      showFeedback(`${students.length} alunos carregados do banco de dados`, 'success');
      console.log('Dados carregados com sucesso! Estudantes:', students);
      console.log('Turmas:', classes);
      
      // Verificar se a tabela foi renderizada
      setTimeout(() => {
        const tbody = document.getElementById('studentsList');
        if (tbody && tbody.children.length === 0 && students.length > 0) {
          console.warn('Dados carregados mas tabela vazia. Tentando renderizar novamente...');
          renderStudents(students);
        }
      }, 500);
    }
    
  } catch (err) {
    console.error('Erro geral:', err);
    // Em caso de erro, deixar vazio
    classes = [];
    students = [];
    renderStudents(students);
    updateStatistics();
    showFeedback('Erro ao carregar dados. Verifique se o backend está rodando.', 'error');
    // Tenta autodetectar backend local (127.0.0.1:8005 / localhost:8005) e recarrega UMA vez
    try {
      const detected = await autoDetectApiBase();
      if (detected) {
        console.log('Backend detectado após falha inicial. Recarregando dados...');
        await carregarTudo();
        return;
      }
    } catch (e) {
      console.warn('Falha ao autodetectar backend após erro:', e);
    }
    maybeShowApiBanner();
  }
}

function maybeShowApiBanner() {
  try {
    const banner = document.getElementById('apiConfigBanner');
    const input = document.getElementById('apiBaseInput');
    const save = document.getElementById('apiSaveBtn');
    const close = document.getElementById('apiCloseBtn');
    if (!banner || !input || !save || !close) return;

    // Mostra sempre o banner quando houve erro para permitir configurar a API
    banner.style.display = 'flex';
    input.value = (localStorage.getItem('API_URL') || 'http://127.0.0.1:8005');
    save.onclick = () => {
      const url = input.value.trim();
      window.setApiBase(url);
    };
    close.onclick = () => {
      banner.style.display = 'none';
    };
  } catch (e) {
    console.warn('Falha ao exibir banner da API:', e);
  }
}

// Tenta detectar automaticamente a API quando aberto via file:// ou quando a base não está definida
async function autoDetectApiBase() {
  try {
    // Se está no Live Server ou file://, sempre tentar detectar o backend
    const isLiveServer = typeof window !== 'undefined' && window.location && window.location.port === '5500';
    const isFileProtocol = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
    const needsDetection = isLiveServer || isFileProtocol || !localStorage.getItem('API_URL');
    
    console.log('AutoDetect - isLiveServer:', isLiveServer, 'isFileProtocol:', isFileProtocol, 'needsDetection:', needsDetection);
    
    if (!needsDetection) return false;

    console.log('Tentando detectar backend automaticamente...');
    const candidates = [
      'http://127.0.0.1:8005',
      'http://localhost:8005',
    ];

    for (const base of candidates) {
      console.log(`Testando: ${base}`);
      const ok = await probeHealth(base);
      if (ok) {
        localStorage.setItem('API_URL', base);
        console.log('✅ Backend detectado automaticamente:', base);
        showFeedback('Backend conectado com sucesso!', 'success');
        // Apenas recarregar os dados, SEM recarregar a página
        await carregarTudo();
        return true;
      }
    }
    console.log('❌ Nenhum backend encontrado');
    showFeedback('Não foi possível conectar ao backend. Verifique se está rodando na porta 8005.', 'error');
  } catch (e) {
    console.warn('Falha na autodetecção da API:', e);
  }
  return false;
}

async function probeHealth(base) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${base}/health`, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(id);
    return res.ok;
  } catch (_e) {
    return false;
  }
}

function showLogin() {
  const loginModal = document.getElementById('loginModal');
  if (loginModal) {
    loginModal.style.display = 'flex';
  }
  
  // Limpar erros anteriores
  const errorDiv = document.getElementById('loginError');
  if (errorDiv) errorDiv.textContent = '';
}

function hideLogin() {
  const loginModal = document.getElementById('loginModal');
  if (loginModal) {
    loginModal.style.display = 'none';
  }
}

// Util: chamadas HTTP
async function fetchJSON(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(buildUrl(path), { headers, ...options });
  
  const isJSON = res.headers.get('content-type')?.includes('application/json');
  const data = isJSON ? await res.json() : null;
  
  if (!res.ok) {
    if (res.status === 401) {
      // Token inválido, fazer logout
      logout();
      throw new Error('Sessão expirada');
    }
    const msg = data?.detail || data?.message || `Erro ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// Nova função para chamadas sem autenticação
async function fetchWithoutAuth(path, options = {}) {
  try {
    const res = await fetch(buildUrl(path), {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });

    console.log(`[fetchWithoutAuth] ${options.method || 'GET'} ${buildUrl(path)} - Status: ${res.status}`);

    let data = null;
    let responseText = '';

    try {
      responseText = await res.text();
      console.log(`[fetchWithoutAuth] Response text: ${responseText}`);

      if (responseText) {
        const isJSON = res.headers.get('content-type')?.includes('application/json');
        if (isJSON) {
          data = JSON.parse(responseText);
          console.log(`[fetchWithoutAuth] Parsed JSON:`, data);
        }
      }
    } catch (parseError) {
      console.error(`[fetchWithoutAuth] Error parsing response:`, parseError);
    }

    if (!res.ok) {
      let errorMessage = `Erro ${res.status}`;

      // FastAPI 422: data.detail costuma ser um array [{loc, msg, type}]
      const extractFastApiDetails = (detail) => {
        try {
          if (Array.isArray(detail)) {
            const parts = detail.map(d => {
              const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : d.loc;
              const msg = d.msg || d.message || JSON.stringify(d);
              // Tradução simples para campos comuns
              const fieldName =
                field === 'email' ? 'Email' :
                field === 'data_nascimento' ? 'Data de nascimento' :
                field === 'turma_id' ? 'Turma' : field;
              return fieldName ? `${fieldName}: ${msg}` : msg;
            });
            return parts.join('; ');
          }
          if (typeof detail === 'string') return detail;
          return JSON.stringify(detail);
        } catch { return 'Erro de validação'; }
      };

      if (data) {
        if (data.detail !== undefined) {
          errorMessage = extractFastApiDetails(data.detail);
        } else if (data.message) {
          errorMessage = data.message;
        } else if (Array.isArray(data)) {
          errorMessage = data.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(', ');
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else {
          errorMessage = `Erro ${res.status}: ${JSON.stringify(data)}`;
        }
      } else if (responseText) {
        errorMessage = `Erro ${res.status}: ${responseText}`;
      } else {
        errorMessage = `Erro ${res.status}: ${res.statusText}`;
      }

      // Evitar [object Object]
      if (!errorMessage || errorMessage === '[object Object]') {
        errorMessage = `Erro ${res.status}`;
      }

      console.error(`[fetchWithoutAuth] Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error(`[fetchWithoutAuth] Network/other error:`, error);

    if (error instanceof Error && error.message && error.message !== '[object Object]') {
      throw error;
    }

    const message = error.message || error.toString() || 'Erro de conexão com o servidor';
    throw new Error(message);
  }
}

// Mapeamentos front <-> back
function mapAlunoOutToFront(a) {
  return {
    id: a.id,
    name: a.nome,
    birthDate: a.data_nascimento, // YYYY-MM-DD
    email: a.email || null,
    status: a.status,
    classId: a.turma_id || null,
  };
}

function mapAlunoFormToBack(form) {
  return {
    nome: form.name,
    data_nascimento: form.birthDate,
    email: form.email || null,
    status: form.status,
    turma_id: form.classId || null,
  };
}

function transformClassName(nome) {
  if (nome.includes('º Ano')) return nome;
  const m = nome.match(/^(\d)([A-Za-z])$/);
  if (m) return `${m[1]}º Ano ${m[2].toUpperCase()}`;
  return nome;
}

function mapTurmaOutToFront(t) {
  return {
    id: t.id,
    name: transformClassName(t.nome),
    capacity: t.capacidade,
    occupied: 0,
  };
}

function recomputeClassOccupancy() {
  classes.forEach(c => (c.occupied = 0));
  students.forEach(s => {
    if (s.classId) {
      const cls = classes.find(c => c.id === s.classId);
      if (cls) cls.occupied++;
    }
  });
}

// API helpers
async function getTurmas() {
  try {
    const data = await fetchJSON('/turmas');
    classes = data.map(mapTurmaOutToFront);
  } catch (err) {
    console.log('Erro ao carregar turmas da API:', err.message);
    // Não quebra, será tratado no carregarDadosCompletos
  }
}

async function getAlunos(params = {}) {
  try {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.turma_id) q.set('turma_id', params.turma_id);
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    const data = await fetchJSON(`/alunos${qs ? `?${qs}` : ''}`);
    students = data.map(mapAlunoOutToFront);
  } catch (err) {
    console.log('Erro ao carregar alunos da API:', err.message);
    // Não quebra, será tratado no carregarDadosCompletos
  }
}

async function createAlunoApi(form) {
  const payload = mapAlunoFormToBack(form);
  const data = await fetchWithoutAuth('/alunos', { method: 'POST', body: JSON.stringify(payload) });
  return mapAlunoOutToFront(data);
}

async function updateAlunoApi(id, form) {
  const payload = mapAlunoFormToBack(form);
  const data = await fetchWithoutAuth(`/alunos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  return mapAlunoOutToFront(data);
}

async function deleteAlunoApi(id) {
  await fetchWithoutAuth(`/alunos/${id}`, { method: 'DELETE' });
}

async function postMatriculaApi(alunoId, turmaId) {
  return await fetchJSON('/matriculas', {
    method: 'POST',
    body: JSON.stringify({ aluno_id: alunoId, turma_id: turmaId })
  });
}

async function loadInitialData() {
  console.log('=== INICIANDO APLICAÇÃO ===');
  console.log('API_URL configurada:', API_URL);
  
  // Carregar dados normalmente primeiro (comportamento original)
  await carregarTudo();
  
  // Se tem token válido, aplicar restrições de usuário
  if (token) {
    try {
      const me = await fetchJSON('/auth/me');
      currentUser = me;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateUserInfo();
      applyRoleRestrictions();
      await carregarDadosComBaseNoUsuario();
    } catch (err) {
      console.log('Token inválido, limpando sessão');
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      token = null;
      currentUser = null;
      updateUserInfo();
    }
  } else {
    updateUserInfo();
  }
}

// Nova função para carregar dados baseado no tipo de usuário
async function carregarDadosComBaseNoUsuario() {
  try {
    console.log('=== CARREGANDO DADOS BASEADO NO USUÁRIO ===');
    console.log('Usuário atual:', currentUser);
    
    // Carregar turmas (sempre necessário)
  const turmasRes = await fetch(buildUrl('/turmas'));
    if (turmasRes.ok) {
      const turmasAPI = await turmasRes.json();
      classes = Array.isArray(turmasAPI) ? turmasAPI.map(t => ({
        id: t.id,
        name: t.nome,
        capacity: t.capacidade,
        occupied: 0
      })) : [];
      console.log('Turmas carregadas:', classes.length);
    }
    
    // Carregar alunos baseado no papel do usuário
  let alunosUrl = buildUrl('/alunos');
    
    // Se for aluno, carregar apenas da sua turma
    if (currentUser?.role === 'aluno' && currentUser?.turma_id) {
      alunosUrl += `?turma_id=${currentUser.turma_id}`;
      console.log('Carregando apenas alunos da turma:', currentUser.turma_id);
    } else {
      console.log('Carregando todos os alunos (professor)');
    }
    
  const alunosRes = await fetch(alunosUrl);
    if (alunosRes.ok) {
      const alunosAPI = await alunosRes.json();
      students = Array.isArray(alunosAPI) ? alunosAPI.map(a => ({
        id: a.id,
        name: a.nome,
        birthDate: a.data_nascimento,
        email: a.email || '',
        status: a.status,
        classId: a.turma_id
      })) : [];
      console.log('Alunos carregados:', students.length);
    }
    
    // Atualizar interface
    recomputeClassOccupancy();
    populateClassSelect();
    updateClassOccupancy();
    renderStudents(students);
    updateStatistics();
    
    showFeedback(`Bem-vindo(a), ${currentUser.username}! ${students.length} alunos carregados.`, 'success');
    
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
    showFeedback('Erro ao carregar dados. Verifique se o backend está rodando.', 'error');
  }
}

// Função para carregar dados locais como fallback
function carregarDadosLocais() {
  // NÃO carregar dados de exemplo - deixar vazio para mostrar apenas dados do banco
  classes = [];
  students = [];
  
  // Atualizar interface mesmo que vazia
  recomputeClassOccupancy();
  populateClassSelect();
  updateClassOccupancy();
  renderStudents(students);
  updateStatistics();
  hideLogin();
  
  showFeedback('Nenhum dado encontrado. Verifique se o backend está rodando.', 'error');
}

// Gerenciamento do tema
let isDarkMode = localStorage.getItem('darkMode') === 'true';

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  localStorage.setItem('darkMode', isDarkMode);
}

// Inicializa o modo escuro se estiver configurado anteriormente
if (isDarkMode) {
  document.documentElement.setAttribute('data-theme', 'dark');
}

// Gerenciamento da Roda de Cores
let currentColor = '#F1F5F9'; // Cor padrão do fundo
let currentBrightness = 100; // Brilho atual
let colorWheelContext; // Contexto do canvas
let isDragging = false; // Controle de arraste
let colorIndicator; // Indicador de cor
let wheelRadius; // Raio da roda de cores
let canvas; // Elemento do canvas
let rect; // Dimensões do canvas
let centerX; // Centro X do círculo
let centerY; // Centro Y do círculo

function initColorWheel() {
  canvas = document.getElementById('colorWheel');
  if (!canvas) {
    console.warn('Canvas colorWheel não encontrado');
    return;
  }

  try {
    colorWheelContext = canvas.getContext('2d');
    if (!colorWheelContext) {
      console.warn('Não foi possível obter contexto 2D do canvas');
      return;
    }

    rect = canvas.getBoundingClientRect();
    const width = canvas.width;
    const height = canvas.height;
    centerX = width / 2;
    centerY = height / 2;
    wheelRadius = Math.min(width, height) / 2 - 5;

    // Inicializa o indicador de cor
    colorIndicator = document.querySelector('.color-picker-indicator');
    if (!colorIndicator) {
      console.warn('Indicador de cor não encontrado');
      return;
    }

    // Posiciona o indicador no centro inicialmente (relativo ao canvas/wrapper)
    colorIndicator.style.left = centerX + 'px';
    colorIndicator.style.top = centerY + 'px';
    colorIndicator.style.display = 'block';
    colorIndicator.style.backgroundColor = currentColor;

    // Desenha o círculo de cores
    drawColorWheel();

    // Usa Pointer Events para arraste mais fluido (suporta mouse, touch e caneta)
    canvas.addEventListener('pointerdown', startColorSelection);
    canvas.addEventListener('pointermove', updateColorSelection);
    canvas.addEventListener('pointerup', stopColorSelection);
    canvas.addEventListener('pointercancel', stopColorSelection);
    canvas.addEventListener('click', updateColorFromPosition);

    // Event Listener para o controle de brilho
    const brightnessControl = document.getElementById('brightness');
    if (brightnessControl) {
      brightnessControl.addEventListener('input', updateBrightness);
    }

    // Event Listener para aplicar cor de fundo
    const applyButton = document.getElementById('applyBackground');
    if (applyButton) {
      applyButton.addEventListener('click', applyBackgroundColor);
    }

    // Carregar cor salva
    const savedColor = localStorage.getItem('backgroundColor');
    if (savedColor) {
      currentColor = savedColor;
      updateColorPreviewUI(currentColor);
      document.body.style.backgroundColor = currentColor;
    }
  } catch (error) {
    console.error('Erro ao inicializar roda de cores:', error);
  }
}

function drawColorWheel() {
  // Desenha um seletor horizontal: matiz no eixo X, saturação no eixo Y
  if (!canvas || !colorWheelContext) return;

  try {
    const width = canvas.width;
    const height = canvas.height;

    // Itera por pixels (x horizontal -> hue, y vertical -> saturation)
    for (let x = 0; x < width; x++) {
      const hue = (x / (width - 1)) * 360;
      for (let y = 0; y < height; y++) {
        const saturation = 100 - (y / (height - 1)) * 100; // topo = 100%, base = 0%
        const rgb = hslToRgb(hue, saturation, 50);
        colorWheelContext.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        colorWheelContext.fillRect(x, y, 1, 1);
      }
    }

    // Borda simples ao redor do canvas
    colorWheelContext.strokeStyle = '#ccc';
    colorWheelContext.lineWidth = 1;
    colorWheelContext.strokeRect(0, 0, width, height);
  } catch (error) {
    console.error('Erro ao desenhar roda de cores:', error);
  }
}

function startColorSelection(e) {
  try {
    e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
  } catch (err) {}
  isDragging = true;
  updateColorFromPosition(e);
}

function updateColorSelection(e) {
  if (isDragging) {
    updateColorFromPosition(e);
  }
}

function stopColorSelection() {
  try {
  } catch (err) {}
  isDragging = false;
}

function updateColorFromPosition(e) {
  if (!canvas || !colorIndicator) return;
  const rect = canvas.getBoundingClientRect();

  // Obtém a posição real do mouse em relação ao canvas
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Clamp dentro do canvas
  const x = Math.max(0, Math.min(mouseX, canvas.width - 1));
  const y = Math.max(0, Math.min(mouseY, canvas.height - 1));

  e.preventDefault();

  // Mapear X -> Hue (0-360), Y -> Saturation (top 100 -> bottom 0)
  const hue = (x / (canvas.width - 1)) * 360;
  const saturation = 100 - (y / (canvas.height - 1)) * 100;
  const color = hslToRgb(hue, saturation, 50);
  currentColor = `rgb(${color.r}, ${color.g}, ${color.b})`;

  // Atualiza preview e indicador
  updateColorPreviewUI(currentColor);
  colorIndicator.style.backgroundColor = currentColor;

  // Posiciona o indicador relativo ao canvas
  colorIndicator.style.left = x + 'px';
  colorIndicator.style.top = y + 'px';
}

// Função auxiliar para converter HSL para RGB
function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

function updateColorPreviewUI(color) {
  const preview = document.getElementById('colorPreview');
  const input = document.getElementById('colorValue');
  if (preview) preview.style.backgroundColor = color;
  if (input) input.value = color;
}

function updateIndicatorPosition(mouseX, mouseY) {
  if (!canvas || !colorIndicator) return;
  if (!rect) rect = canvas.getBoundingClientRect();

  const relX = Math.max(0, Math.min(mouseX - rect.left, canvas.width - 1));
  const relY = Math.max(0, Math.min(mouseY - rect.top, canvas.height - 1));
  colorIndicator.style.left = relX + 'px';
  colorIndicator.style.top = relY + 'px';
}

function updateBrightness(e) {
  currentBrightness = e.target.value;
  const brightness = currentBrightness / 100;
  const preview = document.getElementById('colorPreview');
  if (preview) {
    preview.style.filter = `brightness(${brightness})`;
  }
}

function applyBackgroundColor() {
  if (!currentColor) {
    showFeedback('Por favor, selecione uma cor primeiro', 'error');
    return;
  }

  const brightness = currentBrightness / 100;
  const color = currentColor;

  let rgba;
  if (color.startsWith('rgb')) {
    const rgb = color.match(/\d+/g);
    if (rgb) {
      rgba = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${brightness})`;
    } else {
      rgba = color;
    }
  } else {
    rgba = color;
  }

  document.documentElement.style.setProperty('--color-background', rgba);
  localStorage.setItem('backgroundColor', rgba);
  try {
    document.body.style.backgroundColor = rgba;
  } catch (err) {}
  showFeedback('Cor de fundo atualizada com sucesso!');
}

// Paletas de cores disponíveis
const colorPalettes = {
  primary: [
    { name: 'Azul', base: '#2563EB', light: '#60A5FA', dark: '#1E40AF' },
    { name: 'Roxo', base: '#7C3AED', light: '#A78BFA', dark: '#5B21B6' },
    { name: 'Rosa', base: '#EC4899', light: '#F472B6', dark: '#BE185D' },
    { name: 'Vermelho', base: '#DC2626', light: '#F87171', dark: '#991B1B' },
    { name: 'Verde', base: '#059669', light: '#34D399', dark: '#047857' }
  ],
  secondary: [
    { name: 'Verde', base: '#10B981', light: '#34D399', dark: '#059669' },
    { name: 'Azul', base: '#0EA5E9', light: '#38BDF8', dark: '#0369A1' },
    { name: 'Amarelo', base: '#FBBF24', light: '#FCD34D', dark: '#D97706' },
    { name: 'Roxo', base: '#8B5CF6', light: '#A78BFA', dark: '#6D28D9' },
    { name: 'Rosa', base: '#F472B6', light: '#F9A8D4', dark: '#BE185D' }
  ],
  accent: [
    { name: 'Laranja', base: '#F97316', light: '#FB923C', dark: '#EA580C' },
    { name: 'Verde', base: '#22C55E', light: '#4ADE80', dark: '#15803D' },
    { name: 'Vermelho', base: '#EF4444', light: '#F87171', dark: '#DC2626' },
    { name: 'Amarelo', base: '#EAB308', light: '#FDE047', dark: '#CA8A04' },
    { name: 'Rosa', base: '#EC4899', light: '#F472B6', dark: '#BE185D' }
  ]
};

// Inicializa a aplicação
function init() {
  console.log('🚀 Iniciando aplicação...');
  
  try {
    setupEventListeners();
    loadSavedTheme();
    initColorWheel();
    
    // Verificar se está no Live Server e precisa de autodetecção
    const isLiveServer = typeof window !== 'undefined' && window.location && window.location.port === '5500';
    const isFileProtocol = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
    
    if (isLiveServer || isFileProtocol) {
      console.log('🔍 Ambiente Live Server/File detectado - configurando conexão...');
      // Para Live Server, apenas configurar a URL e carregar uma vez
      if (!localStorage.getItem('API_URL')) {
        localStorage.setItem('API_URL', 'http://127.0.0.1:8005');
      }
    }
    
    // Carrega dados automaticamente ao iniciar - UMA VEZ SÓ
    console.log('📊 Carregando dados iniciais...');
    loadInitialData().then(() => {
      console.log('✅ Dados iniciais carregados com sucesso');
    }).catch(err => {
      console.error('❌ Erro ao carregar dados iniciais:', err);
      showFeedback('Erro ao conectar com o backend. Verifique se está rodando na porta 8005.', 'error');
    });
    
  } catch (error) {
    console.error('Erro na inicialização:', error);
  }
}

// Update class occupancy in all select elements
function updateClassOccupancy() {
  const classSelects = document.querySelectorAll('select');
  classSelects.forEach(select => {
    select.querySelectorAll('option[value]').forEach(option => {
      const classId = parseInt(option.value);
      if (classId) {
        const cls = classes.find(c => c.id === classId);
        if (cls) {
          option.textContent = `${cls.name} (${cls.occupied}/${cls.capacity})`;
        }
      }
    });
  });
}

// Populate class select dropdowns with grouped options
defaultOptionText = 'Selecione uma turma';
function populateClassSelect() {
  const classFilter = document.getElementById('classFilter');
  const classIdSelect = document.getElementById('classId');
  const classSelects = [classFilter, classIdSelect].filter(Boolean);
  
  const getGradeLabel = (name) => {
    const match = name.match(/^(\d+)/);
    const n = match ? match[1] : null;
    return n ? `${n}º Ano` : 'Turmas';
  };

  classSelects.forEach(select => {
    if (!select) return;
    const defaultOption = select.querySelector('option[value=""]') || (() => {
      const o = document.createElement('option');
      o.value = '';
      o.textContent = select === classFilter ? 'Todas as turmas' : defaultOptionText;
      return o;
    })();

    select.innerHTML = '';
    if (defaultOption) select.appendChild(defaultOption);

    const groups = new Map();
    classes.forEach(cls => {
      const grade = getGradeLabel(cls.name);
      if (!groups.has(grade)) groups.set(grade, []);
      groups.get(grade).push(cls);
    });

    for (const [grade, list] of groups.entries()) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = grade;
      list.sort((a, b) => a.name.localeCompare(b.name));
      list.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.id;
        option.textContent = `${cls.name} (${cls.occupied}/${cls.capacity})`;
        option.dataset.occupied = cls.occupied;
        option.dataset.capacity = cls.capacity;
        optgroup.appendChild(option);
      });
      select.appendChild(optgroup);
    }
  });
}

// Configura os eventos da aplicação
function setupEventListeners() {
  // Setup do formulário de login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;
      const errorDiv = document.getElementById('loginError');
      
      errorDiv.textContent = '';

      if (!username || !password) {
        errorDiv.textContent = 'Informe usuário e senha';
        return;
      }

      try {
        await doLogin(username, password);
        document.getElementById('loginForm').reset();
        hideLogin();
        updateUserInfo();
        applyRoleRestrictions();
  await carregarDadosComBaseNoUsuario();
  showFeedback('Login realizado com sucesso!');
      } catch (err) {
        errorDiv.textContent = err.message;
      }
    });
  }

  // Eventos de filtro
  const searchInput = document.getElementById('searchStudent');
  const classFilter = document.getElementById('classFilter');
  const statusFilter = document.getElementById('statusFilter');
  const ageFilter = document.getElementById('ageFilter');
  
  if (searchInput) searchInput.addEventListener('input', filterStudents);
  if (classFilter) classFilter.addEventListener('change', filterStudents);
  if (statusFilter) statusFilter.addEventListener('change', filterStudents);
  if (ageFilter) ageFilter.addEventListener('change', filterStudents);

  // Eventos de cadastro e manipulação
  const newStudentBtn = document.getElementById('newStudentBtn');
  const studentForm = document.getElementById('studentForm');
  const exportBtn = document.getElementById('exportBtn');
  
  if (newStudentBtn) newStudentBtn.addEventListener('click', () => openModal('newStudentModal'));
  if (studentForm) studentForm.addEventListener('submit', handleStudentSubmit);
  if (exportBtn) exportBtn.addEventListener('click', exportData);

  // Evento de transferência
  const transferForm = document.getElementById('transferForm');
  if (transferForm) {
    transferForm.addEventListener('submit', handleTransferSubmit);
  }

  // Eventos de tema
  const themeButton = document.getElementById('themeButton');
  const darkModeButton = document.getElementById('darkModeButton');
  
  if (themeButton) {
    themeButton.addEventListener('click', () => {
      setupColorPicker();
      openModal('colorPickerModal');
    });
  }
  if (darkModeButton) darkModeButton.addEventListener('click', toggleDarkMode);
}

// Setup color picker
function setupColorPicker() {
  const sections = ['primary', 'secondary', 'accent'];
  sections.forEach(section => {
    const container = document.getElementById(`${section}Colors`);
    container.innerHTML = '';

    colorPalettes[section].forEach((color, index) => {
      const colorOption = document.createElement('button');
      colorOption.className = 'color-option';
      colorOption.style.background = `linear-gradient(135deg, ${color.base}, ${color.dark})`;
      colorOption.setAttribute('data-color-set', JSON.stringify(color));
      colorOption.setAttribute('data-type', section);

      const currentColor = getComputedStyle(document.documentElement)
        .getPropertyValue(`--color-${section}`).trim();
      if (currentColor === color.base) {
        colorOption.classList.add('selected');
      }

      colorOption.addEventListener('click', (e) => selectColor(e.target));
      container.appendChild(colorOption);
    });
  });
}

// Handle color selection
function selectColor(element) {
  const type = element.getAttribute('data-type');
  const colorSet = JSON.parse(element.getAttribute('data-color-set'));

  document.querySelectorAll(`[data-type="${type}"]`).forEach(el => {
    el.classList.remove('selected');
  });

  element.classList.add('selected');

  updateColorPreview(type, colorSet);
}

// Update color preview
function updateColorPreview(type, colorSet) {
  document.documentElement.style.setProperty(`--color-${type}`, colorSet.base);
  document.documentElement.style.setProperty(`--color-${type}-light`, colorSet.light);
  document.documentElement.style.setProperty(`--color-${type}-dark`, colorSet.dark);
}

// Save color theme
function saveColorTheme() {
  const theme = {};
  ['primary', 'secondary', 'accent'].forEach(type => {
    const selected = document.querySelector(`[data-type="${type}"].selected`);
    if (selected) {
      const colorSet = JSON.parse(selected.getAttribute('data-color-set'));
      theme[type] = colorSet;
    }
  });

  localStorage.setItem('colorTheme', JSON.stringify(theme));

  closeModal('colorPickerModal');
  showFeedback('Tema salvo com sucesso!');
}

// Load saved color theme
function loadSavedTheme() {
  const savedTheme = localStorage.getItem('colorTheme');
  if (savedTheme) {
    const theme = JSON.parse(savedTheme);
    Object.entries(theme).forEach(([type, colorSet]) => {
      updateColorPreview(type, colorSet);
    });
  }
}

// Filter students based on search, class, status, and age
function filterStudents() {
  const searchInput = document.getElementById('searchStudent');
  const classFilter = document.getElementById('classFilter');
  const statusFilter = document.getElementById('statusFilter');
  const ageFilter = document.getElementById('ageFilter');
  
  if (!searchInput || !classFilter || !statusFilter || !ageFilter) return;
  
  const searchTerm = searchInput.value.toLowerCase();
  const classId = classFilter.value;
  const status = statusFilter.value;
  const ageRange = ageFilter.value;

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm);
    const matchesClass = !classId || student.classId === parseInt(classId);
    const matchesStatus = !status || student.status === status;

    // Filtro por faixa etária
    let matchesAge = true;
    if (ageRange) {
      const age = calculateAge(student.birthDate);
      switch (ageRange) {
        case '5-7':
          matchesAge = age >= 5 && age <= 7;
          break;
        case '8-10':
          matchesAge = age >= 8 && age <= 10;
          break;
        case '11-13':
          matchesAge = age >= 11 && age <= 13;
          break;
        case '14+':
          matchesAge = age >= 14;
          break;
      }
    }

    return matchesSearch && matchesClass && matchesStatus && matchesAge;
  });

  renderStudents(filteredStudents);
}

// Render students table
function renderStudents(studentsToRender) {
  console.log('=== RENDERIZANDO ESTUDANTES ===');
  console.log('Estudantes para renderizar:', studentsToRender);
  console.log('Quantidade:', studentsToRender.length);
  
  const studentsList = document.getElementById('studentsList');
  if (!studentsList) {
    console.error('Elemento studentsList não encontrado!');
    return;
  }
  
  console.log('Elemento studentsList encontrado:', studentsList);
  
  studentsList.innerHTML = '';
  studentsToRender.forEach((student, index) => {
    console.log(`Renderizando estudante ${index + 1}:`, student);
    const row = document.createElement('tr');
    const cls = classes.find(c => c.id === student.classId);

    row.innerHTML = `
            <td>${student.name}</td>
            <td>${calculateAge(student.birthDate)}</td>
            <td>${student.email || '-'}</td>
            <td>${cls ? cls.name : '-'}</td>
            <td>${student.status}</td>
            <td class="actions-cell"></td>
        `;
    const actionsCell = row.querySelector('.actions-cell');
    if (currentUser?.role === 'professor') {
      actionsCell.innerHTML = `
        <button onclick="editStudent(${student.id})" class="btn btn-secondary" aria-label="Editar ${student.name}" title="Editar aluno">✏️</button>
        <button onclick="transferStudent(${student.id})" class="btn btn-primary" aria-label="Transferir ${student.name}" title="Transferir para outra turma">↔️</button>
        <button onclick="deleteStudent(${student.id})" class="btn btn-accent" aria-label="Excluir ${student.name}" title="Excluir aluno">🗑️</button>
      `;
    } else {
      actionsCell.textContent = '-';
    }
    studentsList.appendChild(row);
  });
  
  console.log('Finalizada renderização de', studentsToRender.length, 'estudantes');
}

// Calculate age from birthdate
function calculateAge(birthDate) {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

let editingStudentId = null;

// Handle new student form submission
async function handleStudentSubmit(e) {
  e.preventDefault();
  console.log('=== SALVANDO ALUNO ===');

  const formData = {
    name: document.getElementById('studentName').value.trim(),
    birthDate: document.getElementById('birthDate').value,
    email: document.getElementById('email').value.trim(),
    status: document.getElementById('status').value,
    classId: parseInt(document.getElementById('classId').value) || null
  };

  console.log('Dados do formulário:', formData);

  // Validações básicas
  if (!formData.name) {
    showFeedback('Nome é obrigatório', 'error');
    return;
  }

  if (!formData.birthDate) {
    showFeedback('Data de nascimento é obrigatória', 'error');
    return;
  }

  // Validação simples de email no cliente (quando preenchido)
  if (formData.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (!emailRegex.test(formData.email)) {
      showFeedback('Email inválido. Ex: nome@dominio.com', 'error');
      return;
    }
  }

  // Validate age
  const age = calculateAge(formData.birthDate);
  if (age < 5) {
    showFeedback('O aluno deve ter pelo menos 5 anos de idade', 'error');
    return;
  }

  try {
    console.log('Tentando salvar aluno...');
    if (editingStudentId) {
      console.log('Atualizando aluno ID:', editingStudentId);
      await updateAlunoApi(editingStudentId, formData);
      showFeedback('Aluno atualizado com sucesso');
    } else {
      console.log('Criando novo aluno...');
      const result = await createAlunoApi(formData);
      console.log('Resultado da criação:', result);
      showFeedback('Aluno cadastrado com sucesso');
    }
    
    console.log('Recarregando dados...');
    // Recarregar dados do banco
    await carregarTudo();
    
  } catch (err) {
    console.error('Erro completo ao salvar aluno:', err);
    console.error('Tipo do erro:', typeof err);
    console.error('Propriedades do erro:', Object.keys(err || {}));
    
    // Tratamento robusto de diferentes tipos de erro
    let errorMessage = 'Erro desconhecido ao salvar aluno';
    
    if (err instanceof Error) {
      // É um objeto Error JavaScript
      errorMessage = err.message;
      if (errorMessage === '[object Object]' || !errorMessage) {
        errorMessage = 'Erro no servidor (verifique console para detalhes)';
      }
    } else if (typeof err === 'string') {
      errorMessage = err;
    } else if (err && typeof err === 'object') {
      // É um objeto, tentar extrair informação útil
      if (err.detail) {
        errorMessage = err.detail;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.error) {
        errorMessage = err.error;
      } else if (err.errors && Array.isArray(err.errors)) {
        errorMessage = err.errors.map(e => e.msg || e.message || e).join(', ');
      } else {
        // Último recurso: tentar JSON.stringify
        try {
          const jsonStr = JSON.stringify(err);
          errorMessage = jsonStr !== '{}' ? jsonStr : 'Erro no servidor';
        } catch {
          errorMessage = 'Erro ao processar resposta do servidor';
        }
      }
    }
    
    // Garantir que nunca seja vazio ou [object Object]
    if (!errorMessage || errorMessage === '[object Object]' || errorMessage === '{}') {
      errorMessage = 'Erro interno do servidor (verifique se o backend está rodando)';
    }
    
    console.error('Mensagem de erro final:', errorMessage);
    showFeedback(`Erro ao salvar: ${errorMessage}`, 'error');
    return;
  }

  closeModal('newStudentModal');
  document.getElementById('studentForm').reset();
  editingStudentId = null;
  console.log('=== ALUNO SALVO COM SUCESSO ===');
}

// Update statistics
function updateStatistics() {
  document.getElementById('totalStudents').textContent = students.length;
  document.getElementById('activeStudents').textContent =
    students.filter(s => s.status === 'ativo').length;
  document.getElementById('totalClasses').textContent = classes.length;
  document.getElementById('transfersToday').textContent = transfersToday;
}

// Export data
function exportData() {
  const data = {
    students,
    classes
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'escola-dados.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showFeedback('Dados exportados com sucesso');
}

// Modal functions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  const firstInput = modal.querySelector('input');
  if (firstInput) firstInput.focus();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');

  if (modalId === 'newStudentModal') {
    editingStudentId = null;
  const form = document.getElementById('studentForm');
  if (form) form.reset();
  } else if (modalId === 'transferStudentModal') {
    transferringStudentId = null;
    document.getElementById('transferForm').reset();
  }
}

// Transfer student function
let transferringStudentId = null;

function transferStudent(id) {
  const student = students.find(s => s.id === id);
  if (!student) {
    showFeedback('Aluno não encontrado', 'error');
    return;
  }

  transferringStudentId = id;

  document.getElementById('transferStudentName').textContent = student.name;

  const currentClass = classes.find(c => c.id === student.classId);
  document.getElementById('currentClass').textContent = currentClass ? currentClass.name : 'Sem turma';

  populateNewClassSelect(student.classId);

  document.getElementById('transferReason').value = '';

  openModal('transferStudentModal');
}

function populateNewClassSelect(currentClassId) {
  const newClassSelect = document.getElementById('newClassId');
  newClassSelect.innerHTML = '<option value="">Selecione a nova turma</option>';

  const groups = new Map();
  classes.forEach(cls => {
    const match = cls.name.match(/^(\d+)/);
    const grade = match ? `${match[1]}º Ano` : 'Turmas';
    if (!groups.has(grade)) groups.set(grade, []);
    if (cls.id !== currentClassId) groups.get(grade).push(cls);
  });

  for (const [grade, list] of groups.entries()) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = grade;
    list.sort((a, b) => a.name.localeCompare(b.name));
    list.forEach(cls => {
      const option = document.createElement('option');
      option.value = cls.id;
      option.textContent = `${cls.name} (${cls.occupied}/${cls.capacity})`;
      if (cls.occupied >= cls.capacity) {
        option.disabled = true;
        option.textContent += ' - LOTADA';
      }
      optgroup.appendChild(option);
    });
    newClassSelect.appendChild(optgroup);
  }
}

async function handleTransferSubmit(e) {
  e.preventDefault();

  if (!transferringStudentId) {
    showFeedback('Erro: Nenhum aluno selecionado para transferência', 'error');
    return;
  }

  const newClassId = parseInt(document.getElementById('newClassId').value);
  const reason = document.getElementById('transferReason').value;

  if (!newClassId) {
    showFeedback('Por favor, selecione uma nova turma', 'error');
    return;
  }

  const student = students.find(s => s.id === transferringStudentId);
  const newClass = classes.find(c => c.id === newClassId);

  if (!student || !newClass) {
    showFeedback('Aluno ou turma não encontrados', 'error');
    return;
  }

  try {
    await postMatriculaApi(student.id, newClassId);
    transfersToday++;
    
    // Recarregar dados do banco
    await carregarTudo();
    
    closeModal('transferStudentModal');
    transferringStudentId = null;
    showFeedback(`${student.name} transferido(a) com sucesso para ${newClass.name}!`);
    if (reason) console.log(`Motivo da transferência: ${reason}`);
  } catch (err) {
    showFeedback(`Erro na matrícula: ${err.message}`, 'error');
  }
}

// Edit student function
function editStudent(id) {
  const student = students.find(s => s.id === id);
  if (!student) {
    showFeedback('Aluno não encontrado', 'error');
    return;
  }

  editingStudentId = id;

  document.getElementById('studentName').value = student.name;
  document.getElementById('birthDate').value = student.birthDate;
  document.getElementById('email').value = student.email || '';
  document.getElementById('status').value = student.status;
  document.getElementById('classId').value = student.classId || '';

  openModal('newStudentModal');
}

// Delete student function
async function deleteStudent(id) {
  if (!confirm('Tem certeza que deseja excluir este aluno?')) {
    return;
  }

  const student = students.find(s => s.id === id);
  if (!student) {
    showFeedback('Aluno não encontrado', 'error');
    return;
  }

  try {
    await deleteAlunoApi(id);
    await carregarTudo(); // Recarregar do banco
    showFeedback('Aluno excluído com sucesso');
  } catch (err) {
    showFeedback(`Erro ao excluir: ${err.message}`, 'error');
  }
}

// Feedback functions
function showFeedback(message, type = 'success') {
  const feedback = document.getElementById('feedback');
  if (!feedback) return;
  
  // Garantir que a mensagem seja sempre uma string válida
  let displayMessage = '';
  
  if (typeof message === 'string') {
    displayMessage = message;
  } else if (message?.toString && typeof message.toString === 'function') {
    displayMessage = message.toString();
  } else {
    try {
      displayMessage = JSON.stringify(message);
    } catch {
      displayMessage = 'Mensagem inválida';
    }
  }
  
  // Evitar mostrar [object Object]
  if (displayMessage === '[object Object]') {
    displayMessage = 'Erro na operação (detalhes no console)';
  }
  
  feedback.textContent = displayMessage;
  feedback.className = `feedback active ${type}`;
  feedback.setAttribute('role', 'alert');
  if (window.__feedbackTimeoutId) {
    clearTimeout(window.__feedbackTimeoutId);
  }

  window.__feedbackTimeoutId = setTimeout(() => {
    feedback.classList.remove('active');
    feedback.textContent = '';
    feedback.removeAttribute('role');
    window.__feedbackTimeoutId = null;
  }, 1500);
}

// Ajusta a UI conforme o papel do usuário
function applyRoleRestrictions() {
  if (currentUser?.role === 'aluno') {
    // Esconde criação de aluno
    const newStudentBtn = document.getElementById('newStudentBtn');
    if (newStudentBtn) newStudentBtn.style.display = 'none';
    // Filtro de turma travado
    const classFilter = document.getElementById('classFilter');
    if (classFilter) {
      classFilter.disabled = true;
      // Se tiver turma, já estará filtrado pelos dados carregados
    }
  }
}

// Atualiza informações do usuário no header
function updateUserInfo() {
  const userInfo = document.getElementById('userInfo');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginBtn = document.getElementById('loginBtn');
  
  if (currentUser) {
    const roleText = currentUser.role === 'professor' ? 'Professor' : 'Aluno';
    if (userInfo) userInfo.textContent = `Logado como: ${roleText} (${currentUser.username})`;
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    if (loginBtn) loginBtn.style.display = 'none';
  } else {
    if (userInfo) userInfo.textContent = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'inline-block';
  }
}

// Logout utilitário
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  token = null;
  currentUser = null;
  
  // Resetar interface para mostrar todos os dados novamente
  updateUserInfo();
  
  // Remover restrições de aluno se houver
  const newStudentBtn = document.getElementById('newStudentBtn');
  if (newStudentBtn) newStudentBtn.style.display = 'inline-block';
  
  const classFilter = document.getElementById('classFilter');
  if (classFilter) classFilter.disabled = false;
  
  // Recarregar dados completos
  carregarTudo();
  
  showFeedback('Logout realizado com sucesso');
}

// Trocar usuário
function trocarUsuario() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  token = null;
  currentUser = null;
  students = [];
  classes = [];
  
  // Limpar interface
  const studentsList = document.getElementById('studentsList');
  if (studentsList) studentsList.innerHTML = '';
  
  const userInfo = document.getElementById('userInfo');
  if (userInfo) userInfo.textContent = '';
  
  updateStatistics();
  showLogin();
  showFeedback('Selecione outro usuário para entrar');
}

// Inicializa a aplicação quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM carregado, iniciando aplicação...');
  init();
});

// Também inicializa se o DOM já estiver pronto
if (document.readyState === 'loading') {
  // DOM ainda carregando, aguardar evento
} else {
  // DOM já carregado, inicializar imediatamente
  console.log('DOM já pronto, iniciando aplicação...');
  setTimeout(init, 100);
}