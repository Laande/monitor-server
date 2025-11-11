from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO, emit
from utils import get_stats, get_projects_data, get_systemd_logs
from config import SYSTEMD_SERVICES, MONITORED_FILES

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

def background_loop():
    while True:
        stats = get_stats()
        projects_data = get_projects_data(SYSTEMD_SERVICES, MONITORED_FILES)
        socketio.emit('stats_update', stats, namespace='/')
        socketio.emit('projects_update', projects_data, namespace='/')
        socketio.sleep(5)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/projects')
def projects():
    return render_template('projects.html')

@app.route('/api/service/<service_name>/logs')
def get_service_logs(service_name):
    logs = get_systemd_logs(service_name)
    return jsonify({'logs': logs})

@socketio.on('connect')
def handle_connect():
    emit('stats_update', get_stats())
    emit('projects_update', get_projects_data(SYSTEMD_SERVICES, MONITORED_FILES, force_content=True))

if __name__ == '__main__':
    socketio.start_background_task(background_loop)
    if "--debug" in os.sys.argv:
        socketio.run(app, host='0.0.0.0', port=5500, debug=True)
    else:
        socketio.run(app, host='0.0.0.0', port=5500, allow_unsafe_werkzeug=True)
