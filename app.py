from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import psutil
import time
from datetime import datetime, timedelta
from threading import Thread

app = Flask(__name__)
app.config['SECRET_KEY'] = 'monitoring-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

def get_gpu_info():
    """Try to get GPU info using different methods"""
    gpu_info = None
    
    try:
        import GPUtil
        gpus = GPUtil.getGPUs()
        if gpus:
            gpu = gpus[0]
            gpu_info = {
                'name': gpu.name,
                'load': gpu.load * 100,
                'memory_used': gpu.memoryUsed,
                'memory_total': gpu.memoryTotal,
                'memory_percent': (gpu.memoryUsed / gpu.memoryTotal) * 100 if gpu.memoryTotal > 0 else 0,
                'temperature': gpu.temperature
            }
    except:
        pass
    
    return gpu_info

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
    
    # GPU info
    gpu_info = get_gpu_info()
    
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
    
    if gpu_info:
        stats['gpu'] = gpu_info
    
    return stats

def background_stats():
    while True:
        stats = get_stats()
        socketio.emit('stats_update', stats, namespace='/')
        socketio.sleep(2)

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print('Client connecté')
    emit('stats_update', get_stats())

@socketio.on('disconnect')
def handle_disconnect():
    print('Client déconnecté')

if __name__ == '__main__':
    socketio.start_background_task(background_stats)
    socketio.run(app, host='0.0.0.0', port=5500, debug=True)
