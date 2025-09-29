// Configuração específica para Live Server
// Este arquivo deve ser carregado ANTES do script.js principal

console.log('🔧 Configuração Live Server carregada');
console.log('🌐 Porta atual:', window.location.port);
console.log('🔗 Protocolo:', window.location.protocol);

// Forçar API_URL para backend quando no Live Server
if (window.location.port === '5500') {
    console.log('📡 Live Server detectado - configurando backend');
    localStorage.setItem('API_URL', 'http://127.0.0.1:8005');
    
    // Adicionar função de teste de conectividade
    window.testarBackend = async function() {
        try {
            console.log('🧪 Testando conexão com backend...');
            const response = await fetch('http://127.0.0.1:8005/health');
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Backend OK:', data);
                return true;
            } else {
                console.log('❌ Backend não responde:', response.status);
                return false;
            }
        } catch (error) {
            console.log('❌ Erro ao conectar backend:', error.message);
            return false;
        }
    };
    
    // Apenas testar conectividade sem recarregar automaticamente
    setTimeout(() => {
        window.testarBackend().then(ok => {
            if (ok) {
                console.log('🎉 Backend disponível!');
            } else {
                console.log('⚠️ Backend não disponível. Execute: python backend/app.py');
            }
        });
    }, 1000);
}