import os
import json
import jwt
import requests
from datetime import datetime, timedelta
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, send_from_directory

load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['JSON_SORT_KEYS'] = False

PORT = int(os.getenv('PORT', 8000))
APPS_SCRIPT_URL = os.getenv('APPS_SCRIPT_URL')
ADMIN_SECRET = os.getenv('ADMIN_SECRET')
JWT_SECRET = os.getenv('JWT_SECRET')

if not APPS_SCRIPT_URL or not ADMIN_SECRET or not JWT_SECRET:
    raise ValueError('ERRO: APPS_SCRIPT_URL, ADMIN_SECRET e JWT_SECRET devem estar definidas no .env')

def require_jwt(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.args.get('token') or request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'status': 'error', 'message': 'Token ausente'}), 401
        try:
            jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        except jwt.InvalidTokenError:
            return jsonify({'status': 'error', 'message': 'Token inválido'}), 401
        return f(*args, **kwargs)
    return decorated

@app.before_request
def block_admin_html():
    if request.path == '/admin.html':
        return 'Not found', 404

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
def admin():
    if request.args.get('secret') != ADMIN_SECRET:
        return 'Acesso negado.', 401
    token = jwt.encode({'exp': datetime.utcnow() + timedelta(hours=8)}, JWT_SECRET, algorithm='HS256')
    return render_template('admin.html', token=token)

@app.route('/api', methods=['GET'])
def api():
    response = app.make_response(jsonify({}))
    response.headers['Cache-Control'] = 'no-store'
    response.headers['Pragma'] = 'no-cache'
    
    allowed = ['login', 'getData', 'submit', 'deleteRow', 'clearAll']
    action = request.args.get('action')
    
    if not action or action not in allowed:
        return jsonify({'status': 'error', 'message': 'Ação inválida.'}), 400
    
    if action in ['deleteRow', 'clearAll']:
        token = request.args.get('token') or request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'status': 'error', 'message': 'Token ausente'}), 401
        try:
            jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        except jwt.InvalidTokenError:
            return jsonify({'status': 'error', 'message': 'Token inválido'}), 401
    
    params = dict(request.args)
    
    try:
        resp = requests.get(APPS_SCRIPT_URL, params=params, timeout=25)
        resp.raise_for_status()
        
        body = resp.text
        if body.startswith('/*') and body.endswith('*/'):
            body = body[2:-2].strip()
        if body.startswith('(') and body.endswith(')'):
            body = body[1:-1]
        
        try:
            data = json.loads(body)
            if isinstance(data, str):
                data = json.loads(data)
        except json.JSONDecodeError as e:
            return jsonify({'status': 'error', 'message': f'Resposta inválida: {str(e)}'}), 500
        
        return jsonify(data)
    except requests.Timeout:
        return jsonify({'status': 'error', 'message': 'Tempo limite excedido.'}), 504
    except requests.RequestException as e:
        return jsonify({'status': 'error', 'message': f'Erro ao conectar: {str(e)}'}), 502

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

@app.route('/brazao.jpg')
def brazao():
    import os.path
    if os.path.exists('brazao.jpg'):
        return send_from_directory('.', 'brazao.jpg')
    return send_from_directory('static', 'brazao.jpg')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=False)
