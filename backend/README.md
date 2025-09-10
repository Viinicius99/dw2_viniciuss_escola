# Backend - Gestão Escolar (FastAPI + SQLite)

Este backend implementa a API do tema Escola, seguindo as especificações do trabalho.

## Como rodar

1. Crie e ative um venv (opcional mas recomendado).
2. Instale dependências:

```
pip install -r backend/requirements.txt
```

3. Rodar API (porta 8000):

```
python -m uvicorn backend.app:app --reload
```

4. Opcional: popular o banco com seeds:

```
python -m backend.seed
```

- A API expõe docs interativas em: http://127.0.0.1:8000/docs
- O banco SQLite será criado como `backend/app.db`.

## Endpoints principais

- GET /health
- GET /turmas
- POST /turmas
- GET /alunos?search=&turma_id=&status=&sort=(nome|idade)
- POST /alunos
- PUT /alunos/{id}
- DELETE /alunos/{id}
- POST /matriculas (aluno_id, turma_id)

## Regras implementadas

- Validação de idade mínima (>= 5 anos).
- Status do aluno: ativo|inativo.
- Capacidade da turma respeitada ao matricular.
- Ao matricular: aluno vira ativo e recebe turma_id.

## Testes manuais

Há um arquivo `backend/api.http` com requisições para usar no VS Code (REST Client) ou importar no Thunder Client/Insomnia.

## Licença

Uso educacional.