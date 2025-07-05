import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';

const ProductoDetalle = () => {
  const { id } = useParams();
  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducto() {
      setLoading(true);
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .single();
      setProducto(data);
      setLoading(false);
    }
    fetchProducto();
  }, [id]);

  if (loading) return <CircularProgress />;
  if (!producto) return <Typography>No se encontró el producto.</Typography>;

  return (
    <Paper sx={{ p: 4, maxWidth: 500, margin: 'auto', mt: 4 }}>
      <Box sx={{ textAlign: 'center' }}>
        {producto.imagen_url && (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }}
          />
        )}
        <Typography variant="h5" gutterBottom>{producto.nombre}</Typography>
        <Typography variant="subtitle1" gutterBottom>Código: {producto.codigo}</Typography>
        <Typography variant="body1" gutterBottom>Categoría: {producto.categoria}</Typography>
        <Typography variant="body2" color="text.secondary">{producto.descripcion}</Typography>
      </Box>
    </Paper>
  );
};

export default ProductoDetalle;