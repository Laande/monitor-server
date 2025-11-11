# System Monitoring Dashboard

A real-time system monitoring dashboard built with Flask and Socket.IO. Monitor CPU, RAM, disk usage, network activity, systemd services, and custom files.

## Features

- **Real-time System Metrics**: CPU, RAM, disk, and network monitoring with live updates
- **Systemd Service Monitoring**: Track status, uptime, memory usage, and logs of systemd services
- **File Monitoring**: Monitor custom files with automatic content updates when files change
- **WebSocket Updates**: Real-time data updates every 5 seconds
- **Caching**: Client-side caching for seamless navigation between pages

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd system-monitoring
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure your services and files in `config.py`:
```python
SYSTEMD_SERVICES = [
    "your-service.service",
]

MONITORED_FILES = [
    {'name': 'Log File', 'path': '/path/to/file.log', 'expand': False},
]
```

## Configuration

### `config.py`

- **SYSTEMD_SERVICES**: List of systemd service names to monitor
- **MONITORED_FILES**: List of files to monitor with options:
  - `name`: Display name for the file
  - `path`: Absolute path to the file
  - `expand`: (optional) Set to `False` to collapse content by default

## Usage

Run the application:
```bash
python app.py
```

Access the dashboard at `http://localhost:5500`
