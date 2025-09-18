from __future__ import annotations

from datetime import date
from sqlalchemy import Date, ForeignKey, Integer, String, CheckConstraint, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Turma(Base):
    __tablename__ = "turmas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    capacidade: Mapped[int] = mapped_column(Integer, nullable=False)

    alunos: Mapped[list[Aluno]] = relationship(
        back_populates="turma", cascade="all, delete-orphan", passive_deletes=True
    )

    __table_args__ = (
        CheckConstraint("capacidade >= 0", name="ck_turma_capacidade_nao_negativa"),
        Index("ix_turma_nome", "nome"),
    )


class Aluno(Base):
    __tablename__ = "alunos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(80), nullable=False)
    data_nascimento: Mapped[date] = mapped_column(Date, nullable=False)
    email: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="inativo")

    turma_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("turmas.id", ondelete="SET NULL"), nullable=True
    )
    turma: Mapped[Turma | None] = relationship(back_populates="alunos")

    __table_args__ = (
        CheckConstraint("length(nome) >= 3", name="ck_aluno_nome_min"),
        CheckConstraint("status in ('ativo','inativo')", name="ck_aluno_status"),
        Index("ix_aluno_nome", "nome"),
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # 'aluno' | 'professor'
    # para aluno, podemos associar turma de escopo
    turma_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("turmas.id"), nullable=True)
    turma: Mapped[Turma | None] = relationship()

    __table_args__ = (
        CheckConstraint("role in ('aluno','professor')", name="ck_user_role"),
        UniqueConstraint('username', name='uq_user_username'),
    )
