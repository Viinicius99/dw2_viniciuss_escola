#!/usr/bin/env python3
"""Script para criar usuários de teste"""

from database import SessionLocal
from models import User, Turma
from app import get_password_hash
import sqlalchemy as sa

try:
    # Criar sessão
    db = SessionLocal()

    # Verificar se já existe usuários
    users_count = db.scalar(sa.text('SELECT COUNT(*) FROM users')) or 0
    print(f'Usuários existentes: {users_count}')

    if users_count == 0:
        # Criar professor
        prof = User(username='professor', password_hash=get_password_hash('prof123'), role='professor')
        db.add(prof)
        
        # Pegar primeira turma para o aluno
        turma = db.scalars(sa.select(Turma).order_by(Turma.id)).first()
        turma_id = turma.id if turma else None
        
        # Criar aluno
        aluno_user = User(username='aluno', password_hash=get_password_hash('aluno123'), role='aluno', turma_id=turma_id)
        db.add(aluno_user)
        
        db.commit()
        print('Usuários criados!')
        print('Professor: usuario=professor, senha=prof123')
        print('Aluno: usuario=aluno, senha=aluno123')
    else:
        users = db.execute(sa.text('SELECT username, role FROM users')).fetchall()
        print('Usuários já existem:')
        for user in users:
            print(f'  {user[0]} ({user[1]})')

    db.close()
    print("Usuários verificados com sucesso!")

except Exception as e:
    print(f"Erro: {e}")
    import traceback
    traceback.print_exc()
