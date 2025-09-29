import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Home from './pages/Home'
import AuthLogin from './pages/AuthLogin'
import AuthSignup from './pages/AuthSignup'
import Dashboard from './pages/Dashboard'
import UploadPhotos from './pages/UploadPhotos'
import ViewPhotos from './pages/ViewPhotos'

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthLogin />} />
        <Route path="/signup" element={<AuthSignup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<UploadPhotos />} />
        <Route path="/photos" element={<ViewPhotos />} />
      </Routes>
    </AppLayout>
  )
}

export default App
