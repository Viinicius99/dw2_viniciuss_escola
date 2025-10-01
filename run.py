#!/usr/bin/env python3
"""
🎓 Sistema Escola - Launcher Universal
=====================================
Este script funciona em Windows, Mac e Linux
Detecta automaticamente o sistema e configura tudo
"""

import sys
import os
import subprocess
import platform
import time
import webbrowser
from pathlib import Path

class EscolaLauncher:
    def __init__(self):
        self.project_dir = Path(__file__).parent.absolute()
        self.backend_dir = self.project_dir / "backend"
        self.venv_dir = self.project_dir / ".venv"
        self.system = platform.system().lower()
        
    def print_banner(self):
        print("🎓 SISTEMA ESCOLA - LAUNCHER UNIVERSAL")
        print("=" * 50)
        print(f"📂 Projeto: {self.project_dir}")
        print(f"💻 Sistema: {platform.system()} {platform.release()}")
        print(f"🐍 Python: {sys.version.split()[0]}")
        print()
        
    def get_python_executable(self):
        """Retorna o executável Python correto para cada OS"""
        if self.system == "windows":
            return self.venv_dir / "Scripts" / "python.exe"
        else:
            return self.venv_dir / "bin" / "python"
            
    def get_pip_executable(self):
        """Retorna o executável pip correto para cada OS"""
        if self.system == "windows":
            return self.venv_dir / "Scripts" / "pip.exe"
        else:
            return self.venv_dir / "bin" / "pip"
            
    def create_venv(self):
        """Cria ambiente virtual se não existir"""
        if not self.venv_dir.exists():
            print("📦 Criando ambiente virtual...")
            subprocess.run([sys.executable, "-m", "venv", str(self.venv_dir)])
            print("✅ Ambiente virtual criado!")
            
    def install_dependencies(self):
        """Instala dependências"""
        requirements_file = self.backend_dir / "requirements.txt"
        if requirements_file.exists():
            print("📥 Instalando dependências...")
            pip_exe = self.get_pip_executable()
            
            # Instala requirements
            subprocess.run([str(pip_exe), "install", "-r", str(requirements_file)], 
                         capture_output=True)
                         
            # Instala email-validator
            subprocess.run([str(pip_exe), "install", "email-validator"], 
                         capture_output=True)
            print("✅ Dependências instaladas!")
            
    def start_backend(self):
        """Inicia o backend com sistema de auto-restart"""
        python_exe = self.get_python_executable()
        app_file = self.backend_dir / "app.py"
        
        if not app_file.exists():
            print("❌ Arquivo app.py não encontrado!")
            return False
            
        print("🚀 Iniciando backend com auto-restart...")
        print("📡 Servidor rodando em: http://127.0.0.1:8005")
        print("🌐 Frontend disponível em: http://127.0.0.1:8005/")
        print("🔄 Sistema configurado para reconectar automaticamente")
        print()
        print("💡 Para parar o servidor: Ctrl+C")
        print("-" * 50)
        
        # Abre o navegador automaticamente após 3 segundos
        import threading
        def open_browser():
            time.sleep(3)
            try:
                webbrowser.open("http://127.0.0.1:8005")
            except:
                pass
            
        browser_thread = threading.Thread(target=open_browser)
        browser_thread.daemon = True
        browser_thread.start()
        
        # Sistema de auto-restart do backend
        max_retries = 5
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                # Inicia o servidor
                os.chdir(self.backend_dir)
                process = subprocess.run([str(python_exe), "app.py"])
                
                # Se chegou aqui, o processo terminou
                if process.returncode == 0:
                    print("✅ Backend encerrado normalmente")
                    break
                else:
                    retry_count += 1
                    print(f"⚠️ Backend falhou. Tentativa {retry_count}/{max_retries}")
                    if retry_count < max_retries:
                        print("🔄 Reiniciando em 3 segundos...")
                        time.sleep(3)
                    
            except KeyboardInterrupt:
                print("\n👋 Backend encerrado pelo usuário")
                break
            except Exception as e:
                retry_count += 1
                print(f"❌ Erro: {e}")
                if retry_count < max_retries:
                    print(f"🔄 Tentando novamente... ({retry_count}/{max_retries})")
                    time.sleep(3)
        
        if retry_count >= max_retries:
            print("🚨 Máximo de tentativas atingido. Verifique os logs de erro.")
            
        return True
        
    def run(self):
        """Executa o launcher completo"""
        try:
            self.print_banner()
            self.create_venv()
            self.install_dependencies() 
            self.start_backend()
        except KeyboardInterrupt:
            print("\n\n👋 Sistema encerrado pelo usuário")
        except Exception as e:
            print(f"\n❌ Erro: {e}")
            print("\n🆘 Tente rodar manualmente:")
            print("   1. python -m venv .venv")
            print("   2. source .venv/bin/activate  (Linux/Mac)")
            print("      .venv\\Scripts\\activate     (Windows)")
            print("   3. pip install -r backend/requirements.txt")
            print("   4. cd backend && python app.py")

if __name__ == "__main__":
    launcher = EscolaLauncher()
    launcher.run()