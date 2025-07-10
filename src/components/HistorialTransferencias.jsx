import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Paper, Box, Typography, Select, MenuItem, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Snackbar, Alert, Grid, InputLabel, FormControl, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, useTheme, useMediaQuery
} from '@mui/material';
import { Visibility, Edit, Download } from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeSVG } from 'qrcode.react';

function HistorialTransferencias() {
  const [transferencias, setTransferencias] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [filtros, setFiltros] = useState({
    sucursalOrigen: '',
    sucursalDestino: '',
    estado: '',
    fechaInicio: '',
    fechaFin: '',
    usuario: '',
    observaciones: ''
  });
  const [mensaje, setMensaje] = useState('');
  const [detalleAbierto, setDetalleAbierto] = useState(null);
  const [detalleTransferencia, setDetalleTransferencia] = useState([]);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrTransferId, setQrTransferId] = useState(null);

  // Responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchSucursales();
    fetchTransferencias();
  }, []);

  const fetchSucursales = async () => {
    const { data } = await supabase.from('sucursales').select('*');
    setSucursales(data || []);
  };

  const fetchTransferencias = async () => {
    let query = supabase
      .from('transferencias')
      .select(`
        *,
        sucursal_origen:sucursal_origen_id(nombre),
        sucursal_destino:sucursal_destino_id(nombre)
      `)
      .order('fecha_transferencia', { ascending: false });

    // Aplicar filtros
    if (filtros.sucursalOrigen) query = query.eq('sucursal_origen_id', filtros.sucursalOrigen);
    if (filtros.sucursalDestino) query = query.eq('sucursal_destino_id', filtros.sucursalDestino);
    if (filtros.estado) query = query.eq('estado', filtros.estado);
    if (filtros.fechaInicio) query = query.gte('fecha_transferencia', filtros.fechaInicio);
    if (filtros.fechaFin) query = query.lte('fecha_transferencia', filtros.fechaFin);
    // Nota: Los filtros de usuario y observaciones se aplicarán después de obtener los datos

    const { data, error } = await query;
    if (error) {
      setMensaje('Error al cargar transferencias');
      return;
    }

    // Obtener todos los usuarios para mapear IDs a emails
    const { data: usuarios } = await supabase.rpc('get_all_users');
    const usuariosMap = {};
    if (usuarios) {
      usuarios.forEach(u => {
        usuariosMap[u.id] = u.email;
      });
    }

    // Mapear transferencias con emails de usuarios y aplicar filtros adicionales
    let transferenciasConUsuarios = data.map(t => ({
      ...t,
      usuario: { email: usuariosMap[t.usuario_id] || 'Usuario no encontrado' }
    }));

    // Aplicar filtros de usuario y observaciones
    if (filtros.usuario) {
      transferenciasConUsuarios = transferenciasConUsuarios.filter(t => 
        t.usuario.email.toLowerCase().includes(filtros.usuario.toLowerCase())
      );
    }
    if (filtros.observaciones) {
      transferenciasConUsuarios = transferenciasConUsuarios.filter(t => 
        t.observaciones?.toLowerCase().includes(filtros.observaciones.toLowerCase())
      );
    }

    setTransferencias(transferenciasConUsuarios || []);
  };

  const limpiarFiltros = () => {
    setFiltros({
      sucursalOrigen: '',
      sucursalDestino: '',
      estado: '',
      fechaInicio: '',
      fechaFin: '',
      usuario: '',
      observaciones: ''
    });
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text('Historial de Transferencias', 14, 20);
    
    // Filtros aplicados
    doc.setFontSize(10);
    let yPos = 30;
    if (filtros.fechaInicio || filtros.fechaFin) {
      doc.text(`Período: ${filtros.fechaInicio || 'Inicio'} - ${filtros.fechaFin || 'Fin'}`, 14, yPos);
      yPos += 5;
    }
    if (filtros.estado) {
      doc.text(`Estado: ${filtros.estado}`, 14, yPos);
      yPos += 5;
    }
    
    // Datos de las transferencias
    const rows = transferencias.map(t => [
      new Date(t.fecha_transferencia).toLocaleDateString(),
      t.sucursal_origen?.nombre || 'N/A',
      t.sucursal_destino?.nombre || 'N/A',
      t.usuario?.email || 'N/A',
      t.estado,
      t.observaciones || '-'
    ]);

    autoTable(doc, {
      head: [['Fecha', 'Origen', 'Destino', 'Usuario', 'Estado', 'Observaciones']],
      body: rows,
      startY: yPos + 5,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      margin: { left: 14, right: 14 },
    });

    // Estadísticas
    const totalTransferencias = transferencias.length;
    const completadas = transferencias.filter(t => t.estado === 'completada').length;
    const pendientes = transferencias.filter(t => t.estado === 'pendiente').length;
    const canceladas = transferencias.filter(t => t.estado === 'cancelada').length;

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Total de transferencias: ${totalTransferencias}`, 14, finalY);
    doc.text(`Completadas: ${completadas}`, 14, finalY + 5);
    doc.text(`Pendientes: ${pendientes}`, 14, finalY + 10);
    doc.text(`Canceladas: ${canceladas}`, 14, finalY + 15);

    // Generar nombre del archivo
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `historial-transferencias-${fecha}.pdf`;
    
    doc.save(nombreArchivo);
    setMensaje('PDF exportado correctamente');
  };

  const cambiarEstado = async (transferenciaId, nuevoEstado) => {
    const { error } = await supabase
      .from('transferencias')
      .update({ estado: nuevoEstado })
      .eq('id', transferenciaId);

    if (error) {
      setMensaje('Error al cambiar estado');
    } else {
      setMensaje('Estado actualizado correctamente');
      fetchTransferencias();
    }
  };

  const verDetalle = async (transferenciaId) => {
    const { data, error } = await supabase
      .from('detalle_transferencias')
      .select(`
        *,
        producto:producto_id(nombre, codigo)
      `)
      .eq('transferencia_id', transferenciaId);

    if (error) {
      setMensaje('Error al cargar detalles');
    } else {
      setDetalleTransferencia(data || []);
      setDetalleAbierto(transferenciaId);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente': return 'warning';
      case 'completada': return 'success';
      case 'cancelada': return 'error';
      default: return 'default';
    }
  };

  return (
    <Paper elevation={3} sx={{ 
      p: isMobile ? 2 : 3, 
      mb: 3, 
      maxWidth: isMobile ? '100%' : 1200,
      mx: 'auto'
    }}>
      <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
        Historial de Transferencias
      </Typography>
      
      {/* Filtros */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>Filtros</Typography>
        <Grid container spacing={isMobile ? 1 : 2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Sucursal Origen</InputLabel>
              <Select
                value={filtros.sucursalOrigen}
                onChange={(e) => setFiltros({...filtros, sucursalOrigen: e.target.value})}
                label="Sucursal Origen"
              >
                <MenuItem value="">Todas</MenuItem>
                {sucursales.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {isMobile ? s.nombre : `${s.nombre} (${s.tipo})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Sucursal Destino</InputLabel>
              <Select
                value={filtros.sucursalDestino}
                onChange={(e) => setFiltros({...filtros, sucursalDestino: e.target.value})}
                label="Sucursal Destino"
              >
                <MenuItem value="">Todas</MenuItem>
                {sucursales.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {isMobile ? s.nombre : `${s.nombre} (${s.tipo})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filtros.estado}
                onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
                label="Estado"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="pendiente">Pendiente</MenuItem>
                <MenuItem value="en transito">En Tránsito</MenuItem>
                <MenuItem value="recibido">Recibido</MenuItem>
                <MenuItem value="completada">Completada</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Usuario"
              value={filtros.usuario}
              onChange={(e) => setFiltros({...filtros, usuario: e.target.value})}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Observaciones"
              value={filtros.observaciones}
              onChange={(e) => setFiltros({...filtros, observaciones: e.target.value})}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Fecha Inicio"
              type="date"
              value={filtros.fechaInicio}
              onChange={(e) => setFiltros({...filtros, fechaInicio: e.target.value})}
              fullWidth
              size={isMobile ? "small" : "medium"}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Fecha Fin"
              type="date"
              value={filtros.fechaFin}
              onChange={(e) => setFiltros({...filtros, fechaFin: e.target.value})}
              fullWidth
              size={isMobile ? "small" : "medium"}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            onClick={fetchTransferencias}
            size={isMobile ? "small" : "medium"}
          >
            Filtrar
          </Button>
          <Button 
            variant="outlined" 
            onClick={limpiarFiltros}
            size={isMobile ? "small" : "medium"}
          >
            Limpiar
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Download />}
            onClick={exportarPDF}
            size={isMobile ? "small" : "medium"}
          >
            {isMobile ? "PDF" : "Exportar PDF"}
          </Button>
        </Box>
      </Box>

      {/* Tabla */}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size={isMobile ? "small" : "medium"}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Fecha</TableCell>
              <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Origen</TableCell>
              <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Destino</TableCell>
              <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Usuario</TableCell>
              <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Estado</TableCell>
              <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Observaciones</TableCell>
              <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Acciones</TableCell>
              <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>QR</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transferencias.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                  {new Date(t.fecha_transferencia || t.created_at).toLocaleString()}
                </TableCell>
                <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                  {isMobile ? t.sucursal_origen?.nombre?.split(' ')[0] : t.sucursal_origen?.nombre}
                </TableCell>
                <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                  {isMobile ? t.sucursal_destino?.nombre?.split(' ')[0] : t.sucursal_destino?.nombre}
                </TableCell>
                <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                  {isMobile ? t.usuario?.email?.split('@')[0] : t.usuario?.email}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={t.estado} 
                    color={getEstadoColor(t.estado)} 
                    size={isMobile ? "small" : "medium"}
                    sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                  />
                </TableCell>
                <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                  {isMobile ? (t.observaciones || '-').substring(0, 20) + '...' : t.observaciones || '-'}
                </TableCell>
                <TableCell>
                  <IconButton 
                    onClick={() => verDetalle(t.id)}
                    size={isMobile ? "small" : "medium"}
                  >
                    <Visibility fontSize={isMobile ? "small" : "medium"} />
                  </IconButton>
                </TableCell>
                <TableCell>
                  {t.estado !== 'completada' && (
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => { setQrTransferId(t.id); setQrDialogOpen(true); }}
                      sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                    >
                      {isMobile ? "QR" : "Ver QR"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {transferencias.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">Sin transferencias</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Modal de detalles */}
      <Dialog 
        open={!!detalleAbierto} 
        onClose={() => setDetalleAbierto(null)}
        maxWidth={isMobile ? "xs" : "md"}
        fullWidth
      >
        <DialogTitle>Detalles de Transferencia</DialogTitle>
        <DialogContent>
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Precio Unitario</TableCell>
                <TableCell>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detalleTransferencia.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.producto?.nombre || item.producto_id}</TableCell>
                  <TableCell>{item.cantidad}</TableCell>
                  <TableCell>${item.precio_unitario?.toFixed(2)}</TableCell>
                  <TableCell>${(item.cantidad * item.precio_unitario).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalleAbierto(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de QR */}
      <Dialog 
        open={qrDialogOpen} 
        onClose={() => setQrDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>QR de Transferencia</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          {qrTransferId && (
            <>
              <QRCodeSVG
                value={`${window.location.origin}/transferencia/${qrTransferId}`}
                size={isMobile ? 200 : 256}
                level="H"
                includeMargin={true}
              />
              <Typography variant="caption" sx={{ mt: 1, display: 'block', wordBreak: 'break-all' }}>
                {`${window.location.origin}/transferencia/${qrTransferId}`}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!mensaje} autoHideDuration={3000} onClose={() => setMensaje('')}>
        <Alert onClose={() => setMensaje('')} severity="info" sx={{ width: '100%' }}>
          {mensaje}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

export default HistorialTransferencias; 