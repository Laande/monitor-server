let lastUpdateTime = null;
let logsRefreshInterval = null;
let currentLogService = null;
let logsRequestToken = 0;
let lastServices = null;
let projectsCacheStored = false;
let expandedStates = {
    services: {},
    files: {}
};

const CACHE_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes
const transientButtons = new Map();

function updateTimeDisplay() {
    document.getElementById('last-update').textContent = getTimeAgo(lastUpdateTime);
}

function formatMemory(memoryStr) {
    const bytes = parseInt(memoryStr);
    if (isNaN(bytes) || bytes === 0) return 'N/A';
    return formatBytes(bytes);
}

function loadCachedData() {
    const cached = CacheManager.get('projects_data');
    if (cached) {
        updateProjects(cached);
    }
}

async function fetchInitialProjects() {
    try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        updateProjects(data);
    } catch (error) {
        console.warn('Initial projects fetch failed:', error);
    }
}

function closeLogsModal() {
    const modal = document.getElementById('logs-modal');
    modal.style.display = 'none';
    
    if (logsRefreshInterval) {
        clearInterval(logsRefreshInterval);
        logsRefreshInterval = null;
    }
    currentLogService = null;
    logsRequestToken++;
}

function renderLogsError(message) {
    const modalContent = document.getElementById('modal-content');
    const box = document.createElement('div');
    box.className = 'file-error';
    box.textContent = `Failed to load logs: ${message}`;
    modalContent.replaceChildren(box);
}

function ensureLogHost() {
    const modalContent = document.getElementById('modal-content');
    let pre = modalContent.querySelector('pre[data-text]');
    if (!pre) {
        pre = document.createElement('pre');
        pre.setAttribute('data-text', '');
        modalContent.replaceChildren(pre);
    }
    return pre;
}

async function fetchAndUpdateLogs(serviceName) {
    const modalContent = document.getElementById('modal-content');
    const preElement = ensureLogHost();

    const previousScrollTop = modalContent.scrollTop;
    const wasAtBottom =
        (modalContent.scrollHeight - previousScrollTop - modalContent.clientHeight) < 50;

    const token = ++logsRequestToken;

    try {
        const response = await fetch(`/api/service/${serviceName}/logs`);
        const data = await response.json();

        if (token !== logsRequestToken) return;

        SmoothRender.text(preElement, data.logs);

        modalContent.scrollTop = wasAtBottom ? modalContent.scrollHeight : previousScrollTop;
    } catch (error) {
        if (token !== logsRequestToken) return;
        renderLogsError(error.message);
    }
}

async function showServiceLogs(serviceName) {
    const modal = document.getElementById('logs-modal');
    const modalTitle = document.getElementById('modal-title');

    currentLogService = serviceName;
    modalTitle.textContent = `Logs - ${serviceName}`;

    const pre = ensureLogHost();
    pre.textContent = '⏳ Loading...';
    SmoothRender.invalidate(pre);
    modal.style.display = 'flex';

    if (logsRefreshInterval) {
        clearInterval(logsRefreshInterval);
        logsRefreshInterval = null;
    }

    await fetchAndUpdateLogs(serviceName);

    if (currentLogService !== serviceName) return;

    logsRefreshInterval = setInterval(() => {
        if (currentLogService === serviceName) {
            fetchAndUpdateLogs(serviceName);
        }
    }, 3000);
}

function applyTransientButtons() {
    document.querySelectorAll('#services-list [data-btn-key]').forEach(button => {
        const state = transientButtons.get(button.dataset.btnKey);
        if (!state) return;
        button.textContent = state.text;
        button.disabled = true;
        button.style.backgroundColor = state.color;
    });
}

function setButtonState(btnKey, text, color) {
    if (text === null) {
        transientButtons.delete(btnKey);
        SmoothRender.invalidate(document.getElementById('services-list'));
        renderServices(lastServices);
        return;
    }
    transientButtons.set(btnKey, { text: text, color: color });
    applyTransientButtons();
}

async function restartService(serviceName, event) {
    event.stopPropagation();
    
    if (!confirm(`Are you sure you want to restart the service "${serviceName}"?`)) {
        return;
    }
    
    const password = prompt(`Enter sudo password to restart ${serviceName}:`);
    if (!password) {
        return;
    }
    
    const btnKey = `restart:${serviceName}`;
    setButtonState(btnKey, '⏳ Restarting...', '');
    
    try {
        const response = await fetch(`/api/service/${serviceName}/restart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            setButtonState(btnKey, '✅ Restarted', '#10b981');
        } else {
            setButtonState(btnKey, '❌ Error', '#ef4444');
            alert(`Error restarting service: ${result.message}`);
        }
    } catch (error) {
        setButtonState(btnKey, '❌ Error', '#ef4444');
        alert(`Error: ${error.message}`);
    }
    
    setTimeout(() => setButtonState(btnKey, null), 3000);
}

function renderServices(services) {
    const container = document.getElementById('services-list');
    lastServices = services;
    
    if (!services || services.length === 0) {
        return SmoothRender.render(container, '<div class="empty-state">No services configured</div>');
    }
    
    const html = services.map(service => {
        const gitStatus = service.git_status;
        let gitButtonHtml = '';
        
        if (gitStatus && gitStatus.has_repo) {
            if (gitStatus.error) {
                gitButtonHtml = `<button class="git-btn git-error" data-btn-key="git:${escapeAttr(service.name)}" disabled>⚠️ Git Error</button>`;
            } else if (gitStatus.has_updates) {
                gitButtonHtml = `<button class="git-btn git-updates" data-btn-key="git:${escapeAttr(service.name)}" onclick="gitPullService('${escapeAttr(service.name)}', event)">⬇️ Pull Updates</button>`;
            } else if (gitStatus.up_to_date) {
                gitButtonHtml = `<button class="git-btn git-uptodate" data-btn-key="git:${escapeAttr(service.name)}" disabled>✅ Up to date</button>`;
            }
        }
        
        return `
        <div class="service-card ${service.active ? 'active' : 'inactive'}" data-key="service:${escapeAttr(service.name)}">
            <div class="service-header">
                <div class="service-status">
                    <span class="status-dot ${service.active ? 'active' : 'inactive'}"></span>
                    <span class="service-name">${escapeHtml(service.name)}</span>
                </div>
                <span class="service-state">${escapeHtml(service.status)}</span>
            </div>
            <div class="service-body">
                <div class="service-info">
                    <div class="info-row">
                        <span class="info-label">Description:</span>
                        <span class="info-value">${escapeHtml(service.description || 'N/A')}</span>
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
                        <span class="info-value">${escapeHtml(service.uptime)}</span>
                    </div>
                    ` : ''}
                    ${service.working_directory ? `
                    <div class="info-row">
                        <span class="info-label">Directory:</span>
                        <span class="info-value">${escapeHtml(service.working_directory)}</span>
                    </div>
                    ` : ''}
                    ${service.error ? `
                    <div class="info-row error">
                        <span class="info-label">Error:</span>
                        <span class="info-value">${escapeHtml(service.error)}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="service-actions">
                    <button class="toggle-logs-btn full-width" onclick="showServiceLogs('${escapeAttr(service.name)}')">
                        📋 Logs
                    </button>
                    <div class="action-row">
                        <button class="restart-btn" data-btn-key="restart:${escapeAttr(service.name)}" onclick="restartService('${escapeAttr(service.name)}', event)">
                            🔄 Restart
                        </button>
                        ${gitButtonHtml}
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    const changed = SmoothRender.render(container, html);
    applyTransientButtons();
    return changed;
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

function escapeAttr(text) {
    return escapeHtml(String(text)).replace(/`/g, '&#96;');
}

function renderFiles(files) {
    const container = document.getElementById('files-list');
    
    if (!files || files.length === 0) {
        return SmoothRender.render(container, '<div class="empty-state">No files configured</div>');
    }
    
    const html = files.map((file, index) => {
        if (file.content !== null && file.content !== undefined) {
            filesCache[index] = file.content;
        }
        
        const defaultExpanded = file.expand !== false;
        const currentlyExpanded = expandedStates.files[index] !== undefined ? expandedStates.files[index] : defaultExpanded;
        
        return `
        <div class="file-card ${file.exists ? 'exists' : 'missing'} ${currentlyExpanded ? 'expanded' : ''}" 
             id="file-card-${index}"
             data-key="file:${escapeAttr(file.path || file.name)}"
             ${file.exists ? `onclick="toggleFileContent(${index}, event)" style="cursor: pointer;"` : ''}>
            <div class="file-header">
                <div class="file-title">
                    <span class="file-icon">${file.exists ? '📄' : '❌'}</span>
                    <span class="file-name">${escapeHtml(file.name)}</span>
                </div>
                ${file.exists ? `<span class="file-size">${formatBytes(file.size)}</span>` : ''}
            </div>
            <div class="file-path">${escapeHtml(file.path)}</div>
            ${file.exists ? `
                <div class="file-modified">
                    Last modified: ${new Date(file.modified * 1000).toLocaleString()}
                </div>
                <div class="file-content" id="file-content-${index}" style="display: ${currentlyExpanded ? 'block' : 'none'};">
                    <pre data-text></pre>
                </div>
            ` : `
                <div class="file-error">${escapeHtml(file.error || 'File not found')}</div>
            `}
        </div>
        `;
    }).join('');
    
    let changed = SmoothRender.render(container, html);
    
    files.forEach((file, index) => {
        if (!file.exists) return;
        const pre = document.getElementById(`file-content-${index}`)?.firstElementChild;
        if (pre) {
            changed = SmoothRender.text(pre, filesCache[index] || '') || changed;
        }
    });
    
    return changed;
}

function updateProjects(data) {
    const servicesChanged = renderServices(data.services);
    const filesChanged = renderFiles(data.files);
    
    if (servicesChanged || filesChanged || !projectsCacheStored) {
        CacheManager.set('projects_data', data, CACHE_EXPIRATION_MS);
        projectsCacheStored = true;
    }
    
    lastUpdateTime = Date.now();
    updateTimeDisplay();
}

loadCachedData();
fetchInitialProjects();

connectSharedSocket((message) => {
    if (message.type === 'projects_update') {
        updateProjects(message.data);
    }
});

setInterval(updateTimeDisplay, 1000);


async function gitPullService(serviceName, event) {
    event.stopPropagation();
    
    if (!confirm(`Pull latest changes for "${serviceName}"?`)) {
        return;
    }
    
    const btnKey = `git:${serviceName}`;
    setButtonState(btnKey, '⏳ Pulling...', '');
    
    try {
        const response = await fetch(`/api/service/${serviceName}/git-pull`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: '' })
        });
        
        const result = await response.json();
        
        if (result.success) {
            setButtonState(btnKey, '✅ Pulled', '#10b981');
        } else {
            setButtonState(btnKey, '❌ Error', '#ef4444');
            alert(`Error pulling changes: ${result.message}`);
        }
    } catch (error) {
        setButtonState(btnKey, '❌ Error', '#ef4444');
        alert(`Error: ${error.message}`);
    }
    
    setTimeout(() => setButtonState(btnKey, null), 3000);
}
