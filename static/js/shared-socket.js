function connectSharedSocket(onMessage) {
    if (!window.sharedSocketClient) {
        window.sharedSocketClient = {
            listeners: new Set(),
            port: null,
            socket: null,
            init() {
                if (window.SharedWorker) {
                    try {
                        const worker = new SharedWorker('/static/js/socket-worker.js');
                        this.port = worker.port;
                        this.port.onmessage = (event) => {
                            this.listeners.forEach((listener) => listener(event.data));
                        };
                        this.port.start();
                        this.port.postMessage({ type: 'init' });
                    } catch (error) {
                        console.warn('SharedWorker init failed, falling back to direct socket:', error);
                        this.initFallback();
                    }
                } else {
                    this.initFallback();
                }
            },
            initFallback() {
                if (typeof io === 'undefined') {
                    console.error('socket.io client is not available for fallback connection.');
                    return;
                }
                this.socket = io();
                this.socket.on('connect', () => this.broadcast({ type: 'connected' }));
                this.socket.on('disconnect', () => this.broadcast({ type: 'disconnected' }));
                this.socket.on('stats_update', (data) => this.broadcast({ type: 'stats_update', data }));
                this.socket.on('projects_update', (data) => this.broadcast({ type: 'projects_update', data }));
                this.socket.on('connect_error', (error) => this.broadcast({ type: 'error', error: error?.message || String(error) }));
            },
            broadcast(message) {
                this.listeners.forEach((listener) => listener(message));
            }
        };
        window.sharedSocketClient.init();
    }

    window.sharedSocketClient.listeners.add(onMessage);
    return () => window.sharedSocketClient.listeners.delete(onMessage);
}
