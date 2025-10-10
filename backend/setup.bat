@echo off
echo === Configurando Backend OCR ===

REM Crear entorno virtual
python -m venv venv

REM Activar entorno virtual
call venv\Scripts\activate.bat

REM Instalar dependencias
pip install -r requirements.txt

echo.
echo === IMPORTANTE: Instalacion de Tesseract ===
echo.
echo Para que el OCR funcione, necesitas instalar Tesseract OCR:
echo.
echo Windows:
echo 1. Descargar desde: https://github.com/UB-Mannheim/tesseract/wiki
echo 2. Instalar el ejecutable .exe
echo 3. Agregar a PATH: C:\Program Files\Tesseract-OCR
echo.
echo === Backend configurado ===
echo Para ejecutar: python app.py

pause