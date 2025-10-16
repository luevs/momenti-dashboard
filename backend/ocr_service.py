import cv2
import pytesseract
import numpy as np
from PIL import Image
import re
from typing import Dict, List, Optional
import logging
import os
from datetime import datetime

# Ensure pytesseract uses the installed Tesseract on Windows
try:
    if os.name == 'nt':
        pytesseract.pytesseract.tesseract_cmd = r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"
except Exception:
    # Fallback safely; runtime will surface errors if not found
    pass

class JobDetails:
    """Estructura de datos para información del trabajo de impresión"""
    
    def __init__(self):
        self.client_name: str = ""
        self.job_description: str = ""
        self.quantity: int = 0
        self.material: str = ""
        self.size: str = ""
        self.deadline: str = ""
        self.special_instructions: str = ""
        self.detected_text: str = ""
        self.confidence: float = 0.0
    
    def to_dict(self) -> Dict:
        """Convierte la instancia a diccionario"""
        return {
            'client_name': self.client_name,
            'job_description': self.job_description,
            'quantity': self.quantity,
            'material': self.material,
            'size': self.size,
            'deadline': self.deadline,
            'special_instructions': self.special_instructions,
            'detected_text': self.detected_text,
            'confidence': self.confidence
        }

class OCRService:
    """Servicio para procesamiento OCR de capturas de trabajos de impresión"""
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        """
        Initialize OCR service
        
        Args:
            logger: Logger instance, creates one if not provided
        """
        self.logger = logger or self._setup_logger()
        
        # Directorio para debug
        self.debug_dir = "debug_images"
        os.makedirs(self.debug_dir, exist_ok=True)
        
        # Configurar ruta de Tesseract para Windows
        if os.name == 'nt':  # Windows
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        
        # Configuraciones múltiples para diferentes casos
        # Configuración 1: PSM 6 - Bloque uniforme de texto
        self.tesseract_config = '--oem 3 --psm 6'

        # Configuración 2: PSM 8 - Palabra simple
        self.tesseract_config_aggressive = '--oem 1 --psm 8'

        # Configuración 3: PSM 13 - Línea de texto sin formato específico
        self.tesseract_config_line = '--oem 3 --psm 13'

        # Configuración 4: Simple
        self.tesseract_config_simple = '--psm 6'
        
        # Verificar instalación de Tesseract
        self._verify_tesseract()
    
    def _setup_logger(self) -> logging.Logger:
        """Configura logger básico"""
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _verify_tesseract(self):
        """Verifica que Tesseract esté instalado"""
        try:
            pytesseract.get_tesseract_version()
            self.logger.info("Tesseract OCR is available")
        except Exception as e:
            self.logger.error(f"Tesseract not found: {e}")
            raise Exception("Tesseract OCR is not installed or not in PATH")
    
    def extract_job_details(self, image_path: str) -> JobDetails:
        """
        Extrae detalles del trabajo desde una captura de pantalla
        
        Args:
            image_path: Ruta a la imagen a procesar
            
        Returns:
            JobDetails object con la información extraída
        """
        try:
            self.logger.info(f"Processing image: {image_path}")
            
            # Verificar que el archivo existe
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            
            # 1) OCR SIMPLE PRIMERO (gris + invertido)
            best_text = ""
            best_conf = 0.0
            best_mode = ""
            try:
                original = cv2.imread(image_path)
                if original is not None:
                    gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
                    inv = cv2.bitwise_not(gray)

                    # Importante: NO incluir --lang en config; pasar lang='spa+eng' por parámetro
                    cfg = '--psm 6'

                    # Directo
                    text_dir = pytesseract.image_to_string(gray, lang='spa+eng', config=cfg).strip()
                    data_dir = pytesseract.image_to_data(gray, lang='spa+eng', config=cfg, output_type=pytesseract.Output.DICT)
                    conf_dir_vals = []
                    for c in data_dir.get('conf', []):
                        try:
                            ci = int(c)
                            if ci >= 0:
                                conf_dir_vals.append(ci)
                        except Exception:
                            pass
                    conf_dir = sum(conf_dir_vals) / len(conf_dir_vals) if conf_dir_vals else 0.0

                    # Invertido
                    text_inv = pytesseract.image_to_string(inv, lang='spa+eng', config=cfg).strip()
                    data_inv = pytesseract.image_to_data(inv, lang='spa+eng', config=cfg, output_type=pytesseract.Output.DICT)
                    conf_inv_vals = []
                    for c in data_inv.get('conf', []):
                        try:
                            ci = int(c)
                            if ci >= 0:
                                conf_inv_vals.append(ci)
                        except Exception:
                            pass
                    conf_inv = sum(conf_inv_vals) / len(conf_inv_vals) if conf_inv_vals else 0.0

                    cand = [
                        (text_dir, conf_dir, 'simple_direct'),
                        (text_inv, conf_inv, 'simple_inverted'),
                    ]
                    best_text, best_conf, best_mode = max(cand, key=lambda t: (len(t[0]), t[1]))

                    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
                    cv2.imwrite(os.path.join(self.debug_dir, f"simple_{ts}_gray.png"), gray)
                    cv2.imwrite(os.path.join(self.debug_dir, f"simple_{ts}_inverted.png"), inv)
                    self.logger.info(f"Simple OCR best={best_mode} len={len(best_text)} conf={best_conf:.2f}")
            except Exception as fe:
                self.logger.error(f"Simple OCR failed: {fe}")

            # 2) OCR con preprocesamiento (pipeline)
            processed_image = self._preprocess_image(image_path)
            raw_text_pp, conf_pp = self._extract_text_with_confidence(processed_image)
            self.logger.info(f"Preprocessed OCR len={len(raw_text_pp.strip())} conf={conf_pp:.2f}")

            # 3) Elegir mejor resultado entre simple y preprocesado
            if len(raw_text_pp.strip()) > len(best_text.strip()) or conf_pp > best_conf:
                raw_text, confidence = raw_text_pp.strip(), conf_pp
                self.logger.info("Using preprocessed OCR result")
            else:
                raw_text, confidence = best_text.strip(), best_conf
                self.logger.info("Using simple OCR result")
            
            # Parsear información estructurada
            job_details = self._parse_job_info(raw_text)
            job_details.detected_text = raw_text
            job_details.confidence = confidence
            
            self.logger.info(f"OCR completed with confidence: {confidence:.2f}")
            return job_details
            
        except Exception as e:
            self.logger.error(f"Error extracting job details: {e}")
            # Retornar objeto vacío en caso de error
            error_job = JobDetails()
            error_job.detected_text = f"Error processing image: {str(e)}"
            return error_job
    
    def _preprocess_image(self, image_path: str) -> np.ndarray:
        """
        Preprocesa la imagen para mejorar la precisión del OCR
        
        Args:
            image_path: Ruta a la imagen
            
        Returns:
            Imagen procesada como array numpy
        """
        try:
            # Cargar imagen
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError("Could not load image")
            
            # Convertir a escala de grises
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detectar si es fondo oscuro con texto claro
            mean_brightness = np.mean(gray)
            self.logger.info(f"Image mean brightness: {mean_brightness}")
            
            # Para WhatsApp/chat screenshots, siempre invertir si es oscuro
            if mean_brightness < 100:  # Umbral más bajo para capturas oscuras
                self.logger.info("Dark background detected, inverting colors")
                gray = cv2.bitwise_not(gray)
                # Guardar imagen invertida para debug
                debug_inverted = image_path.replace('.jpg', '_inverted.png').replace('.jpeg', '_inverted.png')
                cv2.imwrite(debug_inverted, gray)
                self.logger.info(f"DEBUG: Saved inverted image to {debug_inverted}")
            
            # Aplicar filtro de ruido
            denoised = cv2.fastNlMeansDenoising(gray)
            
            # Mejorar contraste usando CLAHE
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            enhanced = clahe.apply(denoised)
            
            # Redimensionar imagen para mejorar OCR en texto pequeño
            height, width = enhanced.shape
            min_dim = 800  # eleva el mínimo para hacer más legible texto delgado
            if height < min_dim or width < min_dim:
                scale_factor = max(min_dim/height, min_dim/width, 2.0)
                new_width = int(width * scale_factor)
                new_height = int(height * scale_factor)
                enhanced = cv2.resize(enhanced, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
                self.logger.info(f"Resized image from {width}x{height} to {new_width}x{new_height}")
            
            # Aplicar threshold: Otsu + Adaptive y combinarlos para conservar trazos finos
            _, otsu = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            adaptive = cv2.adaptiveThreshold(
                enhanced,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                15,
                8,
            )
            combined = cv2.bitwise_or(otsu, adaptive)

            # Morfología: dilatación suave + cierre para engrosar texto y unir cortes
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
            dilated = cv2.dilate(combined, kernel, iterations=1)
            processed = cv2.morphologyEx(dilated, cv2.MORPH_CLOSE, kernel, iterations=1)
            
            # DEBUG: Guardar TODAS las etapas de procesamiento
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            debug_prefix = os.path.join(self.debug_dir, f"debug_{timestamp}")
            
            # Guardar imagen original
            cv2.imwrite(f"{debug_prefix}_01_original.png", cv2.cvtColor(image, cv2.COLOR_BGR2GRAY))
            
            # Guardar después de inversión (si aplica)
            if mean_brightness < 100:
                cv2.imwrite(f"{debug_prefix}_02_inverted.png", gray)
            
            # Guardar después de denoising
            cv2.imwrite(f"{debug_prefix}_03_denoised.png", denoised)
            
            # Guardar después de CLAHE
            cv2.imwrite(f"{debug_prefix}_04_enhanced.png", enhanced)
            
            # Guardar después de thresholds
            cv2.imwrite(f"{debug_prefix}_05_threshold_otsu.png", otsu)
            cv2.imwrite(f"{debug_prefix}_05_threshold_adaptive.png", adaptive)
            cv2.imwrite(f"{debug_prefix}_05_threshold_combined.png", combined)
            
            # Guardar imagen final procesada
            cv2.imwrite(f"{debug_prefix}_06_final.png", processed)
            
            self.logger.info(f"DEBUG: Saved all processing stages with prefix {debug_prefix}")
            self.logger.info(f"Final processed image size: {processed.shape}")
            self.logger.info(f"Final processed image type: {processed.dtype}")
            self.logger.info(f"Final processed image min/max values: {processed.min()}/{processed.max()}")
            
            self.logger.debug("Image preprocessing completed")
            return processed
            
        except Exception as e:
            self.logger.error(f"Error preprocessing image: {e}")
            raise
    
    def _extract_text_with_confidence(self, image: np.ndarray) -> tuple[str, float]:
        """
        Extrae texto de la imagen con información de confianza
        Intenta múltiples configuraciones si la primera falla
        
        Args:
            image: Imagen procesada
            
        Returns:
            Tuple con (texto_extraído, confianza_promedio)
        """
        try:
            # Primer intento con configuración estándar
            text = pytesseract.image_to_string(image, lang='spa+eng', config=self.tesseract_config)
            data = pytesseract.image_to_data(image, lang='spa+eng', config=self.tesseract_config, output_type=pytesseract.Output.DICT)
            
            # Calcular confianza promedio (solo palabras con conf > 0)
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            self.logger.info(f"First attempt: {len(text.split())} words with avg confidence: {avg_confidence:.2f}")
            
            # Si la confianza es muy baja o no hay texto, intentar configuración más agresiva
            if avg_confidence < 30 or len(text.strip()) < 10:
                self.logger.info("Low confidence or short text, trying aggressive config")
                
                text2 = pytesseract.image_to_string(image, lang='spa+eng', config=self.tesseract_config_aggressive)
                data2 = pytesseract.image_to_data(image, lang='spa+eng', config=self.tesseract_config_aggressive, output_type=pytesseract.Output.DICT)
                
                confidences2 = [int(conf) for conf in data2['conf'] if int(conf) > 0]
                avg_confidence2 = sum(confidences2) / len(confidences2) if confidences2 else 0.0
                
                self.logger.info(f"Second attempt: {len(text2.split())} words with avg confidence: {avg_confidence2:.2f}")
                
                # Usar el mejor resultado
                if avg_confidence2 > avg_confidence or len(text2.strip()) > len(text.strip()):
                    text = text2
                    avg_confidence = avg_confidence2
                    self.logger.info("Using second attempt results")
            
            # Intentar múltiples configuraciones hasta encontrar texto
            configs_to_try = [
                ('line_config', self.tesseract_config_line),
                ('simple_config', self.tesseract_config_simple),
                ('no_lang', '--psm 6'),
                ('psm_7', '--psm 7'),  # Línea de texto individual
                ('psm_8', '--psm 8'),  # Palabra individual
                ('psm_11', '--psm 11'), # Sparse text
                ('psm_12', '--psm 12'), # Sparse text con OSD
                ('psm_13', '--psm 13'),  # Raw line, no hay formato
                (
                    'whitelist_codes',
                    "--psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_\.M"
                ),
            ]
            
            best_text = text
            best_confidence = avg_confidence
            
            for config_name, config in configs_to_try:
                if best_confidence > 30 and len(best_text.strip()) > 10:
                    break  # Ya tenemos un buen resultado
                
                try:
                    self.logger.info(f"Trying {config_name}: {config}")
                    text_attempt = pytesseract.image_to_string(image, lang='spa+eng', config=config)
                    data_attempt = pytesseract.image_to_data(image, lang='spa+eng', config=config, output_type=pytesseract.Output.DICT)
                    
                    conf_attempt = [int(conf) for conf in data_attempt['conf'] if int(conf) > 0]
                    avg_conf_attempt = sum(conf_attempt) / len(conf_attempt) if conf_attempt else 0.0
                    
                    self.logger.info(f"{config_name}: {len(text_attempt.split())} words, conf: {avg_conf_attempt:.2f}")
                    self.logger.info(f"{config_name} text preview: '{text_attempt[:100]}'")
                    
                    # Usar este resultado si es mejor
                    if avg_conf_attempt > best_confidence or len(text_attempt.strip()) > len(best_text.strip()):
                        best_text = text_attempt
                        best_confidence = avg_conf_attempt
                        self.logger.info(f"Using {config_name} results")
                        
                except Exception as e:
                    self.logger.error(f"Error with {config_name}: {e}")
                    continue
            
            text = best_text
            avg_confidence = best_confidence
            
            # DEBUG EXTREMO: Información final de OCR
            self.logger.info("=== OCR DEBUG EXTREMO ===")
            self.logger.info(f"Final detected text length: {len(text)}")
            self.logger.info(f"Final detected text (first 200 chars): '{text[:200]}'")
            self.logger.info(f"Final confidence: {avg_confidence}")
            self.logger.info(f"Text has only whitespace: {text.isspace()}")
            self.logger.info(f"Text stripped length: {len(text.strip())}")
            
            # Intentar detectar si hay ALGO en la imagen
            try:
                # Tesseract modo más básico posible
                basic_text = pytesseract.image_to_string(image, lang='spa+eng', config='--psm 8')
                self.logger.info(f"BASIC PSM 8 result: '{basic_text[:100]}'")
                
                # Tesseract sin configuración
                no_config_text = pytesseract.image_to_string(image, lang='spa+eng')
                self.logger.info(f"NO CONFIG result: '{no_config_text[:100]}'")
                
                # Solo números
                numbers_only = pytesseract.image_to_string(image, lang='spa+eng', config='--psm 8 -c tessedit_char_whitelist=0123456789')
                self.logger.info(f"NUMBERS ONLY result: '{numbers_only[:100]}'")
                
            except Exception as e:
                self.logger.error(f"Error in extreme debug OCR: {e}")
            
            self.logger.info("=== FIN OCR DEBUG EXTREMO ===")
            
            self.logger.info(f"Final result: '{text[:100]}...' with confidence: {avg_confidence:.2f}")
            
            return text.strip(), avg_confidence
            
        except Exception as e:
            self.logger.error(f"Error extracting text: {e}")
            return "", 0.0
    
    def _parse_job_info(self, text: str) -> JobDetails:
        """
        Parsea el texto extraído para identificar información específica del trabajo
        
        Args:
            text: Texto extraído por OCR
            
        Returns:
            JobDetails object con información estructurada
        """
        job = JobDetails()
        
        if not text:
            return job
        
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        full_text = text.lower()
        
        # Patrones regex optimizados para tu formato específico
        # Formato: T101025-NOMBRE_APELLIDO-CANTIDAD
        patterns = {
            'client_name': [
                # Formato específico de tu imagen: T101025-CARLOS_LEON-20M
                r'T\d{6}-([A-Z_]+(?:[A-Z_]+)*)-[\d\.]+M?',
                # Patrones generales
                r'(?:cliente|client|customer)[:\s]*([^\n\r]+?)(?:\n|$)',
                r'(?:para|for)[:\s]*([^\n\r]+?)(?:\n|$)',
                # Nombres en mayúsculas seguidos de guión bajo
                r'([A-Z]+_[A-Z]+)',
                # Nombres al inicio de línea
                r'^([A-Z][A-Z_]+[A-Z])(?:-|\s)',
            ],
            'quantity': [
                # Tu formato específico: números seguidos de M
                r'(\d+\.?\d*M)(?:\s|$)',
                r'T\d{6}-[A-Z_]+-(\d+\.?\d*M?)',
                # Patrones generales
                r'(?:cantidad|qty|copies|ejemplares|piezas)[:\s]*(\d+)',
                r'(\d+)\s*(?:unidades|pieces|copias|ejemplares)',
                r'tiraje[:\s]*(\d+)'
            ],
            'material': [
                r'(?:material|substrate|papel|paper)[:\s]*([^\n\r]+?)(?:\n|$)',
                r'(?:impreso en|printed on)[:\s]*([^\n\r]+?)(?:\n|$)'
            ],
            'size': [
                r'(?:tamaño|size|medidas|dimensiones)[:\s]*([^\n\r]+?)(?:\n|$)',
                r'(\d+\s*x\s*\d+\s*(?:cm|mm|in|inches)?)',
                r'(?:formato)[:\s]*([^\n\r]+?)(?:\n|$)'
            ],
            'deadline': [
                # Tu formato de fecha: 10/10/2025
                r'(\d{1,2}/\d{1,2}/\d{4})',
                r'(\d{1,2}:\d{2}\s+[ap]\.?\s*m\.?)',
                # Patrones generales
                r'(?:fecha|deadline|entrega|delivery)[:\s]*([^\n\r]+?)(?:\n|$)',
                r'(?:para el|for)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'(?:urgente|urgent|asap)',
            ]
        }
        
        # Aplicar patrones
        for field, field_patterns in patterns.items():
            for pattern in field_patterns:
                match = re.search(pattern, full_text, re.IGNORECASE | re.MULTILINE)
                if match:
                    value = match.group(1) if match.groups() else match.group(0)
                    value = value.strip()
                    
                    if field == 'quantity':
                        try:
                            job.quantity = int(value)
                        except ValueError:
                            continue
                    else:
                        setattr(job, field, value)
                    break  # Usar la primera coincidencia encontrada
        
        # Descripción del trabajo (primeras líneas significativas)
        meaningful_lines = [line for line in lines if len(line) > 5 and not any(
            keyword in line.lower() for keyword in ['cliente', 'cantidad', 'material', 'tamaño', 'fecha']
        )]
        
        if meaningful_lines:
            job.job_description = ' '.join(meaningful_lines[:2])  # Primeras 2 líneas relevantes
        
        # Instrucciones especiales (buscar palabras clave)
        special_keywords = ['urgente', 'urgent', 'especial', 'nota', 'importante', 'observación']
        special_lines = [line for line in lines if any(keyword in line.lower() for keyword in special_keywords)]
        
        if special_lines:
            job.special_instructions = ' '.join(special_lines)
        
        self.logger.debug(f"Parsed job info: client={job.client_name}, qty={job.quantity}")
        
        return job
    
    def process_batch(self, image_paths: List[str]) -> List[JobDetails]:
        """
        Procesa múltiples imágenes en lote
        
        Args:
            image_paths: Lista de rutas a las imágenes
            
        Returns:
            Lista de JobDetails objects
        """
        results = []
        
        for path in image_paths:
            try:
                job_details = self.extract_job_details(path)
                results.append(job_details)
            except Exception as e:
                self.logger.error(f"Error processing {path}: {e}")
                error_job = JobDetails()
                error_job.detected_text = f"Error: {str(e)}"
                results.append(error_job)
        
        return results

    # ===================== NUEVO: Parser de múltiples líneas tipo Tddmmaa-NOMBRE-qtyM =====================
    def parse_jobs_from_text(self, text: str) -> List[Dict]:
        """Parsea el texto OCR para extraer múltiples jobs por línea con el formato:
        Tddmmaa-NOMBRE_APELLIDO-x.yM [ruido]

        Devuelve una lista de dicts con: job_type, job_code, job_date (ISO), client_name,
        quantity_m (float), unit, raw_line.
        """
        if not text:
            return []

        def _normalize(s: str) -> str:
            s = s.replace('—', '-').replace('–', '-')
            s = s.replace('·', '.').replace('•', '-')
            # espacios múltiples -> uno
            s = re.sub(r'[ \t]+', ' ', s)
            # unir fecha ddmmaa si vino con espacios: U10 10 25-... -> U101025-...
            s = re.sub(r'([A-Z])(\d{2})\s*(\d{2})\s*(\d{2})', r'\1\2\3\4', s)
            return s

        def _prettify_name(name_raw: str) -> str:
            name = name_raw.strip().replace('_', ' ')
            return ' '.join(w.capitalize() for w in name.split())

        def _parse_date_ddmmaa(ddmmaa: str) -> str:
            # ddmmaa -> yyyy-mm-dd, regla de siglo: 00-79 -> 2000-2079, 80-99 -> 1980-1999
            if not ddmmaa or len(ddmmaa) != 6:
                return ''
            dd = int(ddmmaa[0:2])
            mm = int(ddmmaa[2:4])
            aa = int(ddmmaa[4:6])
            yyyy = 2000 + aa if aa <= 79 else 1900 + aa
            try:
                return f"{yyyy:04d}-{mm:02d}-{dd:02d}"
            except Exception:
                return ''

        JOB_TYPE_MAP = {
            'T': 'DTF Textil',
        }

        # Regex por línea: anclada; ignora lo que siga después de la M (fecha/hora de Windows)
        # Prefijo 1 letra (tipo), 6 dígitos fecha, guión, nombre en mayúsculas/guiones bajos, guión, cantidad decimal + 'M'
        JOB_LINE_RE = re.compile(
            r"^\s*(?P<prefix>[A-Z])(?P<date>\d{6})-(?P<client>[A-ZÁÉÍÓÚÜÑ_]+)-(?P<qty>(?:\d+[\.,]\d+|\d+|[\.,]\d+))\s*M\b.*$",
            re.MULTILINE
        )

        norm = _normalize(text)
        results: List[Dict] = []
        for line in norm.splitlines():
            line_stripped = line.strip()
            if not line_stripped or len(line_stripped) < 8:
                continue
            m = JOB_LINE_RE.match(line_stripped.upper())
            if not m:
                continue
            gd = m.groupdict()
            prefix = gd.get('prefix') or ''
            date_str = gd.get('date') or ''
            client_raw = gd.get('client') or ''
            qty_raw = gd.get('qty') or ''

            # cantidad en metros (float)
            qty_val = None
            try:
                # Permitir cantidades tipo .35 -> 0.35
                q = qty_raw.replace(',', '.')
                if q.startswith('.'):
                    q = '0' + q
                qty_val = float(q)
            except Exception:
                qty_val = None

            if qty_val is None:
                continue

            job_type = JOB_TYPE_MAP.get(prefix, prefix)
            job_code = f"{prefix}{date_str}"
            job_date = _parse_date_ddmmaa(date_str)
            client_name = _prettify_name(client_raw)

            results.append({
                'job_type': job_type,
                'job_code': job_code,
                'job_date': job_date,
                'client_name': client_name,
                'quantity_m': qty_val,
                'unit': 'm',
                'raw_line': line_stripped,
            })

        return results