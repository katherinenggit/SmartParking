import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { SpaceDetectionPage } from './pages/SpaceDetectionPage';
import { HistoryPage } from './pages/HistoryPage';
import { StatsPage } from './pages/StatsPage';
import { AlertsPage } from './pages/AlertsPage';
import { MultiCameraPage } from './pages/MultiCameraPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountPage } from './pages/AccountPage';
import { StreamHostPage } from './pages/StreamHostPage';
import { MultiStreamHostPage } from './pages/MultiStreamHostPage';
import { StreamViewerPage } from './pages/StreamViewerPage';
import { MultiStreamViewerPage } from './pages/MultiStreamViewerPage';
import { PlateHistoryPage } from './pages/PlateHistoryPage';
import { ObjectTrackingPage } from './pages/ObjectTrackingPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function App() {
  const { user, role, logout } = useAuth();
  
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-b from-strawberry-200 via-white to-matcha-200">
        {/* Navigation */}
        <nav className="bg-white/90 backdrop-blur shadow-md border-b border-strawberry-100">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap gap-3 items-center">
            <div className="flex gap-2 flex-wrap">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium ${
                    isActive
                      ? 'bg-strawberry-200 text-strawberry-900 border border-strawberry-400 shadow-inner'
                      : 'bg-white text-strawberry-700 border border-strawberry-100 hover:bg-strawberry-50'
                  }`
                }
              >
                🎥 Space Detection
              </NavLink>
              {user && role === 'admin' && (
                <NavLink
                  to="/plate/history"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium ${
                      isActive
                        ? 'bg-matcha-300 text-matcha-950 border border-matcha-600 shadow-inner'
                        : 'bg-white text-matcha-800 border border-matcha-100 hover:bg-matcha-50'
                    }`
                  }
                >
                  📘 Plate History
                </NavLink>
              )}
              <NavLink
                to="/cameras"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium ${
                    isActive
                      ? 'bg-strawberry-200 text-strawberry-900 border border-strawberry-400 shadow-inner'
                      : 'bg-white text-strawberry-700 border border-strawberry-100 hover:bg-strawberry-50'
                  }`
                }
              >
                🗺️ Multi Cam
              </NavLink>
              <NavLink
                to="/history"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium ${
                    isActive
                      ? 'bg-strawberry-200 text-strawberry-900 border border-strawberry-400 shadow-inner'
                      : 'bg-white text-strawberry-700 border border-strawberry-100 hover:bg-strawberry-50'
                  }`
                }
              >
                📊 History
              </NavLink>
              <NavLink
                to="/stats"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium ${
                    isActive
                      ? 'bg-strawberry-200 text-strawberry-900 border border-strawberry-400 shadow-inner'
                      : 'bg-white text-strawberry-700 border border-strawberry-100 hover:bg-strawberry-50'
                  }`
                }
              >
                📈 Stats
              </NavLink>
              <NavLink
                to="/alerts"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium ${
                    isActive
                      ? 'bg-danger/10 text-danger-700 border border-danger/40 shadow-inner'
                      : 'bg-strawberry-50 text-danger border border-danger/40 hover:bg-danger/10'
                  }`
                }
              >
                🚨 Alerts
              </NavLink>
              {user && role === 'admin' && (
                <NavLink
                  to="/stream/host"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium ${
                      isActive
                        ? 'bg-strawberry-300 text-strawberry-900 border border-strawberry-500 shadow-inner'
                        : 'bg-white text-strawberry-700 border border-strawberry-100 hover:bg-strawberry-50'
                    }`
                  }
                >
                  📹 Stream Host
                </NavLink>
              )}
              {user && role === 'admin' && (
                <NavLink
                  to="/stream/host-multi"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium ${
                      isActive
                        ? 'bg-strawberry-400 text-strawberry-950 border border-strawberry-600 shadow-inner'
                        : 'bg-white text-strawberry-800 border border-strawberry-100 hover:bg-strawberry-50'
                    }`
                  }
                >
                  📡 Multi Host
                </NavLink>
              )}
              <NavLink
                to="/stream/view"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium ${
                    isActive
                      ? 'bg-matcha-200 text-matcha-900 border border-matcha-500 shadow-inner'
                      : 'bg-white text-accent-700 border border-accent-100 hover:bg-accent-50'
                  }`
                }
              >
                👀 Stream Viewer
              </NavLink>
              {user && (
                <NavLink
                  to="/stream/multi"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium ${
                      isActive
                        ? 'bg-matcha-300 text-matcha-950 border border-matcha-500 shadow-inner'
                        : 'bg-white text-accent-700 border border-accent-100 hover:bg-accent-50'
                    }`
                  }
                >
                  🧩 Multi Stream
                </NavLink>
              )}
              {user && (
                <NavLink
                  to="/tracking"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium ${
                      isActive
                        ? 'bg-matcha-400 text-matcha-950 border border-matcha-600 shadow-inner'
                        : 'bg-white text-matcha-800 border border-matcha-100 hover:bg-matcha-50'
                    }`
                  }
                >
                  🎯 Object Tracking
                </NavLink>
              )}
              {user && (
                <NavLink
                  to="/account"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium ${
                      isActive
                        ? 'bg-strawberry-300 text-strawberry-900 border border-strawberry-500 shadow-inner'
                        : 'bg-white text-strawberry-700 border border-strawberry-100 hover:bg-strawberry-50'
                    }`
                  }
                >
                  👤 Tài khoản
                </NavLink>
              )}
            </div>
            <div className="ml-auto flex items-center gap-3 text-sm">
              {user ? (
                <>
                  <span className="text-strawberry-800 hidden sm:block">
                    {user.email} {role ? `(${role})` : ''}
                  </span>
                  <button
                    onClick={logout}
                    className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition shadow-sm"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <NavLink
                    to="/login"
                    className={({ isActive }) =>
                      `px-4 py-2 rounded-lg font-medium ${
                        isActive
                          ? 'bg-strawberry-200 text-strawberry-900 border border-strawberry-400 shadow-inner'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`
                    }
                  >
                    🔐 Login
                  </NavLink>
                  <NavLink
                    to="/register"
                    className={({ isActive }) =>
                      `px-4 py-2 rounded-lg font-medium ${
                        isActive
                          ? 'bg-matcha-200 text-matcha-900 border border-matcha-500 shadow-inner'
                          : 'bg-accent-500 text-white hover:bg-accent-600'
                      }`
                    }
                  >
                    ➕ Register
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </nav>
        
        {/* Routes */}
        <Routes>
          <Route path="/" element={<SpaceDetectionPage />} />
          <Route 
            path="/history" 
            element={
              <ProtectedRoute roles={['admin']}>
                <HistoryPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/stats" 
            element={
              <ProtectedRoute roles={['admin']}>
                <StatsPage />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/plate/history"
            element={
              <ProtectedRoute roles={['admin']}>
                <PlateHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/alerts" 
            element={
              <ProtectedRoute roles={['admin']}>
                <AlertsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cameras" 
            element={
              <ProtectedRoute roles={['admin']}>
                <MultiCameraPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/account" 
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/stream/host" 
            element={
              <ProtectedRoute roles={['admin']}>
                <StreamHostPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/stream/host-multi" 
            element={
              <ProtectedRoute roles={['admin']}>
                <MultiStreamHostPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/stream/view" element={<StreamViewerPage />} />
          <Route 
            path="/stream/multi" 
            element={
              <ProtectedRoute>
                <MultiStreamViewerPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tracking" 
            element={
              <ProtectedRoute>
                <ObjectTrackingPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;