import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AgentProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Ensure only agents can access agent routes
    if (user.role === 'user') {
        return <Navigate to="/dashboard" replace />;
    }

    if (user.role === 'admin') {
        return <Navigate to="/admin" replace />;
    }

    return children;
}
