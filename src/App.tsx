import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import PrivateRoute from './routes/PrivateRoute';
import SuperAdminRoute from './routes/SuperAdminRoute';
import { ThemeProvider } from './theme/ThemeContext';
import ToastContainer from './components/ui/ToastContainer';

const LoginPage                = lazy(() => import('./pages/LoginPage'));
const RegisterPage             = lazy(() => import('./pages/RegisterPage'));
const Dashboard                = lazy(() => import('./pages/DashboardPage'));
const InventoryPage            = lazy(() => import('./pages/InventoryPage'));
const NewProductPage           = lazy(() => import('./pages/NewProduct'));
const PosPage                  = lazy(() => import('./pages/PosPage'));
const SalesHistoryPage         = lazy(() => import('./pages/SalesHistoryPage'));
const CashRegisterPage         = lazy(() => import('./pages/CashRegisterPage'));
const PurchasesPage            = lazy(() => import('./pages/PurchasesPage'));
const SuppliersPage            = lazy(() => import('./pages/SuppliersPage'));
const ArqueosPage              = lazy(() => import('./pages/ArqueosPage'));
const UsersRolesPage           = lazy(() => import('./pages/UsersRolesPage'));
const ReportsPage              = lazy(() => import('./pages/ReportsPage'));
const CustomersPage            = lazy(() => import('./pages/CustomersPage'));
const CarteraPage              = lazy(() => import('./pages/CarteraPage'));
const ImportProductsPage       = lazy(() => import('./pages/ImportProductsPage'));
const LabelsPage               = lazy(() => import('./pages/LabelsPage'));
const ExchangesPage            = lazy(() => import('./pages/ExchangesPage'));
const ConsignmentsPage         = lazy(() => import('./pages/ConsignmentsPage'));
const SuperAdminLayout         = lazy(() => import('./pages/superadmin/SuperAdminLayout'));
const SuperAdminDashboardPage  = lazy(() => import('./pages/superadmin/SuperAdminDashboardPage'));
const SuperAdminNewClientPage  = lazy(() => import('./pages/superadmin/SuperAdminNewClientPage'));
const SuperAdminClientDetailPage = lazy(() => import('./pages/superadmin/SuperAdminClientDetailPage'));

// Spinner mostrado mientras se descarga un chunk
function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-app-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-app-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-app-text-muted text-sm font-medium">Cargando...</span>
      </div>
    </div>
  );
}

// Pre-descarga todos los chunks en segundo plano después del primer render
function Prefetcher() {
  useEffect(() => {
    const prefetch = () => {
      import('./pages/DashboardPage');
      import('./pages/PosPage');
      import('./pages/CashRegisterPage');
      import('./pages/InventoryPage');
      import('./pages/PurchasesPage');
      import('./pages/SuppliersPage');
      import('./pages/CustomersPage');
      import('./pages/CarteraPage');
      import('./pages/SalesHistoryPage');
      import('./pages/ExchangesPage');
      import('./pages/ConsignmentsPage');
      import('./pages/LabelsPage');
      import('./pages/ReportsPage');
      import('./pages/ArqueosPage');
      import('./pages/UsersRolesPage');
      import('./pages/ImportProductsPage');
    };
    // Esperar a que el hilo principal esté libre
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(prefetch, { timeout: 5000 });
    } else {
      setTimeout(prefetch, 3000);
    }
  }, []);
  return null;
}

const AppRoutes = () => {
  return (
    <ThemeProvider>
      <ToastContainer />
      <BrowserRouter>
        <Prefetcher />
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/arqueoz" element={<PrivateRoute><ArqueosPage /></PrivateRoute>} />
            <Route path="/usuarios" element={<PrivateRoute><UsersRolesPage /></PrivateRoute>} />
            <Route path="/inventario" element={<PrivateRoute><InventoryPage /></PrivateRoute>} />
            <Route path="/clientes" element={<PrivateRoute><CustomersPage /></PrivateRoute>} />
            <Route path="/cartera" element={<PrivateRoute><CarteraPage /></PrivateRoute>} />
            <Route path="/nuevo_producto" element={<NewProductPage />} />
            <Route path="/importar-productos" element={<PrivateRoute><ImportProductsPage /></PrivateRoute>} />
            <Route path="/etiquetas" element={<PrivateRoute><LabelsPage /></PrivateRoute>} />
            <Route path="/cambios" element={<PrivateRoute><ExchangesPage /></PrivateRoute>} />
            <Route path="/consignaciones" element={<PrivateRoute><ConsignmentsPage /></PrivateRoute>} />

            {/* Super Admin */}
            <Route path="/superadmin" element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}>
              <Route index element={<SuperAdminDashboardPage />} />
              <Route path="nuevo" element={<SuperAdminNewClientPage />} />
              <Route path="clientes/:id" element={<SuperAdminClientDetailPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default AppRoutes;
