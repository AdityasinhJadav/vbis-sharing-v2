import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import AuthLogin from './pages/AuthLogin'
import AuthSignup from './pages/AuthSignup'
import Dashboard from './pages/Dashboard'
import SetupUsername from './pages/SetupUsername'
import UploadPhotos from './pages/UploadPhotos'
import ViewPhotos from './pages/ViewPhotos'

function App() {
  return (
    <ErrorBoundary>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthLogin />} />
          <Route path="/signup" element={<AuthSignup />} />
          <Route path="/setup-username" element={<SetupUsername />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<UploadPhotos />} />
          <Route path="/upload/:roomId" element={<UploadPhotos />} />
          <Route path="/photos/:roomId" element={<ViewPhotos />} />
        </Routes>
      </AppLayout>
    </ErrorBoundary>
  )
}

export default App
