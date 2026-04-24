importScripts('https://cdn.socket.io/4.5.4/socket.io.min.js');

let socket = null;
let lastStats = null;
let lastProjects = null;
const clients = [];

function broadcast(message) {
    clients.forEach(port => {
        try {
            port.postMessage(message);
        } catch (error) {
            console.error('SocketWorker broadcast error:', error);
        }
    });
}

function createSocket() {
    if (socket) {
        return;
    }

    try {
        socket = io();
    } catch (error) {
        broadcast({ type: 'error', error: `Socket worker init failed: ${error.message}` });
        return;
    }

    socket.on('connect', () => {
        broadcast({ type: 'connected' });
    });

    socket.on('disconnect', () => {
        broadcast({ type: 'disconnected' });
    });

    socket.on('stats_update', (data) => {
        lastStats = data;
        broadcast({ type: 'stats_update', data });
    });

    socket.on('projects_update', (data) => {
        lastProjects = data;
        broadcast({ type: 'projects_update', data });
    });

    socket.on('connect_error', (error) => {
        broadcast({ type: 'error', error: error?.message || String(error) });
    });
}

onconnect = function(event) {
    const port = event.ports[0];
    clients.push(port);

    port.onmessage = function(messageEvent) {
        const message = messageEvent.data;
        if (message && message.type === 'init') {
            createSocket();
            if (socket && socket.connected) {
                port.postMessage({ type: 'connected' });
            }
            if (lastStats) {
                port.postMessage({ type: 'stats_update', data: lastStats });
            }
            if (lastProjects) {
                port.postMessage({ type: 'projects_update', data: lastProjects });
            }
        }
    };

    port.start();
    createSocket();
};
