import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Paper, Box, Typography, Select, MenuItem, TextField, Button, Grid, InputLabel, FormControl, Table, TableHead, TableRow, TableCell, TableBody, Snackbar, Alert
} from '@mui/material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function Reportes() {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [inventario, setInventario] = useState([]);
  const [compras, setCompras] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    async function fetchSucursales() {
      const { data } = await supabase.from('sucursales').select('*');
      setSucursales(data || []);
    }
    fetchSucursales();
  }, []);

  // Reporte de inventario
  useEffect(() => {
    async function fetchInventario() {
      if (!sucursalId) {
        setInventario([]);
        return;
      }
      const { data } = await supabase
        .from('inventario')
        .select('*, producto:producto_id(*)')
        .eq('sucursal_id', sucursalId);
      setInventario(data || []);
    }
    fetchInventario();
  }, [sucursalId]);

  // Reporte de compras
  const fetchCompras = async () => {
    if (!sucursalId) {
      setMensaje('Seleccione una sucursal para ver compras');
      return;
    }
    let query = supabase
      .from('compras')
      .select('*, detalle_compras(*, producto:producto_id(*))')
      .eq('sucursal_destino_id', sucursalId); // Cambiado aquí

    if (fechaInicio) query = query.gte('fecha_compra', fechaInicio); // Cambiado aquí
    if (fechaFin) query = query.lte('fecha_compra', fechaFin); // Cambiado aquí

    const { data, error } = await query;
    if (error) {
      setMensaje('Error al cargar compras');
      setCompras([]);
    } else {
      setCompras(data || []);
    }
  };

  const fetchVentas = async () => {
    if (!sucursalId) {
      setMensaje('Seleccione una sucursal para ver ventas');
      return;
    }
    let query = supabase
      .from('ventas')
      .select('*, detalle_ventas(*, producto:producto_id(*)), sucursal:sucursal_id(nombre)')
      .eq('sucursal_id', sucursalId);

    if (fechaInicio) query = query.gte('fecha_venta', fechaInicio);
    if (fechaFin) query = query.lte('fecha_venta', fechaFin);

    const { data, error } = await query;
    if (error) {
      setMensaje('Error al cargar ventas');
      setVentas([]);
    } else {
      setVentas(data || []);
    }
  };

  const handleExportFactura = (venta) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Factura de Venta', 14, 18);
    doc.setFontSize(12);
    doc.text(`Fecha: ${venta.fecha_venta}`, 14, 28);
    doc.text(`Sucursal: ${venta.sucursal?.nombre || venta.sucursal_id}`, 14, 36);
    doc.text(`ID Venta: ${venta.id}`, 14, 44);

    const rows = venta.detalle_ventas.map(d => [
      d.producto?.nombre,
      d.cantidad,
      d.precio_unitario,
      d.cantidad * d.precio_unitario
    ]);

    doc.autoTable({
      head: [['Producto', 'Cantidad', 'Precio Unitario', 'Subtotal']],
      body: rows,
      startY: 52,
    });

    const total = venta.detalle_ventas.reduce((sum, d) => sum + d.cantidad * d.precio_unitario, 0);
    doc.text(`Total: $${total.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);

    doc.save(`factura-venta-${venta.id}.pdf`);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, maxWidth: 1100 }}>
      <Typography variant="h6" gutterBottom>Reportes</Typography>
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Sucursal</InputLabel>
              <Select
                value={sucursalId}
                label="Sucursal"
                onChange={e => setSucursalId(e.target.value)}
              >
                <MenuItem value="">Seleccione sucursal</MenuItem>
                {sucursales.map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.nombre} ({s.tipo} - {s.pais})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              label="Desde"
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              label="Hasta"
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button variant="contained" onClick={fetchCompras} fullWidth>
              Ver compras
            </Button>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button variant="contained" onClick={fetchVentas} fullWidth>
              Ver ventas
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Reporte de Inventario */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>Inventario actual</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell>Cantidad</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventario.map((i) => (
              <TableRow key={i.id}>
                <TableCell>{i.producto?.nombre}</TableCell>
                <TableCell>{i.cantidad}</TableCell>
              </TableRow>
            ))}
            {inventario.length === 0 && (
              <TableRow>
                <TableCell colSpan={2}>Sin datos</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Reporte de Compras */}
      <Box>
        <Typography variant="subtitle1" gutterBottom>Compras</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Sucursal Origen</TableCell> {/* Nueva columna */}
              <TableCell>Detalle</TableCell>
              <TableCell>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {compras.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.fecha_compra}</TableCell>
                <TableCell>{c.estado_envio}</TableCell>
                <TableCell>
                  {sucursales.find(s => s.id === c.sucursal_origen_id)?.nombre || c.sucursal_origen_id || 'N/A'}
                </TableCell>
                <TableCell>
                  {c.detalle_compras?.map((d, idx) => (
                    <div key={idx}>
                      {d.producto?.nombre} x {d.cantidad} @ {d.precio_unitario}
                    </div>
                  ))}
                </TableCell>
                <TableCell>
                  {c.detalle_compras?.reduce((sum, d) => sum + d.cantidad * d.precio_unitario, 0)}
                </TableCell>
              </TableRow>
            ))}
            {compras.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>Sin datos</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Reporte de Ventas */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" gutterBottom>Ventas</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Sucursal</TableCell>
              <TableCell>Detalle</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Factura</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ventas.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{v.fecha_venta}</TableCell>
                <TableCell>{v.sucursal?.nombre || v.sucursal_id || 'N/A'}</TableCell>
                <TableCell>
                  {v.detalle_ventas?.map((d, idx) => (
                    <div key={idx}>
                      {d.producto?.nombre} x {d.cantidad} @ {d.precio_unitario}
                    </div>
                  ))}
                </TableCell>
                <TableCell>
                  {v.detalle_ventas?.reduce((sum, d) => sum + d.cantidad * d.precio_unitario, 0)}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleExportFactura(v)}
                  >
                    Exportar PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {ventas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>Sin datos</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      <Snackbar open={!!mensaje} autoHideDuration={3000} onClose={() => setMensaje('')}>
        <Alert onClose={() => setMensaje('')} severity="info" sx={{ width: '100%' }}>
          {mensaje}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

export default Reportes;