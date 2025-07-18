import React, { useState } from 'react';
import {
  Drawer, List, ListItem, ListItemIcon, ListItemText, AppBar, Toolbar, Typography, Box, IconButton, useTheme, useMediaQuery, Button, Modal
} from '@mui/material';
import { MdMenu, MdInventory, MdStore, MdCompareArrows, MdShoppingCart, MdPointOfSale, MdBarChart } from 'react-icons/md';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useUserRoles } from './hooks/useUserRoles'; // Importa el hook de roles
import { supabase } from './supabaseClient';
import LogoutIcon from '@mui/icons-material/Logout';
import PerfilUsuario from './components/PerfilUsuario';
import EditIcon from '@mui/icons-material/Edit';
import IndicadorConexion from './components/IndicadorConexion';
import NotificacionesTransferencias from './components/NotificacionesTransferencias';


const drawerWidth = 220;

const DashboardLayout = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, roles } = useUserRoles();
  const [openPerfil, setOpenPerfil] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload(); // O redirige al login si prefieres
  };

  // Menú base
  const baseMenu = [
    { text: 'Productos', icon: <MdInventory />, path: '/productos' },
    { text: 'Compras', icon: <MdShoppingCart />, path: '/compras' },
    { text: 'Sucursales', icon: <MdStore />, path: '/sucursales' },
    { text: 'Inventario', icon: <MdInventory />, path: '/inventario' },
    { text: 'Transferencias', icon: <MdCompareArrows />, path: '/transferencias' },
    { text: 'Ventas', icon: <MdPointOfSale />, path: '/ventas' },
    { text: 'Reportes', icon: <MdBarChart />, path: '/reportes' },
  ];

  // Solo el desarrollador ve la opción de roles
  const menu = (user && user.email === 'melvinalvin.bello@gmail.com')
    ? [...baseMenu, { text: 'Roles', icon: <MdBarChart />, path: '/roles' }]
    : baseMenu;

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
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            Inventario Energía
          </Typography>
          <NotificacionesTransferencias />
          {user && (
            <Button
              color="inherit"
              startIcon={<EditIcon />}
              onClick={() => setOpenPerfil(true)}
              sx={{ textTransform: 'none', mr: 1 }}
            >
              {user.user_metadata?.display_name || user.email}
            </Button>
          )}
          <Modal open={openPerfil} onClose={() => setOpenPerfil(false)}>
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: 'background.paper', boxShadow: 24, p: 3, borderRadius: 2, minWidth: 320 }}>
              {user && <PerfilUsuario user={user} onClose={() => setOpenPerfil(false)} />}
            </Box>
          </Modal>
          <IndicadorConexion />
          <IconButton color="inherit" onClick={handleLogout} title="Cerrar sesión">
            <LogoutIcon />
          </IconButton>
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
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 3 }, width: { sm: `calc(90% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default DashboardLayout;