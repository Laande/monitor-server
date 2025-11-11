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
    if (!lastUpdateTime) return 'never';
    
    const seconds = Math.floor((Date.now() - lastUpdateTime) / 1000);
    
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
}

function updateTimeDisplay() {
    document.getElementById('last-update').textContent = getTimeAgo();
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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
