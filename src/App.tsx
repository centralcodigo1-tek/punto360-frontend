import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import NewProductPage from './pages/NewProduct';
import PosPage from './pages/PosPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import CashRegisterPage from './pages/CashRegisterPage';
import PurchasesPage from './pages/PurchasesPage';
import SuppliersPage from './pages/SuppliersPage';
import ArqueosPage from './pages/ArqueosPage';
import UsersRolesPage from './pages/UsersRolesPage';
import ReportsPage from './pages/ReportsPage';
import CustomersPage from './pages/CustomersPage';
import CarteraPage from './pages/CarteraPage';
import ImportProductsPage from './pages/ImportProductsPage';
import PrivateRoute from './routes/PrivateRoute';
import SuperAdminRoute from './routes/SuperAdminRoute';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SuperAdminDashboardPage from './pages/superadmin/SuperAdminDashboardPage';
import SuperAdminNewClientPage from './pages/superadmin/SuperAdminNewClientPage';
import SuperAdminClientDetailPage from './pages/superadmin/SuperAdminClientDetailPage';

import { ThemeProvider } from './theme/ThemeContext';

const AppRoutes = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/ventas" element={<PrivateRoute><PosPage /></PrivateRoute>} />
          <Route path="/historial" element={<PrivateRoute><SalesHistoryPage /></PrivateRoute>} />
          <Route path="/caja" element={<PrivateRoute><CashRegisterPage /></PrivateRoute>} />
          <Route path="/compras" element={<PrivateRoute><PurchasesPage /></PrivateRoute>} />
          <Route path="/proveedores" element={<PrivateRoute><SuppliersPage /></PrivateRoute>} />
          <Route path="/reportes" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
          <Route path="/arqueos" element={<PrivateRoute><ArqueosPage /></PrivateRoute>} />
          <Route path="/usuarios" element={<PrivateRoute><UsersRolesPage /></PrivateRoute>} />
          <Route path="/inventario" element={<PrivateRoute><InventoryPage /></PrivateRoute>} />
          <Route path="/clientes" element={<PrivateRoute><CustomersPage /></PrivateRoute>} />
          <Route path="/cartera" element={<PrivateRoute><CarteraPage /></PrivateRoute>} />
          <Route path="/nuevo_producto" element={<NewProductPage />} />
          <Route path="/importar-productos" element={<PrivateRoute><ImportProductsPage /></PrivateRoute>} />

          {/* Super Admin */}
          <Route path="/superadmin" element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}>
            <Route index element={<SuperAdminDashboardPage />} />
            <Route path="nuevo" element={<SuperAdminNewClientPage />} />
            <Route path="clientes/:id" element={<SuperAdminClientDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default AppRoutes;
