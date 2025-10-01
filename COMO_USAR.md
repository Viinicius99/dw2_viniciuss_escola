# 🎓 Sistema Escola - Projeto Completo

## � INSTALAÇÃO UNIVERSAL (Windows/Mac/Linux)

### Método 1: Automático (VS Code)
1. Abra o projeto no VS Code
2. O sistema inicia automaticamente
3. Acesse: http://127.0.0.1:8005

### Método 2: Universal (Qualquer sistema)
```bash
python run.py
```

### Método 3: Manual
```bash
# 1. Criar ambiente virtual
python -m venv .venv

# 2. Ativar ambiente virtual
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# 3. Instalar dependências
pip install -r backend/requirements.txt
pip install email-validator

# 4. Iniciar sistema
cd backend
python app.py
```

## 📊 Dados Incluídos

✅ **27 alunos** já cadastrados no banco  
✅ **5 turmas** configuradas  
✅ **Banco SQLite** (backend/app.db) incluído no GitHub  
✅ **Frontend completo** integrado  

## � URLs Disponíveis

- **Site Principal**: http://127.0.0.1:8005
- **API Documentação**: http://127.0.0.1:8005/docs  
- **Debug/Teste**: http://127.0.0.1:8005/frontend/debug_cadastro.html

## 🎯 Para Professores

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/Viinicius99/dw2_viniciuss_escola.git
   cd dw2_viniciuss_escola
   ```

2. **Execute o sistema**:
   ```bash
   python run.py
   ```

3. **Pronto!** O navegador abre automaticamente em http://127.0.0.1:8005

## 🔧 Tecnologias Usadas

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Frontend**: HTML5 + CSS3 + JavaScript (Vanilla)
- **Banco**: SQLite com dados pré-carregados
- **Deploy**: Cross-platform Python launcher

## 📱 Funcionalidades

- ✅ Listagem de alunos e turmas
- ✅ Cadastro de novos alunos  
- ✅ Validação de email
- ✅ Interface responsiva
- ✅ API RESTful documentada
- ✅ Banco de dados persistente

## � Solução de Problemas

**Erro de porta ocupada?**
- O sistema usa porta 8005
- Se ocupada, mude a variável PORT no app.py

**Python não encontrado?**
- Certifique-se que Python 3.7+ está instalado
- Windows: instale do python.org
- Mac: use brew install python
- Linux: use apt install python3

**Dependências não instalam?**
- Atualize o pip: `python -m pip install --upgrade pip`
- Use ambiente virtual sempre