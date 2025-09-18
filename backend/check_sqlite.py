#!/usr/bin/env python3
import sqlite3
import os
from datetime import date

# Caminho do banco
db_path = "app.db"

# Conectar ao banco
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Verificando banco de dados...")

# Verificar se as tabelas existem
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print(f"Tabelas encontradas: {[table[0] for table in tables]}")

# Verificar dados nas tabelas
try:
    cursor.execute("SELECT COUNT(*) FROM turmas")
    turmas_count = cursor.fetchone()[0]
    print(f"Turmas no banco: {turmas_count}")
    
    cursor.execute("SELECT COUNT(*) FROM alunos")
    alunos_count = cursor.fetchone()[0]
    print(f"Alunos no banco: {alunos_count}")
    
    # Se não houver dados, criar alguns
    if turmas_count == 0:
        print("Adicionando turmas...")
        turmas_data = [
            ("1° Ano A", 30),
            ("1° Ano B", 30),
            ("2° Ano A", 28),
            ("2° Ano B", 28),
            ("3° Ano A", 25),
            ("3° Ano B", 25),
        ]
        
        cursor.executemany("INSERT INTO turmas (nome, capacidade) VALUES (?, ?)", turmas_data)
        conn.commit()
        print("Turmas adicionadas!")
    
    if alunos_count == 0:
        print("Adicionando alunos...")
        # Buscar IDs das turmas
        cursor.execute("SELECT id FROM turmas ORDER BY id LIMIT 3")
        turma_ids = [row[0] for row in cursor.fetchall()]
        
        if turma_ids:
            alunos_data = [
                ("João Silva", "2005-03-15", "joao@email.com", "ativo", turma_ids[0]),
                ("Maria Santos", "2005-07-22", "maria@email.com", "ativo", turma_ids[0]),
                ("Pedro Oliveira", "2004-11-08", "pedro@email.com", "ativo", turma_ids[1]),
                ("Ana Costa", "2004-02-14", "ana@email.com", "ativo", turma_ids[1]),
                ("Carlos Lima", "2003-09-30", "carlos@email.com", "ativo", turma_ids[2] if len(turma_ids) > 2 else turma_ids[0]),
                ("Beatriz Ferreira", "2003-12-05", "beatriz@email.com", "ativo", turma_ids[2] if len(turma_ids) > 2 else turma_ids[0]),
            ]
            
            cursor.executemany("INSERT INTO alunos (nome, data_nascimento, email, status, turma_id) VALUES (?, ?, ?, ?, ?)", alunos_data)
            conn.commit()
            print("Alunos adicionados!")
    
    # Verificar dados finais
    cursor.execute("SELECT COUNT(*) FROM turmas")
    turmas_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM alunos")
    alunos_count = cursor.fetchone()[0]
    
    print(f"\nDados finais:")
    print(f"Turmas: {turmas_count}")
    print(f"Alunos: {alunos_count}")
    
    # Mostrar algumas turmas
    print("\nTurmas:")
    cursor.execute("SELECT id, nome, capacidade FROM turmas LIMIT 3")
    for row in cursor.fetchall():
        print(f"  - ID: {row[0]}, Nome: {row[1]}, Capacidade: {row[2]}")
    
    # Mostrar alguns alunos
    print("\nAlunos:")
    cursor.execute("""
        SELECT a.id, a.nome, a.email, a.status, t.nome as turma_nome 
        FROM alunos a 
        LEFT JOIN turmas t ON a.turma_id = t.id 
        LIMIT 3
    """)
    for row in cursor.fetchall():
        print(f"  - ID: {row[0]}, Nome: {row[1]}, Email: {row[2]}, Status: {row[3]}, Turma: {row[4]}")

except Exception as e:
    print(f"Erro ao acessar dados: {e}")

conn.close()
print("\nBanco verificado!")
