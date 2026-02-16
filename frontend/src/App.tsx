// App.tsx
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import RegisterComponent from "./components/RegisterComponent";
import LoginComponent from "./components/LoginComponent";
import HomeComponent from "./components/HomeComponent";
import RecommendationsComponent from "./components/RecommendationsComponent";
import ProfileComponent from "./components/ProfileComponent";
import NavbarComponent from "./components/NavbarComponent";
import NotFoundComponent from "./components/NotFoundComponent";
import ConnectionsComponent from "./components/ConnectionsComponent";
import ProtectedRoute from "./components/ProtectedRoute";
import CompleteProfileComponent from "./components/CompleteProfileComponent";

const App = () => {
  return (
    <div>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NavbarComponent />

        <div className="container" id="container">
          <Routes>
            {/* Public routes - no auth or profile check */}
            <Route path="/" element={<HomeComponent />} />
            <Route path="/register" element={<RegisterComponent />} />
            <Route path="/login" element={<LoginComponent />} />

            {/* Protected routes - WITH profile completion check */}
            <Route
              path="/recommendations"
              element={
                <ProtectedRoute>
                  <RecommendationsComponent />
                </ProtectedRoute>
              }
            />

            <Route
              path="/connections"
              element={
                <ProtectedRoute>
                  <ConnectionsComponent />
                </ProtectedRoute>
              }
            />

            <Route
              path="/me"
              element={
                <ProtectedRoute>
                  <ProfileComponent />
                </ProtectedRoute>
              }
            />

            {/* Profile page - protected but WITHOUT profile completion check */}
            <Route
              path="/complete-profile"
              element={
                <ProtectedRoute requireProfileCompletion={false}>
                  <CompleteProfileComponent />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFoundComponent />} />
          </Routes>
        </div>
      </Router>
    </div>
  );
};

export default App;
