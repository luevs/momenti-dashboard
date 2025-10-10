@echo off
echo === Iniciando servidor OCR ===
cd /d "C:\Users\VICTUS RTX RYZEN\momenti-dashboard\backend"
call venv\Scripts\activate.bat
echo Servidor iniciando en http://localhost:5000
python app.py
pause