from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from utils import get_stats, get_projects_data

app = Flask(__name__)
app.config['SECRET_KEY'] = 'monitoring-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

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


def background_stats():
    """Tâche de fond pour envoyer les stats système"""
    while True:
        stats = get_stats()
        socketio.emit('stats_update', stats, namespace='/')
        socketio.sleep(2)


def background_projects():
    """Tâche de fond pour envoyer les données des projets"""
    while True:
        projects_data = get_projects_data(SYSTEMD_SERVICES, MONITORED_FILES)
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
    emit('projects_update', get_projects_data(SYSTEMD_SERVICES, MONITORED_FILES))

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    socketio.start_background_task(background_stats)
    socketio.start_background_task(background_projects)
    socketio.run(app, host='0.0.0.0', port=5500, debug=True)
