import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Paper, Box, Typography, Select, MenuItem, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Snackbar, Alert, Grid, InputLabel, FormControl, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, useTheme, useMediaQuery,
  Card, CardContent, CardActions, CardHeader, Divider
} from '@mui/material';
import { Visibility, Edit, Download, QrCode, Info } from '@mui/icons-material';
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
        
        <Box sx={{ 
          mt: 2, 
          display: 'flex', 
          gap: 1, 
          flexWrap: 'wrap',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <Button 
            variant="contained" 
            onClick={fetchTransferencias}
            size={isMobile ? "large" : "medium"}
            fullWidth={isMobile}
          >
            Filtrar
          </Button>
          <Button 
            variant="outlined" 
            onClick={limpiarFiltros}
            size={isMobile ? "large" : "medium"}
            fullWidth={isMobile}
          >
            Limpiar
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Download />}
            onClick={exportarPDF}
            size={isMobile ? "large" : "medium"}
            fullWidth={isMobile}
          >
            {isMobile ? "Exportar PDF" : "Exportar PDF"}
          </Button>
        </Box>
      </Box>

      {/* Tarjetas de Transferencias */}
      <Grid container spacing={isMobile ? 1 : 2}>
        {transferencias.map((t) => (
          <Grid item xs={12} sm={6} md={4} key={t.id}>
            <Card 
              elevation={2}
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': {
                  elevation: 4,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}
            >
              {/* Header con fecha */}
              <CardHeader
                title={new Date(t.fecha_transferencia || t.created_at).toLocaleDateString()}
                subheader={new Date(t.fecha_transferencia || t.created_at).toLocaleTimeString()}
                sx={{
                  pb: 1,
                  '& .MuiCardHeader-title': {
                    fontSize: isMobile ? '0.9rem' : '1rem',
                    fontWeight: 'bold'
                  },
                  '& .MuiCardHeader-subheader': {
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }
                }}
              />
              
              <Divider />
              
              {/* Body con origen y destino */}
              <CardContent sx={{ flexGrow: 1, py: 2 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Origen
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {t.sucursal_origen?.nombre || 'N/A'}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Destino
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {t.sucursal_destino?.nombre || 'N/A'}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Usuario
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                    {t.usuario?.email || 'N/A'}
                  </Typography>
                </Box>
                
                {t.observaciones && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Observaciones
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      fontStyle: 'italic'
                    }}>
                      {t.observaciones.length > 50 
                        ? `${t.observaciones.substring(0, 50)}...` 
                        : t.observaciones
                      }
                    </Typography>
                  </Box>
                )}
              </CardContent>
              
              <Divider />
              
              {/* Footer con estado y acciones */}
              <CardActions sx={{ 
                justifyContent: 'space-between', 
                px: 2, 
                py: 1,
                backgroundColor: 'grey.50'
              }}>
                <Chip 
                  label={t.estado} 
                  color={getEstadoColor(t.estado)} 
                  size={isMobile ? "small" : "medium"}
                  sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                />
                
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton 
                    onClick={() => verDetalle(t.id)}
                    size={isMobile ? "small" : "medium"}
                    color="primary"
                    title="Ver detalles"
                  >
                    <Info fontSize={isMobile ? "small" : "medium"} />
                  </IconButton>
                  
                  {t.estado !== 'completada' && (
                    <IconButton 
                      onClick={() => { setQrTransferId(t.id); setQrDialogOpen(true); }}
                      size={isMobile ? "small" : "medium"}
                      color="secondary"
                      title="Ver QR"
                    >
                      <QrCode fontSize={isMobile ? "small" : "medium"} />
                    </IconButton>
                  )}
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
        
        {transferencias.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ 
              textAlign: 'center', 
              py: 4,
              color: 'text.secondary'
            }}>
              <Typography variant="h6" gutterBottom>
                No hay transferencias
              </Typography>
              <Typography variant="body2">
                No se encontraron transferencias con los filtros aplicados
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>

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