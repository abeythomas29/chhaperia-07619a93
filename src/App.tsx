import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import SplashScreen from "@/components/SplashScreen";
import { useState, useEffect } from "react";
import { autoSyncPendingEntries } from "./lib/offlineSync";
import { usePushNotifications } from "./hooks/usePushNotifications";
import "./lib/i18n"; // Import i18n configuration
import Login from "./pages/Login";
import AdminLayout from "./layouts/AdminLayout";
import WorkerLayout from "./layouts/WorkerLayout";
import Dashboard from "./pages/admin/Dashboard";
import ProductionLogs from "./pages/admin/ProductionLogs";
import StockManagement from "./pages/admin/StockManagement";
import Products from "./pages/admin/Products";
import Clients from "./pages/admin/Clients";
import UserManagement from "./pages/admin/UserManagement";
import BackupRestore from "./pages/admin/BackupRestore";
import ProductionEntry from "./pages/worker/ProductionEntry";
import ProductionHistory from "./pages/worker/ProductionHistory";
import MyIssues from "./pages/worker/MyIssues";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";

const queryClient = new QueryClient();

const PushNotificationSetup = () => {
  usePushNotifications();
  return null;
};

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    // Offline sync listeners
    window.addEventListener("online", autoSyncPendingEntries);
    // Initial sync check
    autoSyncPendingEntries();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", autoSyncPendingEntries);
    };
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <PushNotificationSetup />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="logs" element={<ProductionLogs />} />
            <Route path="stock" element={<StockManagement />} />
            <Route path="products" element={<Products />} />
            <Route path="clients" element={<Clients />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="backup" element={<BackupRestore />} />
          </Route>
          <Route path="/worker" element={<WorkerLayout />}>
            <Route index element={<ProductionEntry />} />
            <Route path="history" element={<ProductionHistory />} />
            <Route path="stock" element={<StockManagement />} />
            <Route path="issues" element={<MyIssues />} />
          </Route>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
