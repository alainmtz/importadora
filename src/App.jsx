import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import DashboardLayout from './DashboardLayout';
import ListaProductos from './components/ListaProductos';
import AgregarProducto from './components/AgregarProducto';
import InventarioSucursal from './components/InventarioSucursal';
import Sucursales from './components/Sucursales';
import TransferenciasContainer from './components/TransferenciasContainer';
import Compras from './components/Compras';
import Reportes from './components/Reportes';
import VentasSucursal from './components/VentasSucursal';
import VistaGestionRoles from './components/VistaGestionRoles';
import ProductoDetalle from './components/ProductoDetalle';
import PaginaInicio from './components/PaginaInicio';

function App() {
  const [refrescar, setRefrescar] = useState(false);
  const [productoEditar, setProductoEditar] = useState(null);
  const [refrescarInventario, setRefrescarInventario] = useState(false);
  const [user, setUser] = useState(null);

  if (!user) {
    return <Auth onAuth={setUser} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout user={user} />}>
          <Route index element={<PaginaInicio />} />
          <Route path="productos" element={
            <div>
              <h1>Inventario Energía</h1>
              <AgregarProducto
                onProductoAgregado={() => setRefrescar(r => !r)}
                productoEditar={productoEditar}
                onEditFinish={() => {
                  setProductoEditar(null);
                  setRefrescar(r => !r);
                }}
              />
              <ListaProductos
                key={refrescar}
                onEditar={setProductoEditar}
                onProductoEliminado={() => setRefrescar(r => !r)}
                onAsignacion={() => setRefrescarInventario(r => !r)}
              />
            </div>
          } />
          <Route path="/productos/:id" element={<ProductoDetalle />} />
          <Route path="sucursales" element={<Sucursales />} />
          <Route path="inventario" element={<InventarioSucursal refrescar={refrescarInventario} />} />
          <Route path="transferencias" element={<TransferenciasContainer />} />
          <Route path="compras" element={<Compras />} />
          <Route path="ventas" element={<VentasSucursal />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="roles" element={<VistaGestionRoles />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;