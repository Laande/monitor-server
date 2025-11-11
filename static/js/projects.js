const socket = io();
let lastUpdateTime = null;
let expandedStates = {
    services: {},
    files: {}
};

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

function closeLogsModal() {
    const modal = document.getElementById('logs-modal');
    modal.style.display = 'none';
}

async function showServiceLogs(serviceName) {
    const modal = document.getElementById('logs-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    
    modalTitle.textContent = `Logs - ${serviceName}`;
    modalContent.innerHTML = '<div style="text-align: center; padding: 40px;">⏳ Loading...</div>';
    modal.style.display = 'flex';
    
    try {
        const response = await fetch(`/api/service/${serviceName}/logs`);
        const data = await response.json();
        modalContent.innerHTML = `<pre>${data.logs}</pre>`;
    } catch (error) {
        modalContent.innerHTML = `<div class="file-error">Failed to load logs: ${error.message}</div>`;
    }
}

function renderServices(services) {
    const container = document.getElementById('services-list');
    
    if (!services || services.length === 0) {
        container.innerHTML = '<div class="empty-state">No services configured</div>';
        return;
    }
    
    container.innerHTML = services.map(service => {
        return `
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
                <button class="toggle-logs-btn" onclick="showServiceLogs('${service.name}')">
                    📋 Show logs
                </button>
            </div>
        </div>
        `;
    }).join('');
}

function toggleFileContent(index, event) {
    const clickedElement = event.target;
    
    if (clickedElement.tagName === 'PRE' || 
        clickedElement.tagName === 'SPAN' ||
        clickedElement.closest('pre') ||
        clickedElement.closest('.file-content')) {
        return;
    }
    
    const content = document.getElementById(`file-content-${index}`);
    const card = document.getElementById(`file-card-${index}`);
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        card.classList.add('expanded');
        expandedStates.files[index] = true;
    } else {
        content.style.display = 'none';
        card.classList.remove('expanded');
        expandedStates.files[index] = false;
    }
}

let filesCache = {};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderFiles(files) {
    const container = document.getElementById('files-list');
    
    if (!files || files.length === 0) {
        container.innerHTML = '<div class="empty-state">No files configured</div>';
        return;
    }
    
    container.innerHTML = files.map((file, index) => {
        const isExpanded = expandedStates.files[index] || false;
        
        let displayContent = '';
        if (file.content !== null && file.content !== undefined) {
            filesCache[index] = file.content;
            displayContent = file.content;
        } else if (filesCache[index]) {
            displayContent = filesCache[index];
        }
        
        const escapedContent = escapeHtml(displayContent);
        
        const defaultExpanded = file.expand !== false;
        const currentlyExpanded = expandedStates.files[index] !== undefined ? expandedStates.files[index] : defaultExpanded;
        
        return `
        <div class="file-card ${file.exists ? 'exists' : 'missing'} ${currentlyExpanded ? 'expanded' : ''}" 
             id="file-card-${index}"
             ${file.exists ? `onclick="toggleFileContent(${index}, event)" style="cursor: pointer;"` : ''}>
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
                <div class="file-content" id="file-content-${index}" style="display: ${currentlyExpanded ? 'block' : 'none'};">
                    <pre>${escapedContent}</pre>
                </div>
            ` : `
                <div class="file-error">${file.error || 'File not found'}</div>
            `}
        </div>
        `;
    }).join('');
}

function updateProjects(data) {
    localStorage.setItem('projects_data', JSON.stringify(data));
    renderServices(data.services);
    renderFiles(data.files);
    lastUpdateTime = Date.now();
    updateTimeDisplay();
}

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
