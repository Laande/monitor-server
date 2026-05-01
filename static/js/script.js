let lastUpdateTime = null;
const CACHE_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes

function loadCachedStats() {
    const cached = CacheManager.get('stats_data');
    const metadata = CacheManager.getWithMetadata('stats_data');

    if (cached) {
        try {
            updateUI(cached, false);
            if (metadata && metadata.timestamp) {
                lastUpdateTime = metadata.timestamp;
            }
        } catch (error) {
            console.warn('Failed to load cached stats:', error);
        }
    }
}

function saveStatsCache(data) {
    CacheManager.set('stats_data', data, CACHE_EXPIRATION_MS);
}

function updateTimeDisplay() {
    document.getElementById('last-update').textContent = getTimeAgo(lastUpdateTime);
}


function updateDisks(disks) {
    const disksGrid = document.getElementById('disks-grid');
    if (!disksGrid) return;

    CacheManager.set('numDisks', disks.length);
    CacheManager.set('disks_data', disks, CACHE_EXPIRATION_MS);

    if (disks.length === 0) {
        disksGrid.innerHTML = '';
        disksGrid.style.display = 'none';
    } else {
        disksGrid.style.display = 'contents';
        disksGrid.innerHTML = '';

        disks.forEach(disk => {
            const bodyHtml = `
                <div class="card">
                <div class="card-header">
                    <h2>💾 ${disk.mountpoint}</h2>
                </div>
                <div class="card-body">
                    <div class="metric-main">
                        <span class="value">${disk.percent.toFixed(1)}</span>
                        <span class="unit">%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${disk.percent}%"></div>
                    </div>
                    <div class="metric-details">
                        <div>Used: ${formatBytes(disk.used)}</div>
                        <div>Free: ${formatBytes(disk.free)}</div>
                        <div>Total: ${formatBytes(disk.total)}</div>
                    </div>
                </div>
                </div>
            `;

            disksGrid.innerHTML += bodyHtml;
        });
    }
}

function updateUI(data, cache = true) {
    // CPU
    document.getElementById('cpu-percent').textContent = data.cpu.percent.toFixed(1);
    document.getElementById('cpu-progress').style.width = data.cpu.percent + '%';
    document.getElementById('cpu-count').textContent = data.cpu.count;
    
    // CPU Temp
    const cpuTempElement = document.getElementById('cpu-temp');
    if (data.cpu.temperature !== null && data.cpu.temperature !== undefined) {
        cpuTempElement.textContent = `${data.cpu.temperature}°C`;
    } else {
        cpuTempElement.textContent = 'N/A';
    }
    
    // RAM
    document.getElementById('ram-percent').textContent = data.memory.percent.toFixed(1);
    document.getElementById('ram-progress').style.width = data.memory.percent + '%';
    document.getElementById('ram-used').textContent = formatBytes(data.memory.used);
    document.getElementById('ram-total').textContent = formatBytes(data.memory.total);
    
    
    // Network
    document.getElementById('net-sent-speed').textContent = formatBytes(data.network.bytes_sent_per_sec) + '/s';
    document.getElementById('net-recv-speed').textContent = formatBytes(data.network.bytes_recv_per_sec) + '/s';
    document.getElementById('net-sent-total').textContent = formatBytes(data.network.bytes_sent);
    document.getElementById('net-recv-total').textContent = formatBytes(data.network.bytes_recv);
    
    // System info
    if (data.system) {
        document.getElementById('system-uptime').textContent = formatUptime(data.system.uptime_seconds);
        const bootDate = new Date(data.system.boot_time * 1000);
        document.getElementById('system-boot').textContent = bootDate.toLocaleString();
    }
    
    // Disks
    updateDisks(Array.isArray(data.disks) ? data.disks : []);
    
    lastUpdateTime = Date.now();
    updateTimeDisplay();

    if (cache) {
        saveStatsCache(data);
    }
}

function generateDiskPlaceholders(count) {
    const disksGrid = document.getElementById('disks-grid');
    if (!disksGrid) return;

    if (count === 0) {
        disksGrid.innerHTML = '';
        disksGrid.style.display = 'none';
    } else {
        disksGrid.style.display = 'contents';
        disksGrid.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const placeholderHtml = `
                <div class="card">
                    <div class="card-header">
                        <h2>💾 --</h2>
                    </div>
                    <div class="card-body">
                        <div class="metric-main">
                            <span class="value">--</span>
                            <span class="unit">%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="metric-details">
                            <div>Used: --</div>
                            <div>Free: --</div>
                            <div>Total: --</div>
                        </div>
                    </div>
                </div>
            `;
            disksGrid.innerHTML += placeholderHtml;
        }
    }
}

const numDisks = CacheManager.get('numDisks') || 1;
generateDiskPlaceholders(numDisks);

loadCachedStats();

connectSharedSocket((message) => {
    if (message.type === 'stats_update') {
        updateUI(message.data);
    }
});