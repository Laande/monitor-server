SYSTEMD_SERVICES = [
    "your-stuff.service"
]

MONITORED_FILES = [
    {'name': 'A expanded file', 'path': '/home/your/path/file.log'},
    {'name': 'A non expanded file', 'path': '/home/your/path/file.txt', 'expand': False}
]
