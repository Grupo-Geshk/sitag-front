import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import ProducersDashboard from './pages/ProducersDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CreateUser from './pages/admin/CreateUser';
import Animales from './pages/producer/Animales';
import AnimalDetail from './pages/producer/AnimalDetail';
import EventosAnimales from './pages/producer/EventosAnimales';
import Farms from './pages/producer/Farms';
import FarmDetail from './pages/producer/FarmDetail';
import Economia from './pages/producer/Economia';
import Movimientos from './pages/producer/Movimientos';
import Servicios from './pages/producer/Servicios';
import Insumos from './pages/producer/Insumos';
import Trabajadores from './pages/producer/Trabajadores';

export default function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Producer Routes */}
        <Route path="/producer-dashboard" element={<ProducersDashboard />} />
        <Route path="/producer/dashboard" element={<ProducersDashboard />} />
        <Route path="/producer/animales" element={<Animales />} />
        <Route path="/producer/animales/:animalId" element={<AnimalDetail />} />
        <Route path="/producer/eventos-animales" element={<EventosAnimales />} />
        <Route path="/producer/fincas" element={<Farms />} />
        <Route path="/producer/fincas/:farmId" element={<FarmDetail />} />
        <Route path="/producer/economia" element={<Economia />} />
        <Route path="/producer/movimientos" element={<Movimientos />} />
        <Route path="/producer/servicios" element={<Servicios />} />
        <Route path="/producer/insumos" element={<Insumos />} />
        <Route path="/producer/trabajadores" element={<Trabajadores />} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/create-user" element={<CreateUser />} />
      </Routes>
    </Router>
  );
}