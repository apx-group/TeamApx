import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { I18nProvider } from '@/contexts/I18nContext'
import Navbar from '@/templates/layout/Navbar'
import Footer from '@/templates/layout/Footer'
import ProtectedRoute from '@/components/ProtectedRoute'

// Pages
import Home from '@/pages/Home'
import RainbowSix from '@/pages/RainbowSix'
import Apply from '@/pages/Apply'
import Badges from '@/pages/Badges'
import Links from '@/pages/Links'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Profile from '@/pages/Profile'
import Security from '@/pages/Security'
import Settings from '@/pages/Settings'
import User from '@/pages/User'
import MyApplication from '@/pages/MyApplication'
import AssettoCorse from '@/pages/AssettoCorse'
import Leaderboard from '@/pages/Leaderboard'
import Inventory from '@/pages/Inventory'

// Admin
import AdminApplications from '@/pages/admin/Applications'
import AdminTeam from '@/pages/admin/AdminTeam'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminBadges from '@/pages/admin/AdminBadges'

// Legal
import DeImpressum from '@/pages/legal/DeImpressum'
import DeDatenschutz from '@/pages/legal/DeDatenschutz'
import DeNutzungsbedingungen from '@/pages/legal/DeNutzungsbedingungen'
import EnImpressum from '@/pages/legal/EnImpressum'
import EnDatenschutz from '@/pages/legal/EnDatenschutz'
import EnNutzungsbedingungen from '@/pages/legal/EnNutzungsbedingungen'

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <Navbar />
          <main>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Home />} />
              <Route path="/rainbow-six" element={<RainbowSix />} />
              <Route path="/assetto-corsa" element={<AssettoCorse />} />
              <Route path="/apply" element={<Apply />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/user" element={<User />} />
              <Route path="/leaderboard" element={<Leaderboard />} />

              {/* Legal */}
              <Route path="/de/impressum" element={<DeImpressum />} />
              <Route path="/de/datenschutz" element={<DeDatenschutz />} />
              <Route path="/de/nutzungsbedingungen" element={<DeNutzungsbedingungen />} />
              <Route path="/en/impressum" element={<EnImpressum />} />
              <Route path="/en/datenschutz" element={<EnDatenschutz />} />
              <Route path="/en/terms" element={<EnNutzungsbedingungen />} />

              {/* Protected user routes */}
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/security" element={<ProtectedRoute><Security /></ProtectedRoute>} />
              <Route path="/links" element={<ProtectedRoute><Links /></ProtectedRoute>} />
              <Route path="/badges" element={<ProtectedRoute><Badges /></ProtectedRoute>} />
              <Route path="/my-application" element={<ProtectedRoute><MyApplication /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/admin/applications" element={<ProtectedRoute adminOnly><AdminApplications /></ProtectedRoute>} />
              <Route path="/admin/team" element={<ProtectedRoute adminOnly><AdminTeam /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/badges" element={<ProtectedRoute adminOnly><AdminBadges /></ProtectedRoute>} />
            </Routes>
          </main>
          <Footer />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  )
}
