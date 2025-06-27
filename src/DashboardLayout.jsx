import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, AppBar, Toolbar, Typography, Box } from '@mui/material';
import { MdInventory, MdStore, MdCompareArrows, MdShoppingCart, MdPointOfSale, MdBarChart } from 'react-icons/md';
import { Link, Outlet, useLocation } from 'react-router-dom';

const menu = [
  { text: 'Productos', icon: <MdInventory />, path: '/productos' },
  { text: 'Sucursales', icon: <MdStore />, path: '/sucursales' },
  { text: 'Inventario', icon: <MdInventory />, path: '/inventario' },
  { text: 'Transferencias', icon: <MdCompareArrows />, path: '/transferencias' },
  { text: 'Compras', icon: <MdShoppingCart />, path: '/compras' },
  { text: 'Ventas', icon: <MdPointOfSale />, path: '/ventas' },
  { text: 'Reportes', icon: <MdBarChart />, path: '/reportes' },
];

const DashboardLayout = () => {
  const location = useLocation();
  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer variant="permanent" sx={{ width: 220, flexShrink: 0 }}>
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menu.map(item => (
              <ListItem
                button
                key={item.text}
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <AppBar position="fixed" sx={{ zIndex: 1201 }}>
          <Toolbar>
            <Typography variant="h6" noWrap>
              Inventario Energía
            </Typography>
          </Toolbar>
        </AppBar>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

export default DashboardLayout;