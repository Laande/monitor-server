const socket = io();
let lastUpdateTime = null;

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function getTimeAgo() {
    if (!lastUpdateTime) return 'jamais';
    
    const seconds = Math.floor((Date.now() - lastUpdateTime) / 1000);
    
    if (seconds < 5) return 'à l\'instant';
    if (seconds < 60) return `il y a ${seconds} secondes`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return 'il y a 1 minute';
    if (minutes < 60) return `il y a ${minutes} minutes`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return 'il y a 1 heure';
    return `il y a ${hours} heures`;
}

function updateTimeDisplay() {
    document.getElementById('last-update').textContent = getTimeAgo();
}

function updateUI(data) {
    // CPU
    document.getElementById('cpu-percent').textContent = data.cpu.percent.toFixed(1);
    document.getElementById('cpu-progress').style.width = data.cpu.percent + '%';
    document.getElementById('cpu-count').textContent = data.cpu.count;
    document.getElementById('cpu-freq').textContent = data.cpu.freq.toFixed(0);
    
    // RAM
    document.getElementById('ram-percent').textContent = data.memory.percent.toFixed(1);
    document.getElementById('ram-progress').style.width = data.memory.percent + '%';
    document.getElementById('ram-used').textContent = formatBytes(data.memory.used);
    document.getElementById('ram-total').textContent = formatBytes(data.memory.total);
    
    // Disque
    document.getElementById('disk-percent').textContent = data.disk.percent.toFixed(1);
    document.getElementById('disk-progress').style.width = data.disk.percent + '%';
    document.getElementById('disk-used').textContent = formatBytes(data.disk.used);
    document.getElementById('disk-free').textContent = formatBytes(data.disk.free);
    
    // Réseau
    document.getElementById('net-sent').textContent = formatBytes(data.network.bytes_sent);
    document.getElementById('net-recv').textContent = formatBytes(data.network.bytes_recv);
    document.getElementById('net-packets-sent').textContent = formatNumber(data.network.packets_sent);
    document.getElementById('net-packets-recv').textContent = formatNumber(data.network.packets_recv);
    
    // Mise à jour du timestamp
    lastUpdateTime = Date.now();
    updateTimeDisplay();
}

socket.on('connect', () => {
    console.log('WebSocket connecté');
});

socket.on('stats_update', (data) => {
    updateUI(data);
});

socket.on('disconnect', () => {
    console.log('WebSocket déconnecté');
});

// Mettre à jour l'affichage du temps toutes les secondes
setInterval(updateTimeDisplay, 1000);
