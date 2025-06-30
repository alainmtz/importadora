import React, { useState } from 'react';
import {
  Drawer, List, ListItem, ListItemIcon, ListItemText, AppBar, Toolbar, Typography, Box, IconButton, useTheme, useMediaQuery
} from '@mui/material';
import { MdMenu, MdInventory, MdStore, MdCompareArrows, MdShoppingCart, MdPointOfSale, MdBarChart } from 'react-icons/md';
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

const drawerWidth = 220;

const DashboardLayout = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <div>
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
              onClick={() => setMobileOpen(false)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Box>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 2 }}
            >
              <MdMenu />
            </IconButton>
          )}
          <Typography variant="h6" noWrap>
            Inventario Energía
          </Typography>
        </Toolbar>
      </AppBar>
      {/* Drawer para mobile */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        ModalProps={{
          keepMounted: true, // Mejor rendimiento en móvil
        }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
          display: { xs: isMobile ? 'block' : 'none', sm: 'block' }
        }}
      >
        {drawer}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 3 }, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default DashboardLayout;