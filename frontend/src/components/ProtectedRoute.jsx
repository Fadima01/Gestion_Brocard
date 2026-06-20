import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/authContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-gold-500">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-500 border-t-transparent"></div>
        <span className="ml-3 font-semibold">Chargement du profil...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === 'ADMIN' && !isAdmin) {
    // Si l'utilisateur n'est pas Admin, on le renvoie au Dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
