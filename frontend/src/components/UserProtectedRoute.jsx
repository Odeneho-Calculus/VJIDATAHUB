import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function UserProtectedRoute({ children }) {
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

    // If agent/admin tries to access user pages, redirect them to their respective dashboards
    if (user.role === 'agent') {
        return <Navigate to="/agent/dashboard" replace />;
    }

    if (user.role === 'admin') {
        return <Navigate to="/admin" replace />;
    }

    return children;
}
