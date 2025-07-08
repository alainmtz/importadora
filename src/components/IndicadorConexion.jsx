import React, { useEffect, useState } from 'react';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { Tooltip, Box } from '@mui/material';

export default function IndicadorConexion() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const check = () => setOnline(navigator.onLine);
    const interval = setInterval(check, 10000);
    window.addEventListener('online', check);
    window.addEventListener('offline', check);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', check);
      window.removeEventListener('offline', check);
    };
  }, []);

  return (
    <Tooltip title={online ? 'Conectado a internet' : 'Sin conexión'}>
      <Box sx={{ display: 'flex', alignItems: 'center', color: online ? '#fff' : 'error.main', mr: 1 }}>
        {online ? <CloudQueueIcon /> : <CloudOffIcon />}
      </Box>
    </Tooltip>
  );
} 