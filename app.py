import os
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
from utils import get_stats, get_projects_data, get_systemd_logs, restart_systemd_service, git_pull_repo, get_systemd_status
from config import SYSTEMD_SERVICES, MONITORED_FILES

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

latest_stats = get_stats()
latest_projects = get_projects_data(SYSTEMD_SERVICES, MONITORED_FILES, force_content=True)

def update_latest_data():
    global latest_stats, latest_projects
    latest_stats = get_stats()
    latest_projects = get_projects_data(SYSTEMD_SERVICES, MONITORED_FILES, force_content=True)


def background_loop():
    while True:
        update_latest_data()
        socketio.emit('stats_update', latest_stats, namespace='/')
        socketio.emit('projects_update', latest_projects, namespace='/')
        socketio.sleep(2.5)

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

@app.route('/api/service/<service_name>/restart', methods=['POST'])
def restart_service(service_name):
    if service_name not in SYSTEMD_SERVICES:
        return jsonify({
            'success': False,
            'message': 'Service not authorized for restart'
        }), 403
    
    data = request.get_json()
    sudo_password = data.get('password', '')
    
    if not sudo_password:
        return jsonify({
            'success': False,
            'message': 'Sudo password is required'
        }), 400
    
    result = restart_systemd_service(service_name, sudo_password)
    status_code = 200 if result['success'] else 500
    return jsonify(result), status_code

@app.route('/api/service/<service_name>/git-pull', methods=['POST'])
def git_pull_service(service_name):
    if service_name not in SYSTEMD_SERVICES:
        return jsonify({
            'success': False,
            'message': 'Service not authorized'
        }), 403
    
    service_info = get_systemd_status(service_name)
    working_dir = service_info.get('working_directory', '')
    
    if not working_dir:
        return jsonify({
            'success': False,
            'message': 'No working directory found for this service'
        }), 400
    
    result = git_pull_repo(working_dir)
    status_code = 200 if result['success'] else 500
    return jsonify(result), status_code

@socketio.on('connect')
def handle_connect():
    emit('stats_update', latest_stats)
    emit('projects_update', latest_projects)

@socketio.on('request_update')
def handle_request_update():
    emit('stats_update', latest_stats)
    emit('projects_update', latest_projects)

@app.route('/api/stats')
def api_stats():
    return jsonify(latest_stats)

@app.route('/api/projects')
def api_projects():
    return jsonify(latest_projects)

if __name__ == '__main__':
    socketio.start_background_task(background_loop)
    if "--debug" in os.sys.argv:
        socketio.run(app, host='0.0.0.0', port=5500, debug=True)
    else:
        socketio.run(app, host='0.0.0.0', port=5500, allow_unsafe_werkzeug=True)
