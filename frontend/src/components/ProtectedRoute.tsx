import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth, type UserRole } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && role && !roles.includes(role)) {
    return (
      <div className="p-8 text-center text-red-600">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  return <>{children}</>;
}

