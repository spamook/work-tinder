// components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireProfileCompletion?: boolean;
}

const ProtectedRoute = ({
  children,
  requireProfileCompletion = true,
}: ProtectedRouteProps) => {
  const { authorized, isProfileCompleted, loading } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "200px" }}
      >
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Check authorization first
  if (!authorized) {
    return <Navigate to="/login" replace />;
  }

  // Check profile completion only if required
  if (requireProfileCompletion && !isProfileCompleted) {
    return (
      <Navigate
        to="/complete-profile"
        replace
        state={{
          message: "Please complete your profile to access this feature",
        }}
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
