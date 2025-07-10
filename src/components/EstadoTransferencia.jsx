import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Snackbar, Alert, CircularProgress } from '@mui/material';

function EstadoTransferencia() {
  const { id } = useParams();
  const [transferencia, setTransferencia] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [responsable, setResponsable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [userAuth, setUserAuth] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // Obtener transferencia
      const { data: transferenciaData, error: errorTransf } = await supabase
        .from('transferencias')
        .select('*')
        .eq('id', id)
        .single();
      if (errorTransf || !transferenciaData) {
        setMensaje('No se encontró la transferencia');
        setLoading(false);
        return;
      }
      setTransferencia(transferenciaData);

      // Obtener detalles
      const { data: detallesData } = await supabase
        .from('detalle_transferencias')
        .select('*, productos(nombre)')
        .eq('transferencia_id', id);
      setDetalles(detallesData || []);

      // Obtener usuario creador
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', transferenciaData.usuario_id)
        .single();
      setUsuario(usuarioData);

      // Obtener usuario responsable (si existe)
      if (transferenciaData.usuario_responsable_id) {
        const { data: responsableData } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', transferenciaData.usuario_responsable_id)
          .single();
        setResponsable(responsableData);
      } else {
        setResponsable(null);
      }

      // Obtener usuario autenticado y sus roles
      const { data: { user } } = await supabase.auth.getUser();
      setUserAuth(user);
      if (user) {
        // Suponiendo que tienes una tabla roles_usuarios con user_id y rol
        const { data: rolesData } = await supabase
          .from('roles_usuarios')
          .select('rol')
          .eq('user_id', user.id);
        setUserRoles(rolesData ? rolesData.map(r => r.rol) : []);
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  const puedeTransitar = userRoles.includes('transportista') && transferencia && transferencia.estado === 'pendiente';
  const puedeRecibir = (userRoles.includes('admin') || userRoles.includes('vendedor')) && transferencia && (transferencia.estado === 'pendiente' || transferencia.estado === 'en transito');

  const handleActualizarEstado = async () => {
    setActualizando(true);
    let nuevoEstado = transferencia.estado;
    if (puedeTransitar) {
      nuevoEstado = 'en transito';
    } else if (puedeRecibir) {
      nuevoEstado = 'recibido';
    }
    const { error } = await supabase
      .from('transferencias')
      .update({
        estado: nuevoEstado,
        usuario_responsable_id: userAuth.id
      })
      .eq('id', transferencia.id);
    if (error) {
      setMensaje('Error al actualizar el estado');
    } else {
      setMensaje('Estado actualizado correctamente');
      // Refrescar datos
      setTransferencia({ ...transferencia, estado: nuevoEstado, usuario_responsable_id: userAuth.id });
      setResponsable(userAuth);
    }
    setActualizando(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!transferencia) {
    return <Typography color="error">No se encontró la transferencia</Typography>;
  }

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h6" gutterBottom>Estado de la Transferencia</Typography>
      <Typography variant="subtitle1" gutterBottom>
        Estado actual: <b>{transferencia.estado}</b>
      </Typography>
      <Typography variant="body2" gutterBottom>
        Fecha: {new Date(transferencia.created_at).toLocaleString()}
      </Typography>
      <Typography variant="body2" gutterBottom>
        Usuario que la creó: {usuario ? usuario.nombre || usuario.email || usuario.id : transferencia.usuario_id}
      </Typography>
      {responsable && (
        <Typography variant="body2" gutterBottom>
          Responsable actual: {responsable.nombre || responsable.email || responsable.id}
        </Typography>
      )}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Productos incluidos:</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell>Cantidad</TableCell>
              <TableCell>Precio Unitario</TableCell>
              <TableCell>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {detalles.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>{item.productos?.nombre || item.producto_id}</TableCell>
                <TableCell>{item.cantidad}</TableCell>
                <TableCell>${item.precio_unitario?.toFixed(2)}</TableCell>
                <TableCell>${(item.cantidad * item.precio_unitario).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      {(puedeTransitar || puedeRecibir) && (
        <Button
          variant="contained"
          color={puedeTransitar ? 'warning' : 'success'}
          sx={{ mt: 3 }}
          onClick={handleActualizarEstado}
          disabled={actualizando}
        >
          {puedeTransitar ? 'Marcar como En Tránsito' : 'Marcar como Recibido'}
        </Button>
      )}
      <Snackbar open={!!mensaje} autoHideDuration={3000} onClose={() => setMensaje('')}>
        <Alert onClose={() => setMensaje('')} severity="info" sx={{ width: '100%' }}>
          {mensaje}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

export default EstadoTransferencia; 