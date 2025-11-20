-- Tabla para registrar logs de acceso
CREATE TABLE login_logs (
    id SERIAL PRIMARY KEY,
    user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'client')), -- Tipo de usuario
    user_id TEXT, -- ID del usuario (email para admin, access_id para cliente)
    user_name TEXT, -- Nombre del usuario
    ip_address INET, -- Dirección IP
    user_agent TEXT, -- Navegador/dispositivo
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT true, -- Si el login fue exitoso
    session_duration INTERVAL, -- Duración de la sesión (se actualiza al logout)
    logout_time TIMESTAMP WITH TIME ZONE,
    location_info JSONB, -- Información de geolocalización si está disponible
    additional_data JSONB -- Datos adicionales (dispositivo, etc.)
);

-- Índices para consultas rápidas
CREATE INDEX idx_login_logs_user_type ON login_logs(user_type);
CREATE INDEX idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX idx_login_logs_login_time ON login_logs(login_time);
CREATE INDEX idx_login_logs_success ON login_logs(success);

-- Vista para sesiones activas
CREATE VIEW active_sessions AS
SELECT 
    id,
    user_type,
    user_id,
    user_name,
    ip_address,
    login_time,
    NOW() - login_time as session_duration,
    CASE 
        WHEN logout_time IS NULL AND NOW() - login_time < INTERVAL '8 hours' 
        THEN 'active'
        ELSE 'expired'
    END as session_status
FROM login_logs 
WHERE logout_time IS NULL 
    AND NOW() - login_time < INTERVAL '24 hours'
ORDER BY login_time DESC;

-- Vista para estadísticas de acceso
CREATE VIEW login_statistics AS
SELECT 
    user_type,
    COUNT(*) as total_logins,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN success THEN 1 END) as successful_logins,
    COUNT(CASE WHEN NOT success THEN 1 END) as failed_logins,
    MAX(login_time) as last_login,
    AVG(EXTRACT(EPOCH FROM session_duration)/3600) as avg_session_hours
FROM login_logs 
WHERE login_time >= NOW() - INTERVAL '30 days'
GROUP BY user_type;

-- Función para limpiar logs antiguos
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM login_logs 
    WHERE login_time < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- RLS para la tabla de logs
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver todos los logs
CREATE POLICY "Admin can view all logs" ON login_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Todos pueden insertar logs de su propio acceso
CREATE POLICY "Users can insert their own logs" ON login_logs
    FOR INSERT WITH CHECK (true);