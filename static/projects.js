const socket = io();
let lastUpdateTime = null;

function updateTimeDisplay() {
    document.getElementById('last-update').textContent = getTimeAgo(lastUpdateTime);
}

function formatMemory(memoryStr) {
    const bytes = parseInt(memoryStr);
    if (isNaN(bytes) || bytes === 0) return 'N/A';
    return formatBytes(bytes);
}

function loadCachedData() {
    const cached = localStorage.getItem('projects_data');
    if (cached) {
        const data = JSON.parse(cached);
        updateProjects(data);
    }
}

function renderServices(services) {
    const container = document.getElementById('services-list');
    
    if (!services || services.length === 0) {
        container.innerHTML = '<div class="empty-state">No services configured</div>';
        return;
    }
    
    container.innerHTML = services.map(service => `
        <div class="service-card ${service.active ? 'active' : 'inactive'}">
            <div class="service-header">
                <div class="service-status">
                    <span class="status-dot ${service.active ? 'active' : 'inactive'}"></span>
                    <span class="service-name">${service.name}</span>
                </div>
                <span class="service-state">${service.status}</span>
            </div>
            <div class="service-body">
                <div class="service-info">
                    <div class="info-row">
                        <span class="info-label">Description:</span>
                        <span class="info-value">${service.description || 'N/A'}</span>
                    </div>
                    ${service.memory ? `
                    <div class="info-row">
                        <span class="info-label">Memory:</span>
                        <span class="info-value">${formatMemory(service.memory)}</span>
                    </div>
                    ` : ''}
                    ${service.uptime && service.uptime !== 'N/A' ? `
                    <div class="info-row">
                        <span class="info-label">Started:</span>
                        <span class="info-value">${service.uptime}</span>
                    </div>
                    ` : ''}
                    ${service.error ? `
                    <div class="info-row error">
                        <span class="info-label">Error:</span>
                        <span class="info-value">${service.error}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function renderFiles(files) {
    const container = document.getElementById('files-list');
    
    if (!files || files.length === 0) {
        container.innerHTML = '<div class="empty-state">No files configured</div>';
        return;
    }
    
    container.innerHTML = files.map(file => `
        <div class="file-card ${file.exists ? 'exists' : 'missing'}">
            <div class="file-header">
                <div class="file-title">
                    <span class="file-icon">${file.exists ? '📄' : '❌'}</span>
                    <span class="file-name">${file.name}</span>
                </div>
                ${file.exists ? `<span class="file-size">${formatBytes(file.size)}</span>` : ''}
            </div>
            <div class="file-path">${file.path}</div>
            ${file.exists ? `
                <div class="file-modified">
                    Last modified: ${new Date(file.modified * 1000).toLocaleString()}
                </div>
                <div class="file-content">
                    <pre>${file.content}</pre>
                </div>
            ` : `
                <div class="file-error">${file.error || 'File not found'}</div>
            `}
        </div>
    `).join('');
}

function updateProjects(data) {
    // Sauvegarder en cache
    localStorage.setItem('projects_data', JSON.stringify(data));
    
    renderServices(data.services);
    renderFiles(data.files);
    
    lastUpdateTime = Date.now();
    updateTimeDisplay();
}

// Charger les données en cache au démarrage
loadCachedData();

socket.on('connect', () => {
    console.log('WebSocket connected');
});

socket.on('projects_update', (data) => {
    updateProjects(data);
});

socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
});

setInterval(updateTimeDisplay, 1000);
