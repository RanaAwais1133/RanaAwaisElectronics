import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface Props {
  children: React.ReactNode;
  roles?: string[];
  redirectTo?: string; // ✅ NEW: Custom redirect path
  fallback?: React.ReactNode; // ✅ NEW: Show fallback instead of redirect
}

const RequireRole: React.FC<Props> = ({ 
  children, 
  roles, 
  redirectTo = '/login',
  fallback 
}) => {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading || false);

  // ✅ NEW: Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ✅ Check if user is authenticated
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // ✅ Check if user has required role
  if (roles && roles.length > 0) {
    const hasRole = roles.includes(user.role);
    
    if (!hasRole) {
      // ✅ If fallback provided, show it instead of redirect
      if (fallback) {
        return <>{fallback}</>;
      }
      // ✅ Redirect to home or custom path
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default RequireRole;