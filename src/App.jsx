import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/login";
import './index.css';

import Dashboard from "./pages/Dashboard";
import Maquinas from "./pages/Maquinas";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import ClientesLealtad from "./pages/clientes-lealtad";
import Insumos from "./pages/insumos";
import MaquinaDetalle from "./pages/MaquinaDetalle";

// NUEVOS: pages de Clientes (asegúrate que existan los archivos)
import Clientes from "./pages/Clientes";
import ClienteDetalle from "./pages/ClienteDetalle";

// Componente para proteger rutas
const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas */}
        <Route path="/" element={
          <PrivateRoute>
            <Layout><Dashboard /></Layout>
          </PrivateRoute>
        } />
        <Route path="/maquinas" element={
          <PrivateRoute>
            <Layout><Maquinas /></Layout>
          </PrivateRoute>
        } />
        <Route path="/maquinas/:id" element={
          <PrivateRoute>
            <Layout><MaquinaDetalle /></Layout>
          </PrivateRoute>
        } />
        <Route path="/reportes" element={
          <PrivateRoute>
            <Layout><Reportes /></Layout>
          </PrivateRoute>
        } />
        <Route path="/configuracion" element={
          <PrivateRoute>
            <Layout><Configuracion /></Layout>
          </PrivateRoute>
        } />
        <Route path="/clientes-lealtad" element={
          <PrivateRoute>
            <Layout><ClientesLealtad /></Layout>
          </PrivateRoute>
        } />
        <Route path="/insumos" element={
          <PrivateRoute>
            <Layout><Insumos /></Layout>
          </PrivateRoute>
        } />

        {/* RUTAS DE CLIENTES (MVP) */}
        <Route path="/clientes" element={
          <PrivateRoute>
            <Layout><Clientes /></Layout>
          </PrivateRoute>
        } />
        <Route path="/clientes/new" element={
          <PrivateRoute>
            <Layout><ClienteDetalle /></Layout>
          </PrivateRoute>
        } />
        <Route path="/clientes/:id" element={
          <PrivateRoute>
            <Layout><ClienteDetalle /></Layout>
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;