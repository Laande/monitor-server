# Linux System Monitoring

Web application for monitoring system resources on your Linux machine.

## Features

- Real-time monitoring of CPU, RAM, disk and bandwidth
- WebSocket-based live updates (no polling)

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python app.py
```

3. Open your browser at: http://localhost:5500

## Technology Stack

- Flask + Flask-SocketIO for WebSocket communication
- psutil for system metrics
- Vanilla JavaScript for frontend