from __future__ import annotations

from datetime import date, timedelta
import random

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from database import SessionLocal, init_db
from models import Aluno, Turma, User
from .app import get_password_hash


def random_date(start_year: int = 2005, end_year: int = 2020) -> date:
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))


def run():
    init_db()
    db: Session = SessionLocal()
    try:
        # Cria turmas e alunos apenas se ainda não existirem
        turmas = db.scalars(select(Turma)).all()
        if not turmas:
            turmas_nomes = [
                ("1A", 25), ("1B", 25), ("2A", 30), ("2B", 30), ("3A", 35)
            ]
            turmas = []
            for nome, cap in turmas_nomes:
                t = Turma(nome=nome, capacidade=cap)
                db.add(t)
                turmas.append(t)
            db.commit()
            [db.refresh(t) for t in turmas]

        nomes = [
            "Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique",
            "Isabela", "João", "Karen", "Lucas", "Mariana", "Nicolas", "Olivia", "Pedro",
            "Queila", "Rafael", "Sofia", "Thiago", "Ulisses", "Valentina"
        ]
        random.shuffle(nomes)

        if not db.scalar(select(func.count()).select_from(Aluno)):
            alunos: list[Aluno] = []
            for i in range(20):
                nome = nomes[i % len(nomes)] + f" {random.choice(['Silva','Souza','Lima','Oliveira'])}"
                dn = random_date(2006, 2018)
                email = None
                if random.random() > 0.4:
                    email = f"{nome.split()[0].lower()}{random.randint(1,99)}@exemplo.com"

                a = Aluno(
                    nome=nome,
                    data_nascimento=dn,
                    email=email,
                    status=random.choice(["ativo", "inativo"]),
                )
                # 60% vinculados a alguma turma
                if turmas and random.random() > 0.4:
                    a.turma_id = random.choice(turmas).id
                    a.status = "ativo"
                alunos.append(a)
                db.add(a)
            db.commit()

        # criar usuários
        # Cria usuários padrão caso não existam
        if not db.scalar(select(func.count()).select_from(User)):
            prof = User(username="professor", password_hash=get_password_hash("prof123"), role="professor")
            turma_para_aluno = turmas[0] if turmas else None
            aluno_user = User(
                username="aluno",
                password_hash=get_password_hash("aluno123"),
                role="aluno",
                turma_id=(turma_para_aluno.id if turma_para_aluno else None),
            )
            db.add_all([prof, aluno_user])
            db.commit()
            print("Seed concluído: turmas/alunos criados (se ausentes) e usuários (professor/prof123, aluno/aluno123).")
        else:
            print("Usuários já existem; seed parcial concluído.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
