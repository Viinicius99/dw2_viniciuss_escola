// Dados de exemplo para desenvolvimento - substituir por chamadas API reais
let students = [];
const classes = [
    { id: 1, name: 'Turma A', capacity: 30, occupied: 0 },
    { id: 2, name: 'Turma B', capacity: 25, occupied: 0 },
    { id: 3, name: 'Turma C', capacity: 35, occupied: 0 }
];

// Atualizar contagem inicial de ocupação
function initializeClassOccupancy() {
    // Resetar ocupação
    classes.forEach(cls => cls.occupied = 0);
    
    // Contar alunos em cada turma
    students.forEach(student => {
        if (student.classId) {
            const cls = classes.find(c => c.id === student.classId);
            if (cls) cls.occupied++;
        }
    });
    
    updateClassOccupancy();
}

// Elementos do DOM
const studentsList = document.getElementById('studentsList');
const searchInput = document.getElementById('searchStudent');
const classFilter = document.getElementById('classFilter');
const statusFilter = document.getElementById('statusFilter');
const newStudentBtn = document.getElementById('newStudentBtn');
const newEnrollmentBtn = document.getElementById('newEnrollmentBtn');
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
    if (!canvas) return;
    
    colorWheelContext = canvas.getContext('2d');
    rect = canvas.getBoundingClientRect();
    const width = canvas.width;
    const height = canvas.height;
    centerX = width / 2;
    centerY = height / 2;
    wheelRadius = Math.min(width, height) / 2 - 5;

    // Inicializa o indicador de cor
    colorIndicator = document.querySelector('.color-picker-indicator');
    if (!colorIndicator) return;
    
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
    document.getElementById('brightness').addEventListener('input', updateBrightness);

    // Event Listener para aplicar cor de fundo
    document.getElementById('applyBackground').addEventListener('click', applyBackgroundColor);

    // Carregar cor salva
    const savedColor = localStorage.getItem('backgroundColor');
    if (savedColor) {
        currentColor = savedColor;
        updateColorPreviewUI(currentColor);
        document.body.style.backgroundColor = currentColor;
    }
}

function drawColorWheel() {
    // Desenha um seletor horizontal: matiz no eixo X, saturação no eixo Y
    if (!canvas || !colorWheelContext) return;
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
}


function startColorSelection(e) {
    // ativar captura do ponteiro para garantir recebimento de eventos mesmo
    // se o ponteiro sair temporariamente do canvas
    try {
        e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
    } catch (err) {
        // ignore em navegadores que não suportam
    }
    isDragging = true;
    updateColorFromPosition(e);
}

function updateColorSelection(e) {
    if (isDragging) {
        updateColorFromPosition(e);
    }
}

function stopColorSelection() {
    // liberar captura do ponteiro se possível
    try {
        // Não temos o event aqui, mas podemos soltar captura em todos os ponteiros
        // ao usar pointerup/pointercancel o browser já cuida da liberação.
    } catch (err) {
        // ignore
    }
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
    const m = l - c/2;
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

    // Converte para coordenadas relativas ao canvas e limita
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
    
    // Converter RGB para RGBA com opacidade baseada no brilho
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
    // Also set inline body background to ensure immediate visual update
    try {
        document.body.style.backgroundColor = rgba;
    } catch (err) {
        // ignore
    }
    showFeedback('Cor de fundo atualizada com sucesso!');
}

// Paletas de cores disponíveis
const colorPalettes = {
    primary: [ // Cores primárias
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
    initializeClassOccupancy(); // Inicializa ocupação das turmas
    populateClassSelect(); // Preenche os selects de turmas
    setupEventListeners(); // Configura os eventos
    updateStatistics(); // Atualiza estatísticas
    updateClassOccupancy(); // Atualiza ocupação das turmas
    loadSavedTheme(); // Carrega tema salvo
    initColorWheel(); // Inicializa a roda de cores
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

// Populate class select dropdowns
function populateClassSelect() {
    const classSelects = [classFilter, document.getElementById('classId')];
    classSelects.forEach(select => {
        // Limpar opções existentes, mantendo apenas a opção padrão
        const defaultOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (defaultOption) {
            select.appendChild(defaultOption);
        }
        
        // Adicionar opções de turma atualizadas
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = `${cls.name} (${cls.occupied}/${cls.capacity})`;
            
            // Adicionar dados de ocupação como atributos para fácil acesso
            option.dataset.occupied = cls.occupied;
            option.dataset.capacity = cls.capacity;
            
            select.appendChild(option);
        });
    });
}

// Configura os eventos da aplicação
function setupEventListeners() {
    // Eventos de filtro
    searchInput.addEventListener('input', filterStudents);
    classFilter.addEventListener('change', filterStudents);
    statusFilter.addEventListener('change', filterStudents);
    
    // Eventos de cadastro e manipulação
    newStudentBtn.addEventListener('click', () => openModal('newStudentModal'));
    studentForm.addEventListener('submit', handleStudentSubmit);
    exportBtn.addEventListener('click', exportData);
    
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
            colorOption.setAttribute('aria-label', `${color.name}`);
            
            // Verificar se é a cor atual
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
    
    // Remove selection from other colors of same type
    document.querySelectorAll(`[data-type="${type}"]`).forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selection to clicked color
    element.classList.add('selected');
    
    // Update preview
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
    
    // Salvar no localStorage
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

// Filter students based on search, class, and status
function filterStudents() {
    const searchTerm = searchInput.value.toLowerCase();
    const classId = classFilter.value;
    const status = statusFilter.value;

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm);
        const matchesClass = !classId || student.classId === parseInt(classId);
        const matchesStatus = !status || student.status === status;
        return matchesSearch && matchesClass && matchesStatus;
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
            <td>
                <button onclick="editStudent(${student.id})" class="btn btn-secondary" aria-label="Editar ${student.name}">Editar</button>
                <button onclick="deleteStudent(${student.id})" class="btn btn-accent" aria-label="Excluir ${student.name}">Excluir</button>
            </td>
        `;
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
function handleStudentSubmit(e) {
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

    if (editingStudentId) {
        // Editing existing student
        const student = students.find(s => s.id === editingStudentId);
        const oldClassId = student.classId;

        // Update class occupancy if class changed
        if (oldClassId !== formData.classId) {
            if (oldClassId) {
                const oldClass = classes.find(c => c.id === oldClassId);
                oldClass.occupied--;
            }
            if (formData.classId) {
                const newClass = classes.find(c => c.id === formData.classId);
                if (newClass.occupied >= newClass.capacity) {
                    showFeedback('A turma selecionada está com capacidade máxima', 'error');
                    return;
                }
                newClass.occupied++;
            }
            updateClassOccupancy(); // Atualizar exibição da ocupação
        }

        // Update student data
        Object.assign(student, formData);
        showFeedback('Aluno atualizado com sucesso');
    } else {
        // Creating new student
        formData.id = students.length + 1;

        // Validate class capacity for new student
        if (formData.classId) {
            const selectedClass = classes.find(c => c.id === formData.classId);
            if (selectedClass.occupied >= selectedClass.capacity) {
                showFeedback('A turma selecionada está com capacidade máxima', 'error');
                return;
            }
            selectedClass.occupied++;
            updateClassOccupancy(); // Atualizar exibição da ocupação
        }

        students.push(formData);
        showFeedback('Aluno cadastrado com sucesso');
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
    editingStudentId = null;
    studentForm.reset();
}

// Edit student function
function editStudent(id) {
    const student = students.find(s => s.id === id);
    if (!student) {
        showFeedback('Aluno não encontrado', 'error');
        return;
    }

    editingStudentId = id;
    
    // Fill form with student data
    document.getElementById('studentName').value = student.name;
    document.getElementById('birthDate').value = student.birthDate;
    document.getElementById('email').value = student.email || '';
    document.getElementById('status').value = student.status;
    document.getElementById('classId').value = student.classId || '';

    // Open modal
    openModal('newStudentModal');
}

// Delete student function
function deleteStudent(id) {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) {
        return;
    }

    const studentIndex = students.findIndex(s => s.id === id);
    if (studentIndex === -1) {
        showFeedback('Aluno não encontrado', 'error');
        return;
    }

    const student = students[studentIndex];
    
    // Update class occupancy if student was enrolled
    if (student.classId) {
        const cls = classes.find(c => c.id === student.classId);
        if (cls) {
            cls.occupied--;
        }
    }

    // Remove student
    students.splice(studentIndex, 1);
    
    filterStudents();
    updateStatistics();
    updateClassOccupancy(); // Atualizar exibição da ocupação
    showFeedback('Aluno excluído com sucesso');
}

// Feedback functions
function showFeedback(message, type = 'success') {
    feedback.textContent = message;
    feedback.className = `feedback active ${type}`;
    feedback.setAttribute('role', 'alert');
    // Limpa timeout anterior para evitar múltiplos timers concorrentes
    if (window.__feedbackTimeoutId) {
        clearTimeout(window.__feedbackTimeoutId);
    }

    // Esconder após 1.5s (1500ms) e limpar conteúdo/atributos
    window.__feedbackTimeoutId = setTimeout(() => {
        feedback.classList.remove('active');
        feedback.textContent = '';
        feedback.removeAttribute('role');
        window.__feedbackTimeoutId = null;
    }, 1500);
}

// Inicializa a aplicação quando o documento estiver carregado
init();
