import os
import json
import jwt
import requests
from datetime import datetime, timezone, timedelta
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_compress import Compress

load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['JSON_SORT_KEYS'] = False
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 31536000  # Cache de 1 ano para arquivos estáticos
Compress(app)

PORT = int(os.getenv('PORT', 8000))
APPS_SCRIPT_URL = os.getenv('APPS_SCRIPT_URL')
ADMIN_SECRET = os.getenv('ADMIN_SECRET')
JWT_SECRET = os.getenv('JWT_SECRET')
APPS_SCRIPT_KEY = os.getenv('APPS_SCRIPT_KEY')

if not APPS_SCRIPT_URL or not ADMIN_SECRET or not JWT_SECRET or not APPS_SCRIPT_KEY:
    raise ValueError('ERRO: APPS_SCRIPT_URL, ADMIN_SECRET, JWT_SECRET e APPS_SCRIPT_KEY devem estar definidas')

# Session para reutilizar conexões HTTP
session = requests.Session()

def require_jwt(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
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
    token = jwt.encode({'exp': datetime.now(timezone.utc) + timedelta(hours=8)}, JWT_SECRET, algorithm='HS256')
    return render_template('admin.html', token=token)

@app.route('/api', methods=['GET', 'POST'])
def api():
    response = app.make_response(jsonify({}))
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    
    allowed = ['login', 'getData', 'submit', 'deleteRow', 'clearAll']
    action = request.args.get('action') or request.form.get('action')
    
    if not action or action not in allowed:
        response.data = json.dumps({'status': 'error', 'message': 'Ação inválida.'})
        response.status_code = 400
        return response
    
    if action in ['getData', 'deleteRow', 'clearAll']:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            response.data = json.dumps({'status': 'error', 'message': 'Token ausente'})
            response.status_code = 401
            return response
        try:
            jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        except jwt.InvalidTokenError:
            response.data = json.dumps({'status': 'error', 'message': 'Token inválido'})
            response.status_code = 401
            return response
    
    if action == 'submit':
        idade = request.args.get('idadeJovem') or request.form.get('idadeJovem')
        lgpd = request.args.get('lgpd') or request.form.get('lgpd')
        try:
            idade_int = int(idade)
            if idade_int < 7 or idade_int > 11:
                response.data = json.dumps({'status': 'error', 'message': 'Idade inválida'})
                response.status_code = 400
                return response
        except (ValueError, TypeError):
            response.data = json.dumps({'status': 'error', 'message': 'Idade inválida'})
            response.status_code = 400
            return response
        
        if lgpd != 'true':
            response.data = json.dumps({'status': 'error', 'message': 'LGPD não aceita'})
            response.status_code = 400
            return response
    
    params = dict(request.args)
    params.update(dict(request.form))
    params['key'] = APPS_SCRIPT_KEY
    
    try:
        resp = session.get(APPS_SCRIPT_URL, params=params, timeout=25)
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
            response.data = json.dumps({'status': 'error', 'message': f'Resposta inválida: {str(e)}'})
            response.status_code = 500
            return response
        
        response.data = json.dumps(data)
        response.headers['Content-Type'] = 'application/json'
        return response
    except requests.Timeout:
        response.data = json.dumps({'status': 'error', 'message': 'Tempo limite excedido.'})
        response.status_code = 504
        return response
    except requests.RequestException as e:
        response.data = json.dumps({'status': 'error', 'message': f'Erro ao conectar: {str(e)}'})
        response.status_code = 502
        return response

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
