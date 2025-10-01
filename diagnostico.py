#!/usr/bin/env python3
"""
🔧 DIAGNÓSTICO DE SINCRONIZAÇÃO
Este script identifica e resolve problemas de conexão backend/frontend
"""

import requests
import subprocess
import platform
import socket
import json
from pathlib import Path

class DiagnosticoSincronizacao:
    def __init__(self):
        self.project_dir = Path(__file__).parent.absolute()
        self.backend_dir = self.project_dir / "backend"
        self.db_file = self.backend_dir / "app.db"
        
    def print_header(self):
        print("🔧 DIAGNÓSTICO DE SINCRONIZAÇÃO")
        print("=" * 50)
        print()
        
    def verificar_ambiente(self):
        """Verifica o ambiente do sistema"""
        print("🖥️ AMBIENTE DO SISTEMA:")
        print(f"   OS: {platform.system()} {platform.release()}")
        print(f"   Python: {platform.python_version()}")
        print(f"   Pasta: {self.project_dir}")
        print()
        
    def verificar_arquivos(self):
        """Verifica se os arquivos necessários existem"""
        print("📁 VERIFICAÇÃO DE ARQUIVOS:")
        
        arquivos = [
            ("Backend", self.backend_dir / "app.py"),
            ("Banco de Dados", self.db_file),
            ("Frontend", self.project_dir / "frontend" / "index.html"),
            ("Script Launcher", self.project_dir / "run.py"),
            ("Requirements", self.backend_dir / "requirements.txt")
        ]
        
        for nome, arquivo in arquivos:
            status = "✅" if arquivo.exists() else "❌"
            print(f"   {status} {nome}: {arquivo}")
            
        print()
        
    def verificar_porta(self):
        """Verifica se a porta 8005 está disponível"""
        print("🌐 VERIFICAÇÃO DE PORTA:")
        
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex(('127.0.0.1', 8005))
            sock.close()
            
            if result == 0:
                print("   ✅ Porta 8005 está em uso (backend provavelmente rodando)")
                self.testar_backend()
            else:
                print("   ⚠️ Porta 8005 está livre (backend não está rodando)")
                
        except Exception as e:
            print(f"   ❌ Erro ao verificar porta: {e}")
            
        print()
        
    def testar_backend(self):
        """Testa se o backend está respondendo"""
        print("🏥 TESTE DE BACKEND:")
        
        urls = [
            "http://127.0.0.1:8005/health",
            "http://localhost:8005/health",
            "http://0.0.0.0:8005/health"
        ]
        
        for url in urls:
            try:
                response = requests.get(url, timeout=3)
                if response.status_code == 200:
                    data = response.json()
                    print(f"   ✅ {url} - OK")
                    if 'database' in data:
                        db_info = data['database']
                        print(f"      📊 Alunos: {db_info.get('alunos', 'N/A')}")
                        print(f"      📚 Turmas: {db_info.get('turmas', 'N/A')}")
                    return True
                else:
                    print(f"   ❌ {url} - Status {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                print(f"   ❌ {url} - {str(e)[:50]}...")
                
        print("   🚨 Backend não está respondendo")
        return False
        
    def verificar_banco_dados(self):
        """Verifica o banco de dados"""
        print("💾 VERIFICAÇÃO DO BANCO:")
        
        if self.db_file.exists():
            size = self.db_file.stat().st_size
            print(f"   ✅ Banco existe: {self.db_file}")
            print(f"   📏 Tamanho: {size:,} bytes")
            
            # Tenta contar registros
            try:
                import sqlite3
                conn = sqlite3.connect(self.db_file)
                cursor = conn.cursor()
                
                cursor.execute("SELECT COUNT(*) FROM alunos")
                alunos = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM turmas") 
                turmas = cursor.fetchone()[0]
                
                conn.close()
                
                print(f"   📊 Alunos no banco: {alunos}")
                print(f"   📚 Turmas no banco: {turmas}")
                
            except Exception as e:
                print(f"   ⚠️ Erro ao ler banco: {e}")
                
        else:
            print("   ❌ Banco de dados não encontrado")
            
        print()
        
    def sugerir_solucoes(self):
        """Sugere soluções para problemas encontrados"""
        print("💡 SOLUÇÕES RECOMENDADAS:")
        print()
        
        print("1. 🚀 Iniciar o sistema:")
        print("   python run.py")
        print()
        
        print("2. 🔄 Se o backend não conectar:")
        print("   python -m pip install -r backend/requirements.txt")
        print("   python -m pip install email-validator")
        print()
        
        print("3. 🆘 Reinstalação completa:")
        print("   python -m venv .venv")
        print("   .venv\\Scripts\\activate  (Windows)")
        print("   source .venv/bin/activate  (Mac/Linux)")
        print("   pip install -r backend/requirements.txt")
        print("   cd backend && python app.py")
        print()
        
        print("4. 🌐 Testar no navegador:")
        print("   http://127.0.0.1:8005")
        print("   http://127.0.0.1:8005/docs")
        print()
        
    def executar_diagnostico_completo(self):
        """Executa diagnóstico completo"""
        self.print_header()
        self.verificar_ambiente()
        self.verificar_arquivos()
        self.verificar_porta()
        self.verificar_banco_dados()
        self.sugerir_solucoes()
        
        print("🎯 DIAGNÓSTICO CONCLUÍDO")
        print("=" * 50)

if __name__ == "__main__":
    diagnostico = DiagnosticoSincronizacao()
    diagnostico.executar_diagnostico_completo()