-- Tabla para notificaciones de admin en tiempo real
CREATE TABLE admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'new_login', 'failed_login', 'security_alert', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    user_type TEXT, -- Tipo de usuario relacionado con la notificación
    user_id TEXT, -- ID del usuario relacionado
    user_name TEXT, -- Nombre del usuario relacionado
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
    additional_data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Índices
CREATE INDEX idx_admin_notifications_timestamp ON admin_notifications(timestamp);
CREATE INDEX idx_admin_notifications_read ON admin_notifications(read);
CREATE INDEX idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX idx_admin_notifications_severity ON admin_notifications(severity);

-- RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Solo admins autenticados pueden ver notificaciones
CREATE POLICY "Admin can view notifications" ON admin_notifications
    FOR ALL USING (auth.role() = 'authenticated');

-- Función para limpiar notificaciones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM admin_notifications 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Función trigger para crear notificaciones automáticas en login
CREATE OR REPLACE FUNCTION notify_admin_on_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo crear notificación para logins exitosos
    IF NEW.success = true THEN
        INSERT INTO admin_notifications (
            type, 
            title, 
            message, 
            user_type, 
            user_id, 
            user_name,
            severity,
            additional_data
        ) VALUES (
            'new_login',
            CASE 
                WHEN NEW.user_type = 'admin' THEN '🔐 Admin Login'
                WHEN NEW.user_type = 'client' THEN '👥 Cliente Login'
                ELSE '🚪 Nuevo Acceso'
            END,
            CASE 
                WHEN NEW.user_type = 'admin' THEN 
                    'Administrador ' || COALESCE(NEW.user_name, NEW.user_id) || ' ha iniciado sesión'
                WHEN NEW.user_type = 'client' THEN 
                    'Cliente ' || COALESCE(NEW.user_name, NEW.user_id) || ' ha accedido al portal'
                ELSE 
                    'Usuario ' || COALESCE(NEW.user_name, NEW.user_id) || ' ha iniciado sesión'
            END,
            NEW.user_type,
            NEW.user_id,
            NEW.user_name,
            'info',
            jsonb_build_object(
                'login_time', NEW.login_time,
                'ip_address', NEW.ip_address,
                'user_agent', NEW.user_agent
            )
        );
    ELSE
        -- Crear alerta para login fallido
        INSERT INTO admin_notifications (
            type, 
            title, 
            message, 
            user_type, 
            user_id, 
            user_name,
            severity,
            additional_data
        ) VALUES (
            'failed_login',
            '⚠️ Intento de Login Fallido',
            'Intento fallido de acceso para ' || NEW.user_type || ': ' || NEW.user_id,
            NEW.user_type,
            NEW.user_id,
            NEW.user_name,
            'warning',
            jsonb_build_object(
                'login_time', NEW.login_time,
                'ip_address', NEW.ip_address,
                'user_agent', NEW.user_agent,
                'error_details', NEW.additional_data
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear notificaciones automáticamente
CREATE TRIGGER trigger_notify_admin_on_login
    AFTER INSERT ON login_logs
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_on_login();

-- Función para detectar múltiples logins fallidos (posible ataque)
CREATE OR REPLACE FUNCTION detect_failed_login_attacks()
RETURNS void AS $$
DECLARE
    suspicious_attempts RECORD;
BEGIN
    -- Buscar IPs con más de 3 intentos fallidos en la última hora
    FOR suspicious_attempts IN
        SELECT 
            ip_address,
            COUNT(*) as failed_count,
            MAX(login_time) as last_attempt
        FROM login_logs 
        WHERE success = false 
          AND login_time >= NOW() - INTERVAL '1 hour'
          AND ip_address IS NOT NULL
        GROUP BY ip_address
        HAVING COUNT(*) >= 3
    LOOP
        -- Crear alerta de seguridad
        INSERT INTO admin_notifications (
            type, 
            title, 
            message, 
            severity,
            additional_data
        ) VALUES (
            'security_alert',
            '🚨 Posible Ataque Detectado',
            'IP ' || suspicious_attempts.ip_address || ' ha tenido ' || suspicious_attempts.failed_count || ' intentos fallidos de login en la última hora.',
            'error',
            jsonb_build_object(
                'ip_address', suspicious_attempts.ip_address,
                'failed_count', suspicious_attempts.failed_count,
                'last_attempt', suspicious_attempts.last_attempt,
                'detection_time', NOW()
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Job programado para ejecutar la detección cada 10 minutos (esto requiere pg_cron extension)
-- SELECT cron.schedule('detect-attacks', '*/10 * * * *', 'SELECT detect_failed_login_attacks();');