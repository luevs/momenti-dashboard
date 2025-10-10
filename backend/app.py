from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from werkzeug.utils import secure_filename
from datetime import datetime
import uuid
from ocr_service import OCRService
import json
from flask import Response
import cv2
import pytesseract

# Ensure pytesseract can find Tesseract on Windows for raw endpoints
try:
    if os.name == 'nt':
        pytesseract.pytesseract.tesseract_cmd = r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"
except Exception:
    pass

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Crear aplicación Flask
app = Flask(__name__)
CORS(app, origins=['*'])  # Permitir requests desde cualquier origen (desarrollo)

# Configuración
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Crear directorio de uploads si no existe
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Inicializar servicio OCR
ocr_service = OCRService(logger)

def allowed_file(filename):
    """Verifica si el archivo tiene una extensión permitida"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_job_id():
    """Genera un ID único para el trabajo"""
    return f"JOB-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint de health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'OCR Service'
    })

@app.route('/test', methods=['GET'])
def test_page():
    """Página de prueba para OCR"""
    return """
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🧪 Test OCR Service</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .upload-area { border: 3px dashed #007bff; border-radius: 10px; padding: 40px; text-align: center; margin: 20px 0; cursor: pointer; transition: all 0.3s; }
        .upload-area:hover { border-color: #0056b3; background-color: #f8f9fa; }
        .upload-area.dragover { border-color: #28a745; background-color: #d4edda; }
        .result { margin-top: 20px; padding: 15px; border-radius: 5px; }
        .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .info { background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        button { background-color: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 5px; }
        button:hover { background-color: #0056b3; }
        button:disabled { background-color: #6c757d; cursor: not-allowed; }
        pre { background-color: #f1f1f1; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px; }
        .file-info { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .preview-img { max-width: 100%; max-height: 300px; border: 2px solid #dee2e6; border-radius: 5px; margin: 10px 0; }
        .status { padding: 10px; border-radius: 5px; margin: 10px 0; font-weight: bold; }
        .ocr-results { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Test Servidor OCR Flask</h1>
        <p>Prueba el servidor OCR independientemente del frontend React</p>
        
        <!-- Health Check -->
        <div>
            <h2>1. 🏥 Health Check</h2>
            <button onclick="testHealth()">Probar Conexión</button>
            <div id="healthResult" class="result" style="display: none;"></div>
        </div>

        <!-- OCR Upload -->
        <div>
            <h2>2. 📸 Procesamiento OCR</h2>
            <div class="upload-area" id="uploadArea" onclick="document.getElementById('fileInput').click()">
                <div id="uploadText">
                    <h3>📁 Seleccionar Imagen</h3>
                    <p>Haz clic aquí o arrastra tu captura de trabajo</p>
                    <small>Formatos: PNG, JPG, GIF, BMP | Máximo: 16MB</small>
                </div>
            </div>
            <input type="file" id="fileInput" accept="image/*" style="display: none;">
            
            <div id="fileInfo" class="file-info" style="display: none;">
                <h4>📄 Archivo seleccionado:</h4>
                <p><strong>Nombre:</strong> <span id="fileName"></span></p>
                <p><strong>Tamaño:</strong> <span id="fileSize"></span></p>
                <img id="preview" class="preview-img" style="display: none;">
                <br>
                <button id="uploadBtn" onclick="uploadFile()" disabled>🚀 Procesar con OCR (JSON)</button>
                <button id="uploadPlainBtn" onclick="uploadPlain()" disabled>📝 OCR Simple (texto plano)</button>
                <button onclick="clearFile()">🗑️ Limpiar</button>
            </div>
            
            <div id="uploadResult" class="result" style="display: none;"></div>
            <div id="plainTextResult" class="result" style="display: none;"></div>
        </div>

        <div class="info">
            <h3>ℹ️ Información</h3>
            <p><strong>Servidor:</strong> http://localhost:5000</p>
            <p><strong>Estado:</strong> <span id="serverStatus">Verificando...</span></p>
        </div>
    </div>

    <script>
        let selectedFile = null;

        // Auto health check al cargar
        window.onload = function() {
            testHealth();
            setupDragAndDrop();
        };

        function setupDragAndDrop() {
            const uploadArea = document.getElementById('uploadArea');
            const fileInput = document.getElementById('fileInput');

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
            });

            uploadArea.addEventListener('drop', handleDrop, false);
            fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
        }

        function handleDrop(e) {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        }

        async function testHealth() {
            const resultDiv = document.getElementById('healthResult');
            const statusSpan = document.getElementById('serverStatus');
            
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '⏳ Verificando servidor...';
            resultDiv.className = 'result info';
            statusSpan.textContent = 'Verificando...';

            try {
                const response = await fetch('http://localhost:5000/health');
                const data = await response.json();
                
                resultDiv.innerHTML = `
                    <h3>✅ Servidor Flask funcionando correctamente</h3>
                    <p><strong>Estado:</strong> ${data.status}</p>
                    <p><strong>Servicio:</strong> ${data.service}</p>
                    <p><strong>Timestamp:</strong> ${data.timestamp}</p>
                `;
                resultDiv.className = 'result success';
                statusSpan.textContent = '🟢 Online';
                
            } catch (error) {
                resultDiv.innerHTML = `
                    <h3>❌ Error de conexión</h3>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <div class="status error">
                        <p>🚨 <strong>Solución:</strong></p>
                        <ol>
                            <li>Verifica que el servidor Flask esté ejecutándose</li>
                            <li>Ve a la terminal y ejecuta: <code>python app.py</code></li>
                            <li>Verifica que veas: "Running on http://127.0.0.1:5000"</li>
                        </ol>
                    </div>
                `;
                resultDiv.className = 'result error';
                statusSpan.textContent = '🔴 Offline';
            }
        }

        function handleFileSelect(file) {
            if (!file) return;

            // Validar tipo
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp'];
            if (!allowedTypes.includes(file.type)) {
                alert('❌ Tipo de archivo no válido. Use PNG, JPG, GIF o BMP.');
                return;
            }

            // Validar tamaño (16MB)
            if (file.size > 16 * 1024 * 1024) {
                alert('❌ Archivo demasiado grande. Máximo 16MB.');
                return;
            }

            selectedFile = file;
            
            // Mostrar info
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('fileSize').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
            document.getElementById('fileInfo').style.display = 'block';
            
            // Preview
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('preview');
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
            
            // Habilitar botón
            document.getElementById('uploadBtn').disabled = false;
            document.getElementById('uploadPlainBtn').disabled = false;
        }

        async function uploadFile() {
            if (!selectedFile) return;

            const resultDiv = document.getElementById('uploadResult');
            const uploadBtn = document.getElementById('uploadBtn');
            
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '⏳ Subiendo y procesando imagen con OCR...';
            resultDiv.className = 'result info';
            uploadBtn.disabled = true;
            uploadBtn.textContent = '⏳ Procesando...';

            try {
                const formData = new FormData();
                formData.append('preview', selectedFile);

                const response = await fetch('http://localhost:5000/api/upload-preview', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
                }

                const data = await response.json();
                const ocr = data.ocr_results;
                const jobs = Array.isArray(data.jobs) ? data.jobs : [];
                
                resultDiv.innerHTML = `
                    <div class="ocr-results">
                        <h3>✅ OCR Completado Exitosamente</h3>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                            <div>
                                <h4>📊 Información Extraída:</h4>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Cliente:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${ocr.client_name || '❌ No detectado'}</td></tr>
                                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Cantidad:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${ocr.quantity || '❌ No detectado'}</td></tr>
                                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Material:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${ocr.material || '❌ No detectado'}</td></tr>
                                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Tamaño:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${ocr.size || '❌ No detectado'}</td></tr>
                                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Fecha límite:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${ocr.deadline || '❌ No detectado'}</td></tr>
                                </table>
                            </div>
                            <div>
                                <h4>ℹ️ Detalles del Procesamiento:</h4>
                                <p><strong>Job ID:</strong> ${data.job_id}</p>
                                <p><strong>Confianza OCR:</strong> <span style="font-size: 18px; font-weight: bold; color: ${ocr.confidence > 80 ? 'green' : ocr.confidence > 60 ? 'orange' : 'red'}">${ocr.confidence.toFixed(1)}%</span></p>
                                <p><strong>Archivo:</strong> ${data.filename}</p>
                                <p><strong>Procesado:</strong> ${new Date(data.processed_at).toLocaleString()}</p>
                            </div>
                        </div>

                        <div>
                            <h4>📝 Descripción del trabajo:</h4>
                            <p style="background: #f8f9fa; padding: 10px; border-radius: 5px; border: 1px solid #dee2e6;">
                                ${ocr.job_description || '❌ No detectado'}
                            </p>
                        </div>

                        ${jobs.length ? `
                        <div style="margin-top: 20px;">
                            <h4>📋 Jobs detectados (${jobs.length}):</h4>
                            <ul style="list-style: none; padding-left: 0;">
                                ${jobs.map((j, idx) => `
                                    <li style="padding: 8px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 8px; background: #fff; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                                        <div>
                                            <div><strong>${j.client_name}</strong> — ${j.quantity_m} m — ${j.job_type}</div>
                                            <div style="color:#555; font-size: 12px;">${j.job_code} · ${j.job_date || 's/f'}</div>
                                        </div>
                                        <button onclick="navigator.clipboard.writeText('${"Cliente: " + (j.client_name||'') + " | Tipo: " + (j.job_type||'') + " | Cantidad: " + (j.quantity_m||'') + " m | Código: " + (j.job_code||'') + " | Fecha: " + (j.job_date||'')}')">Copiar</button>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        ` : ''}

                        <details style="margin-top: 20px;">
                            <summary style="cursor: pointer; font-weight: bold;">🔍 Ver texto completo detectado por OCR</summary>
                            <pre style="margin-top: 10px; max-height: 200px; overflow-y: auto;">${ocr.detected_text || 'Sin texto detectado'}</pre>
                        </details>

                        <details style="margin-top: 10px;">
                            <summary style="cursor: pointer; font-weight: bold;">🔧 Ver respuesta JSON completa</summary>
                            <pre style="margin-top: 10px; max-height: 300px; overflow-y: auto;">${JSON.stringify(data, null, 2)}</pre>
                        </details>
                    </div>
                `;
                resultDiv.className = 'result success';
                
            } catch (error) {
                resultDiv.innerHTML = `
                    <h3>❌ Error en el procesamiento OCR</h3>
                    <div class="status error">
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p><strong>Archivo:</strong> ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                        
                        <h4>🛠️ Posibles soluciones:</h4>
                        <ul>
                            <li>Verifica que el servidor Flask esté ejecutándose</li>
                            <li>Comprueba que Tesseract OCR esté instalado</li>
                            <li>Prueba con una imagen más pequeña o de mejor calidad</li>
                            <li>Revisa la consola del servidor para más detalles</li>
                        </ul>
                    </div>
                `;
                resultDiv.className = 'result error';
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.textContent = '🚀 Procesar con OCR';
            }
        }

        // Nuevo: subir imagen y mostrar SOLO el texto en plano usando /api/ocr-text
        async function uploadPlain() {
            if (!selectedFile) return;

            const resultDiv = document.getElementById('plainTextResult');
            const btn = document.getElementById('uploadPlainBtn');

            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '⏳ Subiendo y extrayendo texto OCR (simple)...';
            resultDiv.className = 'result info';
            btn.disabled = true;
            btn.textContent = '⏳ Procesando...';

            try {
                const formData = new FormData();
                formData.append('file', selectedFile);

                const response = await fetch('http://localhost:5000/api/ocr-text', {
                    method: 'POST',
                    body: formData
                });

                const text = await response.text();
                if (!response.ok) throw new Error(text || response.statusText);

                resultDiv.innerHTML = `<pre style="white-space: pre-wrap;">${text || 'Sin texto'}</pre>`;
                resultDiv.className = 'result success';
            } catch (error) {
                resultDiv.innerHTML = `
                    <h3>❌ Error en OCR simple</h3>
                    <div class="status error">
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p><strong>Archivo:</strong> ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                    </div>
                `;
                resultDiv.className = 'result error';
            } finally {
                btn.disabled = false;
                btn.textContent = '📝 OCR Simple (texto plano)';
            }
        }

        function clearFile() {
            selectedFile = null;
            document.getElementById('fileInfo').style.display = 'none';
            document.getElementById('uploadResult').style.display = 'none';
            document.getElementById('fileInput').value = '';
        }
    </script>
</body>
</html>
    """

@app.route('/api/upload-preview', methods=['POST'])
def upload_preview():
    """
    Endpoint para subir y procesar captura de pantalla
    """
    logger.info("Received upload request")
    try:
        # Verificar que se envió un archivo
        if 'preview' not in request.files:
            return jsonify({'error': 'No se proporcionó archivo de vista previa'}), 400
        
        file = request.files['preview']
        
        # Verificar que el archivo tiene nombre
        if file.filename == '':
            return jsonify({'error': 'No se seleccionó archivo'}), 400
        
        # Verificar extensión
        if not allowed_file(file.filename):
            return jsonify({
                'error': f'Tipo de archivo no permitido. Use: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Generar nombre seguro para el archivo
        original_filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{original_filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Guardar archivo
        file.save(filepath)
        logger.info(f"Archivo guardado: {filepath}")
        
        # Procesar con OCR
        job_details = ocr_service.extract_job_details(filepath)
        # Intentar parsear múltiples jobs a partir del texto detectado
        parsed_jobs = []
        try:
            parsed_jobs = ocr_service.parse_jobs_from_text(job_details.detected_text)
        except Exception as _:
            parsed_jobs = []
        
        # Generar ID único para el trabajo
        job_id = generate_job_id()
        
        # Preparar respuesta
        response_data = {
            'success': True,
            'job_id': job_id,
            'filename': filename,
            'filepath': filepath,
            'processed_at': datetime.now().isoformat(),
            'ocr_results': job_details.to_dict(),
            'jobs': parsed_jobs
        }
        
        logger.info(f"Procesamiento completado para: {filename}")
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error procesando archivo: {e}")
        return jsonify({
            'error': 'Error interno del servidor',
            'message': str(e)
        }), 500

@app.route('/api/reprocess/<job_id>', methods=['POST'])
def reprocess_job(job_id):
    """
    Endpoint para reprocesar un trabajo existente con diferentes parámetros
    """
    try:
        data = request.get_json()
        filepath = data.get('filepath')
        
        if not filepath or not os.path.exists(filepath):
            return jsonify({'error': 'Archivo no encontrado'}), 404
        
        # Reprocesar
        job_details = ocr_service.extract_job_details(filepath)
        
        response_data = {
            'success': True,
            'job_id': job_id,
            'reprocessed_at': datetime.now().isoformat(),
            'ocr_results': job_details.to_dict()
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error reprocesando trabajo {job_id}: {e}")
        return jsonify({
            'error': 'Error reprocesando trabajo',
            'message': str(e)
        }), 500

@app.route('/api/validate-job', methods=['POST'])
def validate_job():
    """
    Endpoint para validar/corregir información extraída
    """
    try:
        data = request.get_json()
        
        # Validar campos requeridos
        required_fields = ['job_id', 'client_name', 'job_description']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Campo requerido: {field}'}), 400
        
        # Aquí podrías guardar en base de datos
        validated_job = {
            'job_id': data['job_id'],
            'client_name': data['client_name'],
            'job_description': data['job_description'],
            'quantity': data.get('quantity', 0),
            'material': data.get('material', ''),
            'size': data.get('size', ''),
            'deadline': data.get('deadline', ''),
            'special_instructions': data.get('special_instructions', ''),
            'status': 'validated',
            'validated_at': datetime.now().isoformat()
        }
        
        logger.info(f"Trabajo validado: {data['job_id']}")
        
        return jsonify({
            'success': True,
            'message': 'Trabajo validado correctamente',
            'job': validated_job
        }), 200
        
    except Exception as e:
        logger.error(f"Error validando trabajo: {e}")
        return jsonify({
            'error': 'Error validando trabajo',
            'message': str(e)
        }), 500

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    """
    Endpoint para obtener lista de trabajos
    (Placeholder - implementar con base de datos)
    """
    # Por ahora devolver lista vacía
    return jsonify({
        'jobs': [],
        'total': 0,
        'message': 'Endpoint de trabajos - implementar con base de datos'
    })

@app.route('/api/ocr-text', methods=['POST'])
def ocr_text_plain():
    """Devuelve SOLO el texto OCR en texto plano."""
    try:
        # Aceptar 'file', 'image' o 'preview'
        file = request.files.get('file') or request.files.get('image') or request.files.get('preview')
        if not file or file.filename == '':
            return Response("No file provided", status=400, mimetype='text/plain; charset=utf-8')

        if not allowed_file(file.filename):
            return Response("Unsupported file type", status=400, mimetype='text/plain; charset=utf-8')

        # Guardar temporalmente en uploads
        original_filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{original_filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # OCR
        details = ocr_service.extract_job_details(filepath)
        text = details.detected_text or ""
        return Response(text, status=200, mimetype='text/plain; charset=utf-8')

    except Exception as e:
        logger.error(f"/api/ocr-text error: {e}")
        return Response(str(e), status=500, mimetype='text/plain; charset=utf-8')

@app.route('/api/ocr-text-last', methods=['GET'])
def ocr_text_last():
    """Procesa el archivo más reciente en uploads y devuelve SOLO el texto OCR en texto plano."""
    try:
        upload_dir = app.config['UPLOAD_FOLDER']
        if not os.path.exists(upload_dir):
            return Response("uploads directory not found", status=404, mimetype='text/plain; charset=utf-8')

        files = [
            os.path.join(upload_dir, f) for f in os.listdir(upload_dir)
            if f.lower().endswith(tuple(ALLOWED_EXTENSIONS))
        ]
        if not files:
            return Response("no images in uploads", status=404, mimetype='text/plain; charset=utf-8')

        latest = max(files, key=os.path.getmtime)
        details = ocr_service.extract_job_details(latest)
        text = details.detected_text or ""
        return Response(text, status=200, mimetype='text/plain; charset=utf-8')
    except Exception as e:
        logger.error(f"/api/ocr-text-last error: {e}")
        return Response(str(e), status=500, mimetype='text/plain; charset=utf-8')

@app.errorhandler(413)
def file_too_large(e):
    return jsonify({
        'error': 'Archivo demasiado grande',
        'max_size': f'{MAX_FILE_SIZE // 1024 // 1024}MB'
    }), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint no encontrado'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Error interno del servidor'}), 500

if __name__ == '__main__':
    logger.info("Iniciando servidor OCR...")
    logger.info(f"Directorio de uploads: {UPLOAD_FOLDER}")
    logger.info(f"Extensiones permitidas: {ALLOWED_EXTENSIONS}")
    
    # Ejecutar en modo desarrollo
    app.run(debug=True, host='0.0.0.0', port=5000)