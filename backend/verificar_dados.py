from database import SessionLocal
from models import Aluno, Turma

print("=== VERIFICANDO DADOS NO BANCO ===")

db = SessionLocal()

# Contar registros
turmas_count = db.query(Turma).count()
alunos_count = db.query(Aluno).count()

print(f"Turmas no banco: {turmas_count}")
print(f"Alunos no banco: {alunos_count}")

if turmas_count > 0:
    print("\n=== TURMAS ===")
    turmas = db.query(Turma).all()
    for t in turmas:
        print(f"ID: {t.id}, Nome: {t.nome}, Capacidade: {t.capacidade}")

if alunos_count > 0:
    print("\n=== ALUNOS ===")
    alunos = db.query(Aluno).limit(10).all()  # Primeiros 10
    for a in alunos:
        print(f"ID: {a.id}, Nome: {a.nome}, Email: {a.email}, Turma: {a.turma_id}, Status: {a.status}")

db.close()
print("\nVerificação concluída!")
