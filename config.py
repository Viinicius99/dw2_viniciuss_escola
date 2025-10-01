# 🎯 Configuração de Sincronização Automática
# Este arquivo garante que o sistema funcione em qualquer PC

# URLs que o frontend tentará automaticamente
BACKEND_URLS = [
    "http://127.0.0.1:8005",
    "http://localhost:8005", 
    "http://0.0.0.0:8005"
]

# Configurações do servidor
SERVER_HOST = "0.0.0.0"  # Aceita conexões de qualquer IP
SERVER_PORT = 8005
AUTO_OPEN_BROWSER = True
AUTO_RESTART = True
MAX_RESTART_ATTEMPTS = 5

# Configurações do banco
DATABASE_URL = "sqlite:///./app.db"
ENSURE_DATABASE_EXISTS = True

# Configurações CORS (permite acesso de qualquer origem)
CORS_ORIGINS = [
    "http://localhost:5500",    # Live Server
    "http://127.0.0.1:5500",    # Live Server
    "http://localhost:8005",    # FastAPI
    "http://127.0.0.1:8005",    # FastAPI
    "file://",                  # Arquivos locais
    "*"                         # Qualquer origem (desenvolvimento)
]

# Health check
HEALTH_CHECK_INTERVAL = 5  # segundos
RECONNECT_ATTEMPTS = 30    # tentativas de reconexão

# Mensagens de status
STATUS_MESSAGES = {
    "connecting": "🔄 Conectando ao backend...",
    "connected": "✅ Sistema sincronizado",
    "disconnected": "⚠️ Backend não encontrado", 
    "error": "🚨 Erro de conexão",
    "instructions": "💡 Execute: python run.py"
}