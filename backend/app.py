from __future__ import annotations

from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Annotated, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import get_db, init_db
from database import SessionLocal
from models import Aluno, Turma, User

from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = "change-me-dev-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


app = FastAPI(title="Gestão Escolar API", version="1.0.0")

# CORS liberal para permitir seu frontend local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "null"],  # permite file:// (Origin: null) e qualquer origem http
    allow_credentials=False,        # não usamos cookies; permite wildcard funcionar bem
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.on_event("startup")
def on_startup():
    init_db()
    # Bootstrap: cria usuários padrão se o banco estiver vazio (não altera dados existentes)
    from sqlalchemy import select as _select, func as _func
    from datetime import date
    db = SessionLocal()
    try:
        # Verificar se há turmas
        turmas_count = db.scalar(_select(_func.count()).select_from(Turma)) or 0
        print(f"Turmas encontradas: {turmas_count}")
        
        if turmas_count == 0:
            print("Criando turmas padrão...")
            turmas_data = [
                Turma(nome="1° Ano A", capacidade=30),
                Turma(nome="1° Ano B", capacidade=30),
                Turma(nome="2° Ano A", capacidade=28),
                Turma(nome="2° Ano B", capacidade=28),
                Turma(nome="3° Ano A", capacidade=25),
                Turma(nome="3° Ano B", capacidade=25),
            ]
            for turma in turmas_data:
                db.add(turma)
            db.commit()
            print("Turmas criadas!")
        
        # Verificar se há alunos
        alunos_count = db.scalar(_select(_func.count()).select_from(Aluno)) or 0
        print(f"Alunos encontrados: {alunos_count}")
        
        if alunos_count == 0:
            print("Criando alunos padrão...")
            # Buscar turmas criadas
            turmas = db.scalars(_select(Turma).order_by(Turma.id)).all()
            if turmas:
                alunos_data = [
                    Aluno(nome="João Silva", data_nascimento=date(2005, 3, 15), email="joao@email.com", status="ativo", turma_id=turmas[0].id),
                    Aluno(nome="Maria Santos", data_nascimento=date(2005, 7, 22), email="maria@email.com", status="ativo", turma_id=turmas[0].id),
                    Aluno(nome="Pedro Oliveira", data_nascimento=date(2004, 11, 8), email="pedro@email.com", status="ativo", turma_id=turmas[1].id if len(turmas) > 1 else turmas[0].id),
                    Aluno(nome="Ana Costa", data_nascimento=date(2004, 2, 14), email="ana@email.com", status="ativo", turma_id=turmas[1].id if len(turmas) > 1 else turmas[0].id),
                    Aluno(nome="Carlos Lima", data_nascimento=date(2003, 9, 30), email="carlos@email.com", status="ativo", turma_id=turmas[2].id if len(turmas) > 2 else turmas[0].id),
                    Aluno(nome="Beatriz Ferreira", data_nascimento=date(2003, 12, 5), email="beatriz@email.com", status="ativo", turma_id=turmas[2].id if len(turmas) > 2 else turmas[0].id),
                ]
                for aluno in alunos_data:
                    db.add(aluno)
                db.commit()
                print("Alunos criados!")
        
        # Verificar usuários
        users_count = db.scalar(_select(_func.count()).select_from(User)) or 0
        if users_count == 0:
            # cria usuário professor e aluno padrão
            prof = User(username="professor", password_hash=get_password_hash("prof123"), role="professor")
            # tenta associar o aluno à primeira turma, se existir
            turma = db.scalars(_select(Turma).order_by(Turma.id)).first()
            aluno_user = User(
                username="aluno",
                password_hash=get_password_hash("aluno123"),
                role="aluno",
                turma_id=(turma.id if turma else None),
            )
            db.add_all([prof, aluno_user])
            db.commit()
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


# ==== Schemas (Pydantic) ====


class TurmaIn(BaseModel):
    nome: str = Field(min_length=1, max_length=80)
    capacidade: int = Field(ge=0)


class TurmaOut(TurmaIn):
    id: int

    model_config = ConfigDict(from_attributes=True)


class AlunoBase(BaseModel):
    nome: str = Field(min_length=3, max_length=80)
    data_nascimento: date
    email: Optional[EmailStr] = None
    status: str = Field(pattern=r"^(ativo|inativo)$")
    turma_id: Optional[int] = None

    @field_validator("data_nascimento")
    @classmethod
    def valida_idade(cls, v: date) -> date:
        # mínimo 5 anos atrás
        if v > date.today() - timedelta(days=5 * 365):
            raise ValueError("Aluno deve ter pelo menos 5 anos")
        return v


class AlunoIn(AlunoBase):
    pass


class AlunoOut(AlunoBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class MatriculaIn(BaseModel):
    aluno_id: int
    turma_id: int


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[int] = None):
    to_encode = data.copy()
    from datetime import timedelta

    expire = datetime.utcnow() + (timedelta(minutes=expires_delta) if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(db: DbDep, token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    credentials_exc = HTTPException(status_code=401, detail="Não autorizado", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc
    user = db.scalar(select(User).where(User.username == username))
    if not user:
        raise credentials_exc
    return user


def require_role(user: User, roles: tuple[str, ...]):
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="Permissão negada")


# ==== Endpoints Turmas ====


DbDep = Annotated[Session, Depends(get_db)]


@app.get("/turmas", response_model=list[TurmaOut])
def listar_turmas(db: DbDep):
    stmt = select(Turma).order_by(Turma.nome)
    turmas = db.scalars(stmt).all()
    return turmas


@app.post("/turmas", response_model=TurmaOut, status_code=status.HTTP_201_CREATED)
def criar_turma(payload: TurmaIn, db: DbDep, current_user: Annotated[User, Depends(get_current_user)]):
    require_role(current_user, ("professor",))
    # nome único
    if db.scalar(select(func.count()).select_from(Turma).where(Turma.nome == payload.nome)):
        raise HTTPException(status_code=400, detail="Já existe uma turma com esse nome")
    turma = Turma(**payload.model_dump())
    db.add(turma)
    db.commit()
    db.refresh(turma)
    return turma


# ==== Endpoints Alunos ====


@app.get("/alunos", response_model=list[AlunoOut])
def listar_alunos(
    db: DbDep,
    search: str | None = None,
    turma_id: int | None = Query(default=None),
    status_param: str | None = Query(default=None, alias="status"),
    sort: str | None = Query(default=None, description="nome|idade"),
):
    stmt = select(Aluno)

    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(func.lower(Aluno.nome).like(like))

    if turma_id is not None:
        stmt = stmt.where(Aluno.turma_id == turma_id)

    if status_param is not None:
        if status_param not in ("ativo", "inativo"):
            raise HTTPException(status_code=422, detail="status inválido")
        stmt = stmt.where(Aluno.status == status_param)

    if sort == "nome":
        stmt = stmt.order_by(Aluno.nome)
    elif sort == "idade":
        stmt = stmt.order_by(Aluno.data_nascimento)  # mais antigo primeiro => mais velho
    else:
        stmt = stmt.order_by(Aluno.id)

    alunos = db.scalars(stmt).all()
    return alunos


@app.post("/alunos", response_model=AlunoOut, status_code=status.HTTP_201_CREATED)
def criar_aluno(payload: AlunoIn, db: DbDep):
    # valida turma se enviada
    if payload.turma_id is not None:
        turma = db.get(Turma, payload.turma_id)
        if not turma:
            raise HTTPException(status_code=404, detail="Turma não encontrada")
    aluno = Aluno(**payload.model_dump())
    db.add(aluno)
    db.commit()
    db.refresh(aluno)
    return aluno


@app.put("/alunos/{aluno_id}", response_model=AlunoOut)
def atualizar_aluno(aluno_id: int, payload: AlunoIn, db: DbDep):
    aluno = db.get(Aluno, aluno_id)
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    if payload.turma_id is not None:
        turma = db.get(Turma, payload.turma_id)
        if not turma:
            raise HTTPException(status_code=404, detail="Turma não encontrada")

    for k, v in payload.model_dump().items():
        setattr(aluno, k, v)
    db.commit()
    db.refresh(aluno)
    return aluno


@app.delete("/alunos/{aluno_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_aluno(aluno_id: int, db: DbDep):
    aluno = db.get(Aluno, aluno_id)
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    db.delete(aluno)
    db.commit()
    return None


# ==== Matrículas ====


@app.post("/matriculas", status_code=status.HTTP_201_CREATED)
def matricular(payload: MatriculaIn, db: DbDep, current_user: Annotated[User, Depends(get_current_user)]):
    require_role(current_user, ("professor",))
    aluno = db.get(Aluno, payload.aluno_id)
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    turma = db.get(Turma, payload.turma_id)
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")

    # valida capacidade
    ocupacao = db.scalar(select(func.count()).select_from(Aluno).where(Aluno.turma_id == turma.id)) or 0
    if ocupacao >= turma.capacidade:
        raise HTTPException(status_code=400, detail="Capacidade da turma excedida")

    # setar aluno como ativo e vincular turma
    aluno.turma_id = turma.id
    aluno.status = "ativo"
    db.commit()
    return {"message": "Matrícula realizada", "aluno_id": aluno.id, "turma_id": turma.id}


# ====== Auth ======


@app.post("/auth/login", response_model=Token)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbDep):
    user = db.scalar(select(User).where(User.username == form_data.username))
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Credenciais inválidas")
    token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    turma_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


@app.get("/auth/me", response_model=UserOut)
def me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user


# ====== Static Frontend (serve index e assets sem sobrescrever a API) ======
FRONTEND_DIR = (Path(__file__).resolve().parent.parent / "frontend").resolve()

if FRONTEND_DIR.exists():
    index_file = FRONTEND_DIR / "index.html"
    script_file = FRONTEND_DIR / "script.js"
    style_file = FRONTEND_DIR / "styles.css"

    @app.get("/", include_in_schema=False)
    def serve_index():
        return FileResponse(index_file)

    @app.get("/index.html", include_in_schema=False)
    def serve_index_alias():
        return FileResponse(index_file)

    @app.get("/script.js", include_in_schema=False)
    def serve_script():
        return FileResponse(script_file)

    @app.get("/styles.css", include_in_schema=False)
    def serve_styles():
        return FileResponse(style_file)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
