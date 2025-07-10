import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, useTheme, useMediaQuery } from '@mui/material';
import TransferirInventario from './TransferirInventario';
import HistorialTransferencias from './HistorialTransferencias';
import DashboardTransferencias from './DashboardTransferencias';

function TransferenciasContainer() {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ 
      width: '100%',
      maxWidth: isMobile ? '100%' : 1200,
      mx: 'auto',
      px: isMobile ? 1 : 3
    }}>
      <Paper sx={{ 
        p: isMobile ? 1 : 2, 
        mb: 2,
        borderRadius: isMobile ? 1 : 2
      }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="transferencias tabs"
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons={isMobile ? "auto" : false}
          sx={{
            '& .MuiTab-root': {
              fontSize: isMobile ? '0.875rem' : '1rem',
              minWidth: isMobile ? 'auto' : 120,
              padding: isMobile ? '6px 12px' : '12px 16px'
            }
          }}
        >
          <Tab label="Crear Transferencia" />
          <Tab label="Historial" />
          <Tab label="Dashboard" />
        </Tabs>
      </Paper>

      <Box sx={{ 
        width: '100%',
        maxWidth: isMobile ? '100%' : 1200,
        mx: 'auto'
      }}>
        {tabValue === 0 && <TransferirInventario onTransferCreated={() => setTabValue(1)} />}
        {tabValue === 1 && <HistorialTransferencias />}
        {tabValue === 2 && <DashboardTransferencias />}
      </Box>
    </Box>
  );
}

export default TransferenciasContainer; 