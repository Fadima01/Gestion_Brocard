import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts & Protected Wrapper
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../components/ProtectedRoute';

// Pages
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Catalogue from '../pages/Catalogue';
import Stocks from '../pages/Stocks';
import Clients from '../pages/Clients';
import Commandes from '../pages/Commandes';
import Production from '../pages/Production';
import Livraisons from '../pages/Livraisons';
import Depenses from '../pages/Depenses';
import Remunerations from '../pages/Remunerations';
import Caisse from '../pages/Caisse';
import Retours from '../pages/Retours';
import Utilisateurs from '../pages/Utilisateurs';
import Reservations from '../pages/Reservations';
import Rapports from '../pages/Rapports';
import JournalActivite from '../pages/JournalActivite';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Private ERP Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Default Route redirecting to Dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* General Seller/Admin Routes */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="catalogue" element={<Catalogue />} />
          <Route path="stocks" element={<Stocks />} />
          <Route path="clients" element={<Clients />} />
          <Route path="commandes" element={<Commandes />} />
          <Route path="production" element={<Production />} />
          <Route path="livraisons" element={<Livraisons />} />
          <Route path="depenses" element={<Depenses />} />
          <Route path="caisse" element={<Caisse />} />
          <Route path="retours" element={<Retours />} />
          <Route path="reservations" element={<Reservations />} />

          {/* Admin Only Routes */}
          <Route
            path="remunerations"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Remunerations />
              </ProtectedRoute>
            }
          />
          <Route
            path="rapports"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Rapports />
              </ProtectedRoute>
            }
          />
          <Route
            path="journal-activite"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <JournalActivite />
              </ProtectedRoute>
            }
          />
          <Route
            path="utilisateurs"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Utilisateurs />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Fallback Redirection */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
