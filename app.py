from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import psutil
import time
import os
import subprocess
from datetime import datetime, timedelta
from threading import Thread

app = Flask(__name__)
app.config['SECRET_KEY'] = 'monitoring-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# Configuration - Add your systemd services here
SYSTEMD_SERVICES = [
    # 'nginx',
    # 'docker',
    # 'postgresql',
]

# Configuration - Add your files to monitor here
MONITORED_FILES = [
    # {'name': 'Application Log', 'path': '/var/log/myapp.log'},
    # {'name': 'Config File', 'path': '/etc/myapp/config.json'},
]

def get_stats():
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_count = psutil.cpu_count()
    cpu_freq = psutil.cpu_freq()
    
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    net_io = psutil.net_io_counters()
    
    # System uptime
    boot_time = psutil.boot_time()
    uptime_seconds = time.time() - boot_time
    
    stats = {
        'cpu': {
            'percent': cpu_percent,
            'count': cpu_count,
            'freq': cpu_freq.current if cpu_freq else 0
        },
        'memory': {
            'total': memory.total,
            'used': memory.used,
            'percent': memory.percent,
            'available': memory.available
        },
        'disk': {
            'total': disk.total,
            'used': disk.used,
            'free': disk.free,
            'percent': disk.percent
        },
        'network': {
            'bytes_sent': net_io.bytes_sent,
            'bytes_recv': net_io.bytes_recv,
            'packets_sent': net_io.packets_sent,
            'packets_recv': net_io.packets_recv
        },
        'system': {
            'boot_time': boot_time,
            'uptime_seconds': uptime_seconds
        }
    }
    
    return stats

def background_stats():
    while True:
        stats = get_stats()
        socketio.emit('stats_update', stats, namespace='/')
        socketio.sleep(2)

def get_systemd_status(service_name):
    """Get systemd service status"""
    try:
        result = subprocess.run(
            ['systemctl', 'is-active', service_name],
            capture_output=True,
            text=True,
            timeout=2
        )
        is_active = result.stdout.strip() == 'active'
        
        # Get more details
        result = subprocess.run(
            ['systemctl', 'show', service_name, '--no-page'],
            capture_output=True,
            text=True,
            timeout=2
        )
        
        details = {}
        for line in result.stdout.split('\n'):
            if '=' in line:
                key, value = line.split('=', 1)
                details[key] = value
        
        return {
            'name': service_name,
            'active': is_active,
            'status': details.get('ActiveState', 'unknown'),
            'uptime': details.get('ActiveEnterTimestamp', 'N/A'),
            'memory': details.get('MemoryCurrent', '0'),
            'description': details.get('Description', service_name)
        }
    except Exception as e:
        return {
            'name': service_name,
            'active': False,
            'status': 'error',
            'error': str(e)
        }

def get_file_info(file_config):
    """Get file information"""
    try:
        path = file_config['path']
        if not os.path.exists(path):
            return {
                'name': file_config['name'],
                'path': path,
                'exists': False,
                'error': 'File not found'
            }
        
        stat = os.stat(path)
        size = stat.st_size
        modified = stat.st_mtime
        
        # Read last N lines
        content = ''
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                content = ''.join(lines[-50:])  # Last 50 lines
        except:
            content = 'Unable to read file content'
        
        return {
            'name': file_config['name'],
            'path': path,
            'exists': True,
            'size': size,
            'modified': modified,
            'content': content
        }
    except Exception as e:
        return {
            'name': file_config['name'],
            'path': file_config.get('path', 'unknown'),
            'exists': False,
            'error': str(e)
        }

def get_projects_data():
    """Get all projects data"""
    services = [get_systemd_status(svc) for svc in SYSTEMD_SERVICES]
    files = [get_file_info(file) for file in MONITORED_FILES]
    
    return {
        'services': services,
        'files': files
    }

def background_projects():
    while True:
        projects_data = get_projects_data()
        socketio.emit('projects_update', projects_data, namespace='/')
        socketio.sleep(5)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/projects')
def projects():
    return render_template('projects.html')

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('stats_update', get_stats())
    emit('projects_update', get_projects_data())

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    socketio.start_background_task(background_stats)
    socketio.start_background_task(background_projects)
    socketio.run(app, host='0.0.0.0', port=5500, debug=True)
