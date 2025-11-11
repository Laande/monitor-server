# Configuration - Add your systemd services here
SYSTEMD_SERVICES = [
    "hab-bot.service",
    "forum-pulse.service",
    "quote.service"
]

# Configuration - Add your files to monitor here
MONITORED_FILES = [
    # {'name': 'Application Log', 'path': '/var/log/myapp.log'},
    # {'name': 'Config File', 'path': '/etc/myapp/config.json'},
]