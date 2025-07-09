import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import TransferirInventario from './TransferirInventario';
import HistorialTransferencias from './HistorialTransferencias';
import DashboardTransferencias from './DashboardTransferencias';

function TransferenciasContainer() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="transferencias tabs">
          <Tab label="Crear Transferencia" />
          <Tab label="Historial" />
          <Tab label="Dashboard" />
        </Tabs>
      </Box>

      {tabValue === 0 && <TransferirInventario onTransferCreated={() => setTabValue(1)} />}
      {tabValue === 1 && <HistorialTransferencias />}
      {tabValue === 2 && <DashboardTransferencias />}
    </Box>
  );
}

export default TransferenciasContainer; 