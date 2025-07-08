import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Select, MenuItem, Button, Switch } from '@mui/material';
import { useUserRoles } from '../hooks/useUserRoles';

const ROLES = ['admin', 'vendedor', 'supervisor'];

export default function GestionRoles() {
  const { user, roles, loading } = useUserRoles();
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioRoles, setUsuarioRoles] = useState({});
  const [usuarioActivo, setUsuarioActivo] = useState({});
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    async function fetchUsuarios() {
      // Usa la función RPC para obtener usuarios de auth.users
      const { data } = await supabase.rpc('get_all_users');
      setUsuarios(data || []);
      // Cargar roles y estado activo de todos los usuarios
      const { data: rolesData } = await supabase.from('usuario_roles').select('user_id, roles(nombre), activo');
      const rolesMap = {};
      const activoMap = {};
      (rolesData || []).forEach(r => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        if (r.roles?.nombre) rolesMap[r.user_id].push(r.roles.nombre);
        activoMap[r.user_id] = r.activo;
      });
      setUsuarioRoles(rolesMap);
      setUsuarioActivo(activoMap);
    }
    if (roles.includes('developer') || roles.includes('admin')) fetchUsuarios();
  }, [roles]);

  const handleRoleChange = async (userId, newRole) => {
    if (usuarios.find(u => u.id === userId)?.email === 'melvinalvin.bello@gmail.com') {
      setMensaje('No puedes modificar el rol del desarrollador');
      return;
    }
    // Busca el rol_id correspondiente al nombre
    const { data: rolData } = await supabase.from('roles').select('id').eq('nombre', newRole).single();
    if (!rolData) {
      setMensaje('Rol no encontrado');
      return;
    }
    // Elimina roles anteriores y asigna el nuevo
    await supabase.from('usuario_roles').delete().eq('user_id', userId);
    await supabase.from('usuario_roles').insert([{ user_id: userId, rol_id: rolData.id }]);
    setMensaje('Rol actualizado');
    // Refresca
    const { data: rolesData } = await supabase.from('usuario_roles').select('user_id, roles(nombre)');
    const rolesMap = {};
    (rolesData || []).forEach(r => {
      if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
      if (r.roles?.nombre) rolesMap[r.user_id].push(r.roles.nombre);
    });
    setUsuarioRoles(rolesMap);
  };

  const handleActivoChange = async (userId, checked) => {
    // No permitir desactivar al developer principal
    if (usuarios.find(u => u.id === userId)?.email === 'melvinalvin.bello@gmail.com') {
      setMensaje('No puedes desactivar al desarrollador');
      return;
    }
    const { error } = await supabase
      .from('usuario_roles')
      .update({ activo: checked })
      .eq('user_id', userId);
    if (error) {
      setMensaje('Error al actualizar el estado');
      return;
    }
    setMensaje('Estado actualizado');
    // Refresca
    const { data: rolesData } = await supabase.from('usuario_roles').select('user_id, roles(nombre), activo');
    const activoMap = {};
    (rolesData || []).forEach(r => {
      activoMap[r.user_id] = r.activo;
    });
    setUsuarioActivo(activoMap);
  };

  if (loading) return <div>Cargando...</div>;
  if (!roles.includes('developer') && !roles.includes('admin')) return <div>No tienes permiso para ver esta sección</div>;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>Gestión de Roles de Usuarios</Typography>
      {mensaje && <Typography color="primary">{mensaje}</Typography>}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Email</TableCell>
            <TableCell>Rol</TableCell>
            <TableCell>Activo</TableCell>
            <TableCell>Acción</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {usuarios.map(u => (
            <TableRow key={u.id}>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                <Select
                  value={usuarioRoles[u.id]?.[0] || ''}
                  onChange={e => handleRoleChange(u.id, e.target.value)}
                  disabled={u.email === 'melvinalvin.bello@gmail.com'}
                  size="small"
                >
                  <MenuItem value="">Sin rol</MenuItem>
                  {ROLES.map(r => (
                    <MenuItem key={r} value={r}>{r}</MenuItem>
                  ))}
                </Select>
              </TableCell>
              <TableCell>
                <Switch
                  checked={!!usuarioActivo[u.id]}
                  onChange={e => handleActivoChange(u.id, e.target.checked)}
                  disabled={!(roles.includes('developer') || roles.includes('admin')) || u.email === 'melvinalvin.bello@gmail.com'}
                  color="primary"
                />
              </TableCell>
              <TableCell>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRoleChange(u.id, usuarioRoles[u.id]?.[0] || '')}
                  disabled={u.email === 'melvinalvin.bello@gmail.com'}
                >
                  Guardar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}