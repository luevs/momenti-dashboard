import cv2
import pytesseract
import numpy as np
from PIL import Image
import os

# Point pytesseract to the Windows Tesseract installation
if os.name == 'nt':
    pytesseract.pytesseract.tesseract_cmd = r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'

def test_simple_ocr(image_path):
    """
    Prueba SÚPER SIMPLE de OCR - solo para ver si puede leer ALGO
    """
    print(f"=== PRUEBA SIMPLE OCR ===")
    print(f"Imagen: {image_path}")
    
    # 1. Cargar imagen
    try:
        image = cv2.imread(image_path)
        if image is None:
            print("❌ ERROR: No se pudo cargar la imagen")
            return
        
        print(f"✅ Imagen cargada: {image.shape}")
        
        # 2. Convertir a escala de grises
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        print(f"✅ Convertida a gris: {gray.shape}")
        
        # 3. PRUEBA 1: OCR SIN PROCESAMIENTO
        print("\n--- PRUEBA 1: OCR DIRECTO ---")
        text1 = pytesseract.image_to_string(gray)
        print(f"Texto detectado: '{text1[:200]}'")
        print(f"Longitud: {len(text1)}")
        
        # 4. PRUEBA 2: INVERTIR COLORES (para fondos oscuros)
        print("\n--- PRUEBA 2: COLORES INVERTIDOS ---")
        inverted = cv2.bitwise_not(gray)
        text2 = pytesseract.image_to_string(inverted)
        print(f"Texto detectado: '{text2[:200]}'")
        print(f"Longitud: {len(text2)}")
        
        # 5. PRUEBA 3: SOLO NÚMEROS
        print("\n--- PRUEBA 3: SOLO NÚMEROS ---")
        numbers = pytesseract.image_to_string(gray, config='-c tessedit_char_whitelist=0123456789')
        print(f"Números detectados: '{numbers}'")
        
        # 6. PRUEBA 4: DIFERENTES PSM
        psm_modes = [6, 7, 8, 13]
        for psm in psm_modes:
            print(f"\n--- PRUEBA PSM {psm} ---")
            try:
                text_psm = pytesseract.image_to_string(gray, config=f'--psm {psm}')
                print(f"PSM {psm}: '{text_psm[:100]}'")
            except Exception as e:
                print(f"PSM {psm}: ERROR - {e}")
        
        # 7. GUARDAR IMÁGENES PARA DEBUG
        debug_dir = "debug_simple"
        os.makedirs(debug_dir, exist_ok=True)
        
        cv2.imwrite(f"{debug_dir}/01_original.png", gray)
        cv2.imwrite(f"{debug_dir}/02_inverted.png", inverted)
        print(f"\n✅ Imágenes guardadas en {debug_dir}/")
        
        print("\n=== FIN PRUEBA ===")
        
    except Exception as e:
        print(f"❌ ERROR GENERAL: {e}")

if __name__ == "__main__":
    # Buscar la última imagen subida
    uploads_dir = "uploads"
    if os.path.exists(uploads_dir):
        files = [f for f in os.listdir(uploads_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        if files:
            # Usar la imagen más reciente
            latest_file = max([os.path.join(uploads_dir, f) for f in files], key=os.path.getmtime)
            test_simple_ocr(latest_file)
        else:
            print("❌ No hay imágenes en uploads/")
    else:
        print("❌ Directorio uploads/ no existe")
    
    # También permitir especificar imagen manualmente
    print("\nPara probar con una imagen específica:")
    print("python test_simple_ocr.py ruta_a_tu_imagen.jpg")