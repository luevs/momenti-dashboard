import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const MonitoringPanel = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
    
    // Configurar subscripciones en tiempo real
    const loginLogsSubscription = supabase
      .channel('login_logs_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'login_logs' 
        }, 
        (payload) => {
          console.log('Nuevo login detectado:', payload);
          loadRecentLogins();
          loadActiveSessions();
          showNotification(payload);
        }
      )
      .subscribe();

    const notificationsSubscription = supabase
      .channel('notifications_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'admin_notifications' 
        }, 
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          // Mostrar notificación del navegador
          if (Notification.permission === 'granted') {
            new Notification(payload.new.title, {
              body: payload.new.message,
              icon: '/momenti-favicon/favicon.ico'
            });
          }
        }
      )
      .subscribe();

    return () => {
      loginLogsSubscription.unsubscribe();
      notificationsSubscription.unsubscribe();
    };
  }, []);

  // Solicitar permisos de notificación
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadActiveSessions(),
        loadRecentLogins(),
        loadStatistics(),
        loadNotifications()
      ]);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSessions = async () => {
    const { data, error } = await supabase
      .from('active_sessions')
      .select('*')
      .order('login_time', { ascending: false });

    if (!error) {
      setActiveSessions(data || []);
    }
  };

  const loadRecentLogins = async () => {
    const { data, error } = await supabase
      .from('login_logs')
      .select('*')
      .order('login_time', { ascending: false })
      .limit(20);

    if (!error) {
      setRecentLogins(data || []);
    }
  };

  const loadStatistics = async () => {
    const { data, error } = await supabase
      .from('login_statistics')
      .select('*');

    if (!error) {
      const stats = {};
      data?.forEach(stat => {
        stats[stat.user_type] = stat;
      });
      setStatistics(stats);
    }
  };

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (!error) {
      setNotifications(data || []);
    }
  };

  const showNotification = (payload) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      const login = payload.new;
      if (Notification.permission === 'granted') {
        new Notification(`Nuevo acceso ${login.user_type}`, {
          body: `${login.user_name} ha iniciado sesión`,
          icon: '/momenti-favicon/favicon.ico'
        });
      }
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    await supabase
      .from('admin_notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    
    const hours = Math.floor(duration.hours || 0);
    const minutes = Math.floor(duration.minutes || 0);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusColor = (status, userType) => {
    if (userType === 'client') {
      return status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
    }
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Monitor de Sesiones
        </h1>
        <button 
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Admins Activos</h3>
          <p className="text-2xl font-bold text-green-600">
            {activeSessions.filter(s => s.user_type === 'admin' && s.session_status === 'active').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Clientes Activos</h3>
          <p className="text-2xl font-bold text-blue-600">
            {activeSessions.filter(s => s.user_type === 'client' && s.session_status === 'active').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Logins Hoy</h3>
          <p className="text-2xl font-bold text-indigo-600">
            {recentLogins.filter(l => 
              new Date(l.login_time).toDateString() === new Date().toDateString()
            ).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Alertas Pendientes</h3>
          <p className="text-2xl font-bold text-red-600">
            {notifications.filter(n => !n.read).length}
          </p>
        </div>
      </div>

      {/* Sesiones Activas */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            🟢 Sesiones Activas ({activeSessions.filter(s => s.session_status === 'active').length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inicio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeSessions.filter(s => s.session_status === 'active').map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {session.user_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {session.user_id}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      session.user_type === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {session.user_type === 'admin' ? '👤 Admin' : '👥 Cliente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.ip_address || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(session.login_time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(session.session_duration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      getStatusColor(session.session_status, session.user_type)
                    }`}>
                      {session.session_status === 'active' ? '🟢 Activa' : '⚪ Expirada'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Accesos Recientes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            📋 Accesos Recientes
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resultado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha/Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentLogins.slice(0, 10).map((login) => (
                <tr key={login.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {login.user_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {login.user_id}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      login.user_type === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {login.user_type === 'admin' ? '👤 Admin' : '👥 Cliente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      login.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {login.success ? '✅ Exitoso' : '❌ Fallido'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(login.login_time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {login.ip_address || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            🔔 Notificaciones ({notifications.filter(n => !n.read).length} sin leer)
          </h2>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {notifications.slice(0, 10).map((notification) => (
            <div 
              key={notification.id}
              className={`px-6 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                !notification.read ? 'bg-blue-50' : ''
              }`}
              onClick={() => markNotificationAsRead(notification.id)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className={`text-sm font-medium ${
                    !notification.read ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {notification.title}
                  </h4>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MonitoringPanel;