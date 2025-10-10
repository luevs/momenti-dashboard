#!/bin/bash

echo "=== Configurando Backend OCR ==="

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual (Linux/Mac)
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    source venv/bin/activate
# Activar entorno virtual (Windows)
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
fi

# Instalar dependencias
pip install -r requirements.txt

echo ""
echo "=== IMPORTANTE: Instalación de Tesseract ==="
echo ""
echo "Para que el OCR funcione, necesitas instalar Tesseract OCR:"
echo ""
echo "Windows:"
echo "1. Descargar desde: https://github.com/UB-Mannheim/tesseract/wiki"
echo "2. Instalar el ejecutable .exe"
echo "3. Agregar a PATH: C:\\Program Files\\Tesseract-OCR"
echo ""
echo "Ubuntu/Debian:"
echo "sudo apt-get install tesseract-ocr tesseract-ocr-spa"
echo ""
echo "macOS:"
echo "brew install tesseract tesseract-lang"
echo ""
echo "=== Backend configurado ==="
echo "Para ejecutar: python app.py"