const socket = io();
let lastUpdateTime = null;

function updateTimeDisplay() {
    document.getElementById('last-update').textContent = getTimeAgo(lastUpdateTime);
}

function loadCachedData() {
    const cached = localStorage.getItem('stats_data');
    if (cached) {
        const data = JSON.parse(cached);
        updateUI(data);
    }
}

function updateUI(data) {
    // Sauvegarder en cache
    localStorage.setItem('stats_data', JSON.stringify(data));
    
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
    
    // Disk
    document.getElementById('disk-percent').textContent = data.disk.percent.toFixed(1);
    document.getElementById('disk-progress').style.width = data.disk.percent + '%';
    document.getElementById('disk-used').textContent = formatBytes(data.disk.used);
    document.getElementById('disk-free').textContent = formatBytes(data.disk.free);
    
    // Network
    document.getElementById('net-sent').textContent = formatBytes(data.network.bytes_sent);
    document.getElementById('net-recv').textContent = formatBytes(data.network.bytes_recv);
    document.getElementById('net-packets-sent').textContent = formatNumber(data.network.packets_sent);
    document.getElementById('net-packets-recv').textContent = formatNumber(data.network.packets_recv);
    
    // System info
    if (data.system) {
        document.getElementById('system-uptime').textContent = formatUptime(data.system.uptime_seconds);
        const bootDate = new Date(data.system.boot_time * 1000);
        document.getElementById('system-boot').textContent = bootDate.toLocaleString();
    }
    
    // Update timestamp
    lastUpdateTime = Date.now();
    updateTimeDisplay();
}

// Charger les données en cache au démarrage
loadCachedData();

socket.on('connect', () => {
    console.log('WebSocket connected');
});

socket.on('stats_update', (data) => {
    updateUI(data);
});

socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
});

// Update time display every second
setInterval(updateTimeDisplay, 1000);
