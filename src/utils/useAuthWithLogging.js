// Hook personalizado para manejar autenticación y logging
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useAuthWithLogging = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para registrar el acceso
  const logAccess = async (userType, userId, userName, success = true, additionalData = {}) => {
    try {
      const userAgent = navigator.userAgent;
      const timestamp = new Date().toISOString();
      
      // Intentar obtener la IP (esto requiere un servicio externo)
      let ipAddress = null;
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch (error) {
        console.log('No se pudo obtener la IP:', error);
      }

      const { error } = await supabase
        .from('login_logs')
        .insert({
          user_type: userType,
          user_id: userId,
          user_name: userName,
          ip_address: ipAddress,
          user_agent: userAgent,
          login_time: timestamp,
          success: success,
          additional_data: {
            ...additionalData,
            browser: getBrowserInfo(),
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        });

      if (error) {
        console.error('Error logging access:', error);
      }

      // Enviar notificación en tiempo real si es exitoso
      if (success) {
        await sendRealTimeNotification(userType, userId, userName);
      }

    } catch (error) {
      console.error('Error in logAccess:', error);
    }
  };

  // Función para registrar logout
  const logLogout = async (userId, userType) => {
    try {
      // Buscar la sesión activa más reciente
      const { data: activeSession } = await supabase
        .from('login_logs')
        .select('id, login_time')
        .eq('user_id', userId)
        .eq('user_type', userType)
        .is('logout_time', null)
        .order('login_time', { ascending: false })
        .limit(1)
        .single();

      if (activeSession) {
        const logoutTime = new Date().toISOString();
        const sessionDuration = new Date(logoutTime) - new Date(activeSession.login_time);

        await supabase
          .from('login_logs')
          .update({
            logout_time: logoutTime,
            session_duration: `${Math.floor(sessionDuration / 1000)} seconds`
          })
          .eq('id', activeSession.id);
      }
    } catch (error) {
      console.error('Error logging logout:', error);
    }
  };

  // Función para obtener información del navegador
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    
    return browser;
  };

  // Función para enviar notificaciones en tiempo real
  const sendRealTimeNotification = async (userType, userId, userName) => {
    try {
      // Insertar en una tabla de notificaciones para tiempo real
      const notification = {
        id: crypto.randomUUID(),
        type: 'new_login',
        title: `Nuevo acceso ${userType}`,
        message: `${userName} (${userId}) ha iniciado sesión`,
        timestamp: new Date().toISOString(),
        read: false,
        user_type: userType,
        user_id: userId,
        user_name: userName
      };

      const { error } = await supabase
        .from('admin_notifications')
        .insert(notification);

      if (error) {
        console.error('Error sending notification:', error);
      }

    } catch (error) {
      console.error('Error in sendRealTimeNotification:', error);
    }
  };

  // Login para administradores
  const loginAdmin = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        await logAccess('admin', email, email, false, { error: error.message });
        throw error;
      }

      const user = data.user;
      setUser(user);
      
      // Registrar acceso exitoso
      await logAccess('admin', user.email, user.email, true);
      
      return { user, error: null };
    } catch (error) {
      return { user: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Login para clientes
  const loginClient = async (accessId, password) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('client_access_credentials')
        .select(`
          *,
          customer:customers_(
            id,
            razon_social,
            alias,
            celular
          )
        `)
        .eq('access_id', accessId)
        .eq('password', password)
        .single();

      if (error || !data) {
        await logAccess('client', accessId, accessId, false, { error: 'Invalid credentials' });
        throw new Error('Credenciales inválidas');
      }

      const clientUser = {
        id: data.access_id,
        access_id: data.access_id,
        customer_id: data.customer_id,
        customer_name: data.customer?.razon_social || data.customer?.alias,
        phone: data.customer?.celular,
        type: 'client'
      };

      setUser(clientUser);
      
      // Registrar acceso exitoso
      await logAccess('client', accessId, clientUser.customer_name || accessId, true, {
        customer_id: data.customer_id
      });
      
      return { user: clientUser, error: null };
    } catch (error) {
      return { user: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      if (user) {
        if (user.type === 'client') {
          await logLogout(user.access_id, 'client');
        } else {
          await logLogout(user.email, 'admin');
          await supabase.auth.signOut();
        }
      }
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Verificar sesión existente al cargar
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  return {
    user,
    loading,
    loginAdmin,
    loginClient,
    logout,
    logAccess,
    logLogout
  };
};