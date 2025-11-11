import psutil
import time
import os
import subprocess


def get_stats() -> dict:
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


def get_systemd_status(service_name: str) -> dict:
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

        date = details.get('ActiveEnterTimestamp', '0')
        uptime_formatted = " ".join(date.split()[1:3])

        return {
            'name': service_name,
            'active': is_active,
            'status': details.get('ActiveState', 'unknown'),
            'uptime': uptime_formatted,
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


def get_file_info(file_config: dict) -> dict:
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


def get_projects_data(systemd_services: list, monitored_files: list) -> dict:
    services = [get_systemd_status(svc) for svc in systemd_services]
    files = [get_file_info(file) for file in monitored_files]

    return {
        'services': services,
        'files': files
    }
