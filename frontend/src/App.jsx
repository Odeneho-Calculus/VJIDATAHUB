import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { SettingsProvider } from './context/SettingsContext';
import Navbar from './components/Navbar';
import AdminHeader from './components/AdminHeader';
import ProtectedRoute from './components/ProtectedRoute'; // General protection (just logged in)
import UserProtectedRoute from './components/UserProtectedRoute'; // Specific to users
import AgentProtectedRoute from './components/AgentProtectedRoute'; // Specific to agents
import AdminProtectedRoute from './components/AdminProtectedRoute';
import Home from './pages/Home';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BuyData from './pages/BuyData';
import BecomeAgent from './pages/BecomeAgent';
import Orders from './pages/Orders';
import Transactions from './pages/Transactions';
import TopUp from './pages/TopUp';
import Profile from './pages/Profile';
import Referrals from './pages/Referrals';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminDataPlans from './pages/AdminDataPlans';
import AdminOrders from './pages/AdminOrders';
import AdminReferrals from './pages/AdminReferrals';
import AdminTransactions from './pages/AdminTransactions';
import AdminVtuSettings from './pages/AdminVtuSettings';
import AdminNotifications from './pages/AdminNotifications';
import AdminTopzaPlans from './pages/AdminTopzaPlans';
import AdminSkdataplugPlans from './pages/AdminSkdataplugPlans';
import AdminResultCheckers from './pages/AdminResultCheckers';
import AdminAfaSettings from './pages/AdminAfaSettings';
import AdminStore from './pages/AdminStore';
import AdminAgentStores from './pages/AdminAgentStores';
import AdminCommissions from './pages/AdminCommissions';
import AdminAgentSettings from './pages/AdminAgentSettings';
import AdminPlatformSettings from './pages/AdminPlatformSettings';
import AdminProfile from './pages/AdminProfile';
import AgentCommissions from './pages/AgentCommissions';
import AgentDashboard from './pages/AgentDashboard';
import AgentOrders from './pages/AgentOrders';
import AgentWallet from './pages/AgentWallet';
import PublicStore from './pages/PublicStore';
import PublicCatalog from './pages/PublicCatalog';
import PublicTrackOrder from './pages/PublicTrackOrder';
import GuestPurchase from './pages/GuestPurchase';
import GuestTrackOrder from './pages/GuestTrackOrder';
import GuestVerifyPayment from './pages/GuestVerifyPayment';
import ContactFAB from './components/ContactFAB';
import ResultsChecker from './pages/ResultsChecker';
import AfaRegistration from './pages/AfaRegistration';

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isStoreRoute = location.pathname.startsWith('/store');
  const isAuthRoute = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'].includes(location.pathname);

  return (
    <>
      {isAdminRoute ? <AdminHeader /> : (!isStoreRoute && !isAuthRoute) && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* User Routes */}
        <Route
          path="/dashboard"
          element={
            <UserProtectedRoute>
              <Dashboard />
            </UserProtectedRoute>
          }
        />
        <Route
          path="/buy-data"
          element={
            <UserProtectedRoute>
              <BuyData />
            </UserProtectedRoute>
          }
        />
        <Route
          path="/results-checker"
          element={
            <ProtectedRoute>
              <ResultsChecker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/afa-registration"
          element={
            <ProtectedRoute>
              <AfaRegistration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <UserProtectedRoute>
              <Orders />
            </UserProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <UserProtectedRoute>
              <Transactions />
            </UserProtectedRoute>
          }
        />
        <Route
          path="/topup"
          element={
            <UserProtectedRoute>
              <TopUp />
            </UserProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute> {/* Profile can be accessed by anyone logged in, but we might want to restrict too */}
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/referrals"
          element={
            <UserProtectedRoute>
              <Referrals />
            </UserProtectedRoute>
          }
        />
        <Route
          path="/become-agent"
          element={
            <UserProtectedRoute>
              <BecomeAgent />
            </UserProtectedRoute>
          }
        />

        {/* Agent Routes */}
        <Route
          path="/agent/dashboard"
          element={
            <AgentProtectedRoute>
              <AgentDashboard />
            </AgentProtectedRoute>
          }
        />
        <Route
          path="/agent/store"
          element={
            <AgentProtectedRoute>
              <AdminStore />
            </AgentProtectedRoute>
          }
        />
        <Route
          path="/agent/orders"
          element={
            <AgentProtectedRoute>
              <AgentOrders />
            </AgentProtectedRoute>
          }
        />
        <Route
          path="/agent/commissions"
          element={
            <AgentProtectedRoute>
              <AgentCommissions />
            </AgentProtectedRoute>
          }
        />
        <Route
          path="/agent/wallet"
          element={
            <AgentProtectedRoute>
              <AgentWallet />
            </AgentProtectedRoute>
          }
        />
        <Route
          path="/agent/results-checker"
          element={
            <AgentProtectedRoute>
              <ResultsChecker />
            </AgentProtectedRoute>
          }
        />

        {/* Public Store Routes */}
        <Route
          path="/store/:slug"
          element={<PublicStore />}
        />
        <Route
          path="/store/:slug/catalog"
          element={<PublicCatalog />}
        />
        <Route
          path="/store/:slug/track"
          element={<PublicTrackOrder />}
        />

        {/* Guest Purchase Routes */}
        <Route
          path="/guest/purchase"
          element={<GuestPurchase />}
        />
        <Route
          path="/guest/track-order"
          element={<GuestTrackOrder />}
        />
        <Route
          path="/guest/verify-payment"
          element={<GuestVerifyPayment />}
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminProtectedRoute>
              <AdminUsers />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/dataplans"
          element={
            <AdminProtectedRoute>
              <AdminDataPlans />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/topza-plans"
          element={
            <AdminProtectedRoute>
              <AdminTopzaPlans />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/skdataplug-plans"
          element={
            <AdminProtectedRoute>
              <AdminSkdataplugPlans />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/result-checkers"
          element={
            <AdminProtectedRoute>
              <AdminResultCheckers />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/afa-settings"
          element={
            <AdminProtectedRoute>
              <AdminAfaSettings />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminProtectedRoute>
              <AdminOrders />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/referrals"
          element={
            <AdminProtectedRoute>
              <AdminReferrals />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/transactions"
          element={
            <AdminProtectedRoute>
              <AdminTransactions />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/vtu-settings"
          element={
            <AdminProtectedRoute>
              <AdminVtuSettings />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <AdminProtectedRoute>
              <AdminNotifications />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/agent-stores"
          element={
            <AdminProtectedRoute>
              <AdminAgentStores />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/commissions"
          element={
            <AdminProtectedRoute>
              <AdminCommissions />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/agent-settings"
          element={
            <AdminProtectedRoute>
              <AdminAgentSettings />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/platform-settings"
          element={
            <AdminProtectedRoute>
              <AdminPlatformSettings />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <AdminProtectedRoute>
              <AdminProfile />
            </AdminProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAdminRoute && !isStoreRoute && <ContactFAB />}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <SidebarProvider>
            <Router>
              <AppContent />
            </Router>
          </SidebarProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
