# Backend OCR para Momenti Dashboard

Este backend proporciona servicios de OCR (Optical Character Recognition) para procesar capturas de trabajos de impresión.

## Instalación

### Requisitos previos

1. **Python 3.8+**
2. **Tesseract OCR** (crucial para el funcionamiento)

### Instalación de Tesseract

#### Windows
1. Descargar desde: https://github.com/UB-Mannheim/tesseract/wiki
2. Instalar el ejecutable `.exe`
3. Agregar al PATH: `C:\Program Files\Tesseract-OCR`

#### Ubuntu/Debian
```bash
sudo apt-get install tesseract-ocr tesseract-ocr-spa
```

#### macOS
```bash
brew install tesseract tesseract-lang
```

### Configuración del backend

#### Windows
```cmd
cd backend
setup.bat
```

#### Linux/macOS
```bash
cd backend
chmod +x setup.sh
./setup.sh
```

#### Manual
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/macOS
# o
venv\Scripts\activate.bat  # Windows

pip install -r requirements.txt
```

## Uso

### Ejecutar servidor
```bash
python app.py
```

El servidor estará disponible en: `http://localhost:5000`

### Endpoints disponibles

#### `POST /api/upload-preview`
Sube y procesa una imagen con OCR.

**Request:**
- `preview`: archivo de imagen (PNG, JPG, GIF, BMP)

**Response:**
```json
{
  "success": true,
  "job_id": "JOB-20241010-ABC123",
  "filename": "imagen.png",
  "ocr_results": {
    "client_name": "Cliente Example",
    "job_description": "Tarjetas de presentación",
    "quantity": 500,
    "material": "Papel couché",
    "size": "9x5 cm",
    "deadline": "15/10/2024",
    "detected_text": "texto completo...",
    "confidence": 85.2
  }
}
```

#### `POST /api/validate-job`
Valida y guarda un trabajo procesado.

#### `GET /health`
Health check del servicio.

## Estructura de archivos

```
backend/
├── app.py              # Servidor Flask principal
├── ocr_service.py      # Servicio de procesamiento OCR
├── requirements.txt    # Dependencias Python
├── setup.bat          # Script de instalación Windows
├── setup.sh           # Script de instalación Linux/macOS
├── uploads/           # Directorio para archivos subidos
└── README.md          # Esta documentación
```

## Funcionalidades del OCR

### Datos extraídos automáticamente:
- Nombre del cliente
- Descripción del trabajo
- Cantidad de piezas
- Material a usar
- Dimensiones/tamaño
- Fecha límite
- Instrucciones especiales

### Preprocesamiento de imagen:
- Conversión a escala de grises
- Reducción de ruido
- Mejora de contraste
- Threshold adaptativo
- Operaciones morfológicas

### Precisión:
- Configurado para español e inglés
- Filtro de caracteres válidos
- Cálculo de confianza por palabra
- Múltiples patrones de reconocimiento

## Troubleshooting

### Error: "Tesseract not found"
- Verificar que Tesseract esté instalado
- Verificar que esté en el PATH del sistema
- En Windows, probar agregar: `C:\Program Files\Tesseract-OCR`

### Error: "Could not load image"
- Verificar que el archivo sea una imagen válida
- Formatos soportados: PNG, JPG, JPEG, GIF, BMP, TIFF

### Baja precisión en OCR
- Verificar calidad de la imagen
- Evitar imágenes muy pequeñas o borrosas
- Probar con mejor contraste o iluminación

## Desarrollo

### Agregar nuevos patrones
Editar `ocr_service.py` en el método `_parse_job_info()` para agregar nuevos patrones de reconocimiento.

### Cambiar configuración OCR
Modificar `tesseract_config` en la clase `OCRService`.

### Logs
Los logs se muestran en consola. Para logs en archivo, modificar la configuración en `app.py`.