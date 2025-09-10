
// Dados simulados para exemplo
let turmas = [
	{ id: 1, nome: "1º Ano A", capacidade: 30, ocupacao: 0 },
	{ id: 2, nome: "2º Ano B", capacidade: 25, ocupacao: 0 },
	{ id: 3, nome: "3º Ano C", capacidade: 20, ocupacao: 0 }
];
let alunos = [];

// Utilidades
function atualizarEstatisticas() {
	document.getElementById("totalAlunos").textContent = alunos.length;
	document.getElementById("alunosAtivos").textContent = alunos.filter(a => a.status === "ativo").length;
	document.getElementById("alunosPorTurma").textContent = turmas.map(t => `${t.nome}: ${t.ocupacao}`).join(", ");
}

function preencherFiltros() {
	const turmaFiltro = document.getElementById("turmaFiltro");
	turmaFiltro.innerHTML = '<option value="">Todas</option>' + turmas.map(t => `<option value="${t.id}">${t.nome}</option>`).join("");
	const turmaAluno = document.getElementById("turmaAluno");
	turmaAluno.innerHTML = '<option value="">Nenhuma</option>' + turmas.map(t => `<option value="${t.id}">${t.nome}</option>`).join("");
	const turmaMatricula = document.getElementById("turmaMatricula");
	turmaMatricula.innerHTML = turmas.map(t => `<option value="${t.id}">${t.nome}</option>`).join("");
}

function preencherAlunosMatricula() {
	const alunoMatricula = document.getElementById("alunoMatricula");
	alunoMatricula.innerHTML = alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join("");
}

function renderAlunos() {
	const tbody = document.querySelector("#tabelaAlunos tbody");
	tbody.innerHTML = "";
	let filtroTurma = document.getElementById("turmaFiltro").value;
	let filtroStatus = document.getElementById("statusFiltro").value;
	let busca = document.getElementById("searchAluno").value.toLowerCase();
	let lista = alunos.filter(a => {
		let turmaOk = !filtroTurma || a.turma_id == filtroTurma;
		let statusOk = !filtroStatus || a.status == filtroStatus;
		let buscaOk = !busca || a.nome.toLowerCase().includes(busca);
		return turmaOk && statusOk && buscaOk;
	});
	lista.sort((a, b) => a.nome.localeCompare(b.nome));
	for (let aluno of lista) {
		let turma = turmas.find(t => t.id == aluno.turma_id);
		tbody.innerHTML += `<tr>
			<td>${aluno.nome}</td>
			<td>${aluno.data_nascimento}</td>
			<td>${aluno.email || "-"}</td>
			<td>${aluno.status}</td>
			<td>${turma ? turma.nome : "-"}</td>
			<td><button onclick="removerAluno(${aluno.id})">Remover</button></td>
		</tr>`;
	}
}

function removerAluno(id) {
	alunos = alunos.filter(a => a.id !== id);
	turmas.forEach(t => t.ocupacao = alunos.filter(a => a.turma_id == t.id).length);
	atualizarEstatisticas();
	renderAlunos();
	preencherAlunosMatricula();
}

// Modais
function abrirModal(id) {
	document.getElementById(id).setAttribute("aria-hidden", "false");
	document.getElementById(id).querySelector("input, select, button").focus();
}
function fecharModal(id) {
	document.getElementById(id).setAttribute("aria-hidden", "true");
}
document.getElementById("novoAlunoBtn").onclick = () => abrirModal("modalNovoAluno");
document.getElementById("fecharModalAluno").onclick = () => fecharModal("modalNovoAluno");
document.getElementById("novaMatriculaBtn").onclick = () => abrirModal("modalNovaMatricula");
document.getElementById("fecharModalMatricula").onclick = () => fecharModal("modalNovaMatricula");

// Formulário Novo Aluno
let alunoIdSeq = 1;
document.getElementById("formNovoAluno").onsubmit = function(e) {
	e.preventDefault();
	const nome = this.nome.value.trim();
	const data_nascimento = this.data_nascimento.value;
	const email = this.email.value.trim();
	const status = this.status.value;
	const turma_id = this.turma_id.value ? Number(this.turma_id.value) : null;
	// Validações
	if (nome.length < 3 || nome.length > 80) return alert("Nome deve ter entre 3 e 80 caracteres.");
	const hoje = new Date();
	const dataLimite = new Date(hoje.getFullYear() - 5, hoje.getMonth(), hoje.getDate());
	if (!data_nascimento || new Date(data_nascimento) > dataLimite) return alert("Data de nascimento inválida. O aluno deve ter pelo menos 5 anos.");
	if (email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return alert("Email inválido.");
	if (!['ativo','inativo'].includes(status)) return alert("Status inválido.");
	// Impede duplicidade de nome
	if (alunos.some(a => a.nome.toLowerCase() === nome.toLowerCase())) return alert("Já existe um aluno com esse nome.");
	// Adiciona aluno
	alunos.push({
		id: alunoIdSeq++, nome, data_nascimento, email, status, turma_id
	});
	turmas.forEach(t => t.ocupacao = alunos.filter(a => a.turma_id == t.id).length);
	atualizarEstatisticas();
	renderAlunos();
	preencherAlunosMatricula();
	fecharModal("modalNovoAluno");
	this.reset();
};

// Formulário Nova Matrícula
document.getElementById("formNovaMatricula").onsubmit = function(e) {
	e.preventDefault();
	const aluno_id = Number(this.aluno_id.value);
	const turma_id = Number(this.turma_id.value);
	let turma = turmas.find(t => t.id === turma_id);
	let aluno = alunos.find(a => a.id === aluno_id);
	if (!turma || !aluno) return alert("Selecione aluno e turma.");
	if (turma.ocupacao >= turma.capacidade) return alert("Turma já está lotada!");
	aluno.turma_id = turma_id;
	aluno.status = "ativo";
	turmas.forEach(t => t.ocupacao = alunos.filter(a => a.turma_id == t.id).length);
	atualizarEstatisticas();
	renderAlunos();
	preencherAlunosMatricula();
	fecharModal("modalNovaMatricula");
};

// Filtros e busca
["turmaFiltro", "statusFiltro", "searchAluno"].forEach(id => {
	document.getElementById(id).oninput = renderAlunos;
});

// Acessibilidade: atalhos para abrir modais
document.addEventListener('keydown', function(e) {
	if (e.altKey && e.key.toLowerCase() === 'n') abrirModal("modalNovoAluno");
	if (e.altKey && e.key.toLowerCase() === 'm') abrirModal("modalNovaMatricula");
});

// Inicialização
preencherFiltros();
atualizarEstatisticas();
renderAlunos();
preencherAlunosMatricula();
