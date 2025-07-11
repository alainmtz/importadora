import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Snackbar, Alert, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

// Función para obtener la transferencia y detalles
const fetchTransferencia = async (id) => {
  // Obtener transferencia
  const { data: transferenciaData, error: errorTransf, status } = await supabase
    .from('transferencias')
    .select('*')
    .eq('id', id)
    .single();
  if (status === 429) {
    const err = new Error('Rate limit reached');
    err.status = 429;
    throw err;
  }
  if (errorTransf || !transferenciaData) {
    throw new Error('No se encontró la transferencia');
  }

  // Obtener detalles
  const { data: detallesData, error: errorDetalles, status: statusDetalles } = await supabase
    .from('detalle_transferencias')
    .select('*, productos(nombre)')
    .eq('transferencia_id', id);
  if (statusDetalles === 429) {
    const err = new Error('Rate limit reached');
    err.status = 429;
    throw err;
  }
  if (errorDetalles) {
    throw new Error('Error al obtener los detalles de la transferencia');
  }

  return { transferencia: transferenciaData, detalles: detallesData || [] };
};

function EstadoTransferencia() {
  const { id } = useParams();
  const [mensaje, setMensaje] = useState('');
  const [userAuth, setUserAuth] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [actualizando, setActualizando] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['transferencia', id],
    queryFn: () => fetchTransferencia(id),
    retry: (failureCount, error) => {
      // Solo reintenta si es un 429 (rate limit)
      return error?.status === 429 && failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000), // backoff exponencial
  });

  useEffect(() => {
    async function fetchUserAndRoles() {
      if (data) {
        // Obtener usuario autenticado
        const { data: userData, error: userError } = await supabase.auth.getUser();
        const user = userData?.user;
        setUserAuth(user);
        if (user) {
          // Obtener roles del usuario
          const { data: rolesData, error: rolesError } = await supabase
            .from('usuario_roles')
            .select('roles(nombre)')  // o el campo correcto de la tabla roles
            .eq('user_id', user.id);
          setUserRoles(rolesData ? rolesData.map(r => r.roles?.nombre) : []);
          if (!rolesData || rolesData.length === 0) {
            setMensaje('Tu usuario no tiene roles asignados. Contacta al administrador.');
          }
          if (rolesError) {
            setMensaje('Error al obtener los roles del usuario.');
          }
          // Console.log para depurar
          console.log('Usuario autenticado:', {
            id: user.id,
            email: user.email,
            roles: rolesData ? rolesData.map(r => r.roles?.nombre) : []
          });
        } else if (userError) {
          setMensaje('Error al obtener el usuario autenticado.');
        }
      }
    }
    fetchUserAndRoles();
  }, [data]);

  const transferencia = data?.transferencia;
  const detalles = data?.detalles || [];

  const puedeTransitar = userRoles.includes('transportista') && transferencia && transferencia.estado === 'pendiente';
  const puedeRecibir = (userRoles.includes('admin') || userRoles.includes('vendedor') || userRoles.includes('developer')) && transferencia && (transferencia.estado === 'pendiente' || transferencia.estado === 'en transito');

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
        usuario_id: userAuth.id
      })
      .eq('id', transferencia.id);
    if (error) {
      setMensaje('Error al actualizar el estado');
      setActualizando(false);
      return;
    }

    // --- Lógica de inventario al recibir transferencia ---
    if (nuevoEstado === 'recibido') {
      // Por cada producto en la transferencia
      for (const item of detalles) {
        // Restar en origen
        const { data: invOrigen } = await supabase
          .from('inventario')
          .select('*')
          .eq('producto_id', item.producto_id)
          .eq('sucursal_id', transferencia.sucursal_origen_id);
        if (invOrigen && invOrigen.length > 0) {
          await supabase
            .from('inventario')
            .update({ cantidad: invOrigen[0].cantidad - item.cantidad })
            .eq('id', invOrigen[0].id);
        }
        // Sumar en destino
        const { data: invDestino } = await supabase
          .from('inventario')
          .select('*')
          .eq('producto_id', item.producto_id)
          .eq('sucursal_id', transferencia.sucursal_destino_id);
        if (invDestino && invDestino.length > 0) {
          await supabase
            .from('inventario')
            .update({ cantidad: invDestino[0].cantidad + item.cantidad })
            .eq('id', invDestino[0].id);
        } else {
          await supabase
            .from('inventario')
            .insert([{ producto_id: item.producto_id, sucursal_id: transferencia.sucursal_destino_id, cantidad: item.cantidad }]);
        }
      }
    }
    // --- Fin lógica de inventario ---

    setMensaje('Estado actualizado correctamente');
    setActualizando(false);
    // React Query ya maneja la revalidación del cache
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">{error.message}</Typography>;
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
        Fecha: {new Date(transferencia.created_at || transferencia.fecha_transferencia).toLocaleString()}
      </Typography>
      <Typography variant="body2" gutterBottom>
        Usuario que la creó: {transferencia.usuario_email || transferencia.usuario_id}
      </Typography>
      {transferencia.usuario_responsable_id && (
        <Typography variant="body2" gutterBottom>
          Responsable actual: {transferencia.usuario_responsable_id}
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
      {userAuth && (puedeTransitar || puedeRecibir) && (
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
      {!userAuth && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Debes iniciar sesión para cambiar el estado de la transferencia.
        </Alert>
      )}
      {userAuth && userRoles.length === 0 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Tu usuario no tiene roles asignados. Contacta al administrador.
        </Alert>
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