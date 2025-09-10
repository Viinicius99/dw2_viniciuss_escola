// Estado sincronizado com a API (FastAPI)
const API_URL = 'http://127.0.0.1:8000';
let token = localStorage.getItem('token') || null;
let currentUser = null;
let students = [];
let transfersToday = 0;
let classes = [];

// Util: chamadas HTTP
async function fetchJSON(path, options = {}) {
  if (!token) {
    // Sem token, manda para login
    window.location.href = 'login.html';
    return Promise.reject(new Error('Não autenticado'));
  }
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    ...options,
  });
  const isJSON = res.headers.get('content-type')?.includes('application/json');
  const data = isJSON ? await res.json() : null;
  if (!res.ok) {
    const msg = data?.detail || data?.message || `Erro ${res.status}`;
    throw new Error(msg);
  }
  return data;
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
  const data = await fetchJSON('/turmas');
  classes = data.map(mapTurmaOutToFront);
}

async function getAlunos(params = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.turma_id) q.set('turma_id', params.turma_id);
  if (params.status) q.set('status', params.status);
  const qs = q.toString();
  const data = await fetchJSON(`/alunos${qs ? `?${qs}` : ''}`);
  students = data.map(mapAlunoOutToFront);
}

async function createAlunoApi(form) {
  const payload = mapAlunoFormToBack(form);
  const data = await fetchJSON('/alunos', { method: 'POST', body: JSON.stringify(payload) });
  return mapAlunoOutToFront(data);
}

async function updateAlunoApi(id, form) {
  const payload = mapAlunoFormToBack(form);
  const data = await fetchJSON(`/alunos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  return mapAlunoOutToFront(data);
}

async function deleteAlunoApi(id) {
  await fetchJSON(`/alunos/${id}`, { method: 'DELETE' });
}

async function postMatriculaApi(alunoId, turmaId) {
  return await fetchJSON('/matriculas', {
    method: 'POST',
    body: JSON.stringify({ aluno_id: alunoId, turma_id: turmaId })
  });
}

async function loadInitialData() {
  try {
    // Carregar usuário logado
    if (!token) {
      window.location.href = 'login.html';
      return;
    }
    const meRes = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (meRes.ok) {
      currentUser = await meRes.json();
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      return;
    }

    await getTurmas();
    if (currentUser?.role === 'aluno' && currentUser?.turma_id) {
      await getAlunos({ turma_id: currentUser.turma_id });
    } else {
      await getAlunos();
    }
    recomputeClassOccupancy();
    populateClassSelect();
    updateClassOccupancy();
    renderStudents(students);
    updateStatistics();
    applyRoleRestrictions();
  } catch (err) {
    console.error(err);
    showFeedback(`Erro ao carregar dados: ${err.message}`, 'error');
  }
}

// Elementos do DOM
const studentsList = document.getElementById('studentsList');
const searchInput = document.getElementById('searchStudent');
const classFilter = document.getElementById('classFilter');
const statusFilter = document.getElementById('statusFilter');
const ageFilter = document.getElementById('ageFilter');
const newStudentBtn = document.getElementById('newStudentBtn');
const exportBtn = document.getElementById('exportBtn');
const studentForm = document.getElementById('studentForm');
const feedback = document.getElementById('feedback');
const themeButton = document.getElementById('themeButton');
const darkModeButton = document.getElementById('darkModeButton');

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
  setupEventListeners();
  loadSavedTheme();
  initColorWheel();
  loadInitialData();
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
  const classSelects = [classFilter, document.getElementById('classId')];
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
  // Eventos de filtro
  searchInput.addEventListener('input', filterStudents);
  classFilter.addEventListener('change', filterStudents);
  statusFilter.addEventListener('change', filterStudents);
  ageFilter.addEventListener('change', filterStudents);

  // Eventos de cadastro e manipulação
  newStudentBtn.addEventListener('click', () => openModal('newStudentModal'));
  studentForm.addEventListener('submit', handleStudentSubmit);
  exportBtn.addEventListener('click', exportData);

  // Evento de transferência
  const transferForm = document.getElementById('transferForm');
  if (transferForm) {
    transferForm.addEventListener('submit', handleTransferSubmit);
  }

  // Eventos de tema
  themeButton.addEventListener('click', () => {
    setupColorPicker();
    openModal('colorPickerModal');
  });
  darkModeButton.addEventListener('click', toggleDarkMode);
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
  studentsList.innerHTML = '';
  studentsToRender.forEach(student => {
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

  const formData = {
    name: document.getElementById('studentName').value,
    birthDate: document.getElementById('birthDate').value,
    email: document.getElementById('email').value,
    status: document.getElementById('status').value,
    classId: parseInt(document.getElementById('classId').value) || null
  };

  // Validate age
  const age = calculateAge(formData.birthDate);
  if (age < 5) {
    showFeedback('O aluno deve ter pelo menos 5 anos de idade', 'error');
    return;
  }

  try {
    if (editingStudentId) {
      const updated = await updateAlunoApi(editingStudentId, formData);
      const idx = students.findIndex(s => s.id === editingStudentId);
      if (idx !== -1) students[idx] = updated;
      showFeedback('Aluno atualizado com sucesso');
    } else {
      const created = await createAlunoApi(formData);
      students.push(created);
      showFeedback('Aluno cadastrado com sucesso');
    }
    recomputeClassOccupancy();
    updateClassOccupancy();
  } catch (err) {
    showFeedback(`Erro ao salvar: ${err.message}`, 'error');
    return;
  }

  closeModal('newStudentModal');
  filterStudents();
  updateStatistics();
  studentForm.reset();
  editingStudentId = null;
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
    studentForm.reset();
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
    student.classId = newClassId;
    student.status = 'ativo';
    transfersToday++;
    recomputeClassOccupancy();
    updateClassOccupancy();
    filterStudents();
    updateStatistics();
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

  const studentIndex = students.findIndex(s => s.id === id);
  if (studentIndex === -1) {
    showFeedback('Aluno não encontrado', 'error');
    return;
  }

  try {
    await deleteAlunoApi(id);
    students.splice(studentIndex, 1);
    recomputeClassOccupancy();
    filterStudents();
    updateStatistics();
    updateClassOccupancy();
    showFeedback('Aluno excluído com sucesso');
  } catch (err) {
    showFeedback(`Erro ao excluir: ${err.message}`, 'error');
  }
}

// Feedback functions
function showFeedback(message, type = 'success') {
  feedback.textContent = message;
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

// Inicializa a aplicação quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', function () {
  init();
});

// Ajusta a UI conforme o papel do usuário
function applyRoleRestrictions() {
  if (currentUser?.role === 'aluno') {
    // Esconde criação de aluno
    const newStudentBtn = document.getElementById('newStudentBtn');
    if (newStudentBtn) newStudentBtn.style.display = 'none';
    // Filtro de turma travado
    if (classFilter) {
      classFilter.disabled = true;
      // Se tiver turma, já estará filtrado pelos dados carregados
    }
  }
}

// Logout utilitário (opcional, chame via console)
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}
