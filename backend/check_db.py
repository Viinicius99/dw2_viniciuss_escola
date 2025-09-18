#!/usr/bin/env python3
"""Script para verificar e popular o banco de dados"""

try:
    from database import SessionLocal, init_db
    from models import Aluno, Turma, User
    from datetime import date
    
    print("Inicializando banco de dados...")
    init_db()
    
    # Criar sessão
    db = SessionLocal()
    
    # Verificar dados existentes
    turmas_count = db.query(Turma).count()
    alunos_count = db.query(Aluno).count()
    
    print(f"Turmas no banco: {turmas_count}")
    print(f"Alunos no banco: {alunos_count}")
    
    # Se não houver dados, criar alguns
    if turmas_count == 0:
        print("Criando turmas de exemplo...")
        turmas_data = [
            {"nome": "1° Ano A", "capacidade": 30},
            {"nome": "1° Ano B", "capacidade": 30},
            {"nome": "2° Ano A", "capacidade": 28},
            {"nome": "2° Ano B", "capacidade": 28},
            {"nome": "3° Ano A", "capacidade": 25},
            {"nome": "3° Ano B", "capacidade": 25},
        ]
        
        for turma_data in turmas_data:
            turma = Turma(**turma_data)
            db.add(turma)
        
        db.commit()
        print("Turmas criadas!")
    
    if alunos_count == 0:
        print("Criando alunos de exemplo...")
        # Buscar IDs das turmas
        turmas = db.query(Turma).all()
        
        alunos_data = [
            {"nome": "João Silva", "data_nascimento": date(2005, 3, 15), "email": "joao@email.com", "status": "ativo", "turma_id": turmas[0].id},
            {"nome": "Maria Santos", "data_nascimento": date(2005, 7, 22), "email": "maria@email.com", "status": "ativo", "turma_id": turmas[0].id},
            {"nome": "Pedro Oliveira", "data_nascimento": date(2004, 11, 8), "email": "pedro@email.com", "status": "ativo", "turma_id": turmas[1].id},
            {"nome": "Ana Costa", "data_nascimento": date(2004, 2, 14), "email": "ana@email.com", "status": "ativo", "turma_id": turmas[1].id},
            {"nome": "Carlos Lima", "data_nascimento": date(2003, 9, 30), "email": "carlos@email.com", "status": "ativo", "turma_id": turmas[2].id},
            {"nome": "Beatriz Ferreira", "data_nascimento": date(2003, 12, 5), "email": "beatriz@email.com", "status": "ativo", "turma_id": turmas[2].id},
        ]
        
        for aluno_data in alunos_data:
            aluno = Aluno(**aluno_data)
            db.add(aluno)
        
        db.commit()
        print("Alunos criados!")
    
    # Verificar novamente
    turmas_count = db.query(Turma).count()
    alunos_count = db.query(Aluno).count()
    
    print(f"\nDados finais:")
    print(f"Turmas no banco: {turmas_count}")
    print(f"Alunos no banco: {alunos_count}")
    
    # Listar algumas turmas
    print("\nTurmas:")
    for turma in db.query(Turma).limit(3).all():
        print(f"  - {turma.nome} (capacidade: {turma.capacidade})")
    
    # Listar alguns alunos
    print("\nAlunos:")
    for aluno in db.query(Aluno).limit(3).all():
        turma_nome = db.query(Turma).filter(Turma.id == aluno.turma_id).first().nome if aluno.turma_id else "Sem turma"
        print(f"  - {aluno.nome} ({turma_nome})")
    
    db.close()
    print("\nBanco de dados verificado com sucesso!")
    
except Exception as e:
    print(f"Erro: {e}")
    import traceback
    traceback.print_exc()
