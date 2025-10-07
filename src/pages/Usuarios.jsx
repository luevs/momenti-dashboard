import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import { supabase } from '../supabaseClient';
import useCurrentUser from '../utils/useCurrentUser';

export default function Usuarios() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('operator');
  const [newActive, setNewActive] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('operator');
  const [editActive, setEditActive] = useState(true);
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users_admin')
        .select('id, username, full_name, role, active, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading users_admin:', error);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching users:', err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!q) return users;
    return users.filter(u => (u.username || '').toLowerCase().includes(q.toLowerCase()) || (u.full_name || '').toLowerCase().includes(q.toLowerCase()));
  }, [users, q]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!newUsername.trim() || !newPassword || !newEmail.trim()) return setError('Usuario, contraseña y email obligatorios');

    try {
      // Preferimos llamar a la RPC 'create_user_admin' si existe (backend hará hash de la password)
      const rpcPayload = {
        p_username: newUsername.trim(),
        p_password: newPassword,
        p_email: newEmail || null,
        p_full_name: newFullName || null,
        p_role: newRole || 'operator',
        p_active: newActive === true,
      };

      const rpc = await supabase.rpc('create_user_admin', rpcPayload);

      if (!rpc.error && rpc.data) {
        // rpc.data puede ser un array o un objeto según la función
        const created = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
        setUsers(prev => [created, ...prev]);
        setShowNewModal(false);
        setNewUsername(''); setNewPassword(''); setNewEmail(''); setNewFullName(''); setNewRole('operator'); setNewActive(true);
        return;
      }

      // Si la RPC no existe o devuelve error, no intentamos insertar 'password' directamente
      // porque la tabla usa 'password_hash'. Informamos al usuario para que ejecute la función
      // `create_user_admin` en Supabase o exponga un endpoint seguro.
      if (rpc.error) {
        console.warn('RPC create_user_admin error:', rpc.error);
        // Mostrar mensaje detallado si el servidor devuelve detalles
        const details = rpc.error?.message || JSON.stringify(rpc.error);
        setError(`No se pudo crear usuario: ${details}. Asegúrate de que la función SQL create_user_admin exista y esté accesible.`);
        return;
      }
    } catch (err) {
      console.error('Unexpected error creating user:', err);
      setError('Error inesperado al crear usuario. Si la tabla usa password_hash ejecuta la función create_user_admin en Supabase.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsProcessing(true);
    setError('');
    try {
      const payload = {
        full_name: editFullName || null,
        email: editEmail || null,
        role: editRole || 'operator',
        active: !!editActive,
      };

      const { data, error: updateErr } = await supabase
        .from('users_admin')
        .update(payload)
        .eq('id', selectedUser.id)
        .select('*')
        .single();

      if (updateErr) {
        console.error('Error updating user:', updateErr);
        setError('No se pudo actualizar el usuario: ' + (updateErr.message || JSON.stringify(updateErr)));
      } else {
        // replace in local list
        setUsers(prev => prev.map(u => u.id === data.id ? data : u));
        setShowEditModal(false);
        setSelectedUser(null);
      }
    } catch (err) {
      console.error('Unexpected error updating user:', err);
      setError('Error inesperado al actualizar usuario');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsProcessing(true);
    setError('');
    try {
      // Require a reason to be provided
      if (!deleteReason || !deleteReason.trim()) {
        setError('Debes indicar la razón para eliminar el usuario');
        setIsProcessing(false);
        return;
      }

      // Try an RPC that performs the audit-log + delete in one transaction (recommended)
      // If you add this RPC server-side, it should accept (p_user_id, p_deleted_by, p_reason)
      const rpcParams = {
        p_user_id: selectedUser.id,
        p_deleted_by: (currentUser && (currentUser.id || currentUser.user_id || currentUser.username)) || null,
        p_reason: deleteReason,
      };

      const { data: rpcData, error: rpcErr } = await supabase.rpc('delete_user_with_reason', rpcParams);

      if (!rpcErr) {
        // RPC succeeded (server handled audit + delete). Remove locally as well.
        setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
        setShowDeleteModal(false);
        setSelectedUser(null);
      } else {
        // RPC not available or failed: fallback to inserting an audit row then deleting
        console.warn('RPC delete_user_with_reason failed or not available, falling back to client-side audit+delete', rpcErr);

        // try to insert audit row (if table exists)
        try {
          const { error: auditErr } = await supabase
            .from('user_deletions')
            .insert([{
              user_id: selectedUser.id,
              deleted_by: (currentUser && (currentUser.id || currentUser.user_id || currentUser.username)) || null,
              reason: deleteReason,
            }]);

          if (auditErr) {
            console.warn('Audit insert failed (table may not exist):', auditErr);
          }
        } catch (e) {
          console.warn('Unexpected error inserting audit row:', e);
        }

        // finally delete the user row
        const { error: delErr } = await supabase
          .from('users_admin')
          .delete()
          .eq('id', selectedUser.id);

        if (delErr) {
          console.error('Error deleting user:', delErr);
          setError('No se pudo eliminar el usuario: ' + (delErr.message || JSON.stringify(delErr)));
        } else {
          setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
          setShowDeleteModal(false);
          setSelectedUser(null);
        }
      }
    } catch (err) {
      console.error('Unexpected error deleting user:', err);
      setError('Error inesperado al eliminar usuario');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Usuarios</h1>
        <div className="flex items-center gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar usuario" className="border rounded px-2 py-1 text-sm" />
          {isAdmin ? (
            <button onClick={() => setShowNewModal(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Nuevo</button>
          ) : (
            <div className="text-xs text-gray-500 px-2 py-1">No tienes permisos para crear usuarios</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded border p-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Cargando usuarios...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No hay usuarios</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="py-2">Usuario</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Activo</th>
                  <th>Creado</th>
                  {isAdmin && <th>Acciones</th>}
                </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="py-2">{u.username}</td>
                  <td>{u.full_name || '—'}</td>
                  <td>{u.role || 'operator'}</td>
                  <td>{u.active ? 'Sí' : 'No'}</td>
                  <td className="text-xs text-gray-400">{u.created_at ? new Date(u.created_at).toLocaleString() : ''}</td>
                  {isAdmin && (
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => {
                          // open edit modal and prefill
                          setSelectedUser(u);
                          setEditFullName(u.full_name || '');
                          setEditEmail(u.email || '');
                          setEditRole(u.role || 'operator');
                          setEditActive(!!u.active);
                          setShowEditModal(true);
                        }} className="text-blue-600 text-xs">Editar</button>
                        <button onClick={() => {
                          setSelectedUser(u);
                          setDeleteReason('');
                          setShowDeleteModal(true);
                        }} className="text-red-600 text-xs">Eliminar</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showNewModal} title="Nuevo usuario" onClose={() => setShowNewModal(false)}>
        <form onSubmit={handleCreate}>
          <div className="mb-2">
            <label className="block text-xs text-gray-600">Usuario</label>
            <input value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div className="mb-2">
            <label className="block text-xs text-gray-600">Contraseña</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div className="mb-2">
            <label className="block text-xs text-gray-600">Email</label>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="correo@ejemplo.com" />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-600">Rol</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full border rounded px-2 py-1">
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Activo</label>
              <div className="flex items-center gap-2 mt-1">
                <input id="active-toggle" type="checkbox" checked={newActive} onChange={e => setNewActive(e.target.checked)} className="h-4 w-4" />
                <label htmlFor="active-toggle" className="text-sm text-gray-600">{newActive ? 'Sí' : 'No'}</label>
              </div>
            </div>
          </div>
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNewModal(false)} className="px-3 py-1 border rounded">Cancelar</button>
            <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded">Crear</button>
          </div>
        </form>
      </Modal>
      {/* Edit user modal */}
      <Modal open={showEditModal} title={`Editar usuario ${selectedUser?.username || ''}`} onClose={() => { setShowEditModal(false); setSelectedUser(null); }}>
        <form onSubmit={handleUpdate}>
          <div className="mb-2">
            <label className="block text-xs text-gray-600">Nombre</label>
            <input value={editFullName} onChange={e => setEditFullName(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div className="mb-2">
            <label className="block text-xs text-gray-600">Email</label>
            <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-600">Rol</label>
              <select value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full border rounded px-2 py-1">
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Activo</label>
              <div className="flex items-center gap-2 mt-1">
                <input id="edit-active-toggle" type="checkbox" checked={editActive} onChange={e => setEditActive(e.target.checked)} className="h-4 w-4" />
                <label htmlFor="edit-active-toggle" className="text-sm text-gray-600">{editActive ? 'Sí' : 'No'}</label>
              </div>
            </div>
          </div>
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowEditModal(false); setSelectedUser(null); }} className="px-3 py-1 border rounded">Cancelar</button>
            <button type="submit" disabled={isProcessing} className="px-3 py-1 bg-green-600 text-white rounded">{isProcessing ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={showDeleteModal} title={`Eliminar usuario ${selectedUser?.username || ''}`} onClose={() => { setShowDeleteModal(false); setSelectedUser(null); }}>
        <form onSubmit={handleDelete}>
          <div className="mb-2 text-sm text-gray-700">¿Estás seguro que quieres eliminar este usuario? Por favor indica la razón.</div>
          <div className="mb-2">
            <label className="block text-xs text-gray-600">Razón</label>
            <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)} className="w-full border rounded px-2 py-1" rows={3} />
          </div>
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }} className="px-3 py-1 border rounded">Cancelar</button>
            <button type="submit" disabled={isProcessing} className="px-3 py-1 bg-red-600 text-white rounded">{isProcessing ? 'Eliminando...' : 'Eliminar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
