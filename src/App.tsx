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
import UsersRolesPage from './pages/UsersRolesPage';
import ReportsPage from './pages/ReportsPage';
import PrivateRoute from './routes/PrivateRoute';

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
          <Route path="/reportes" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
          <Route path="/usuarios" element={<PrivateRoute><UsersRolesPage /></PrivateRoute>} />
          <Route path="/inventario" element={<PrivateRoute><InventoryPage /></PrivateRoute>} />
          <Route path="/nuevo_producto" element={<NewProductPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default AppRoutes;
