import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/login";
import './index.css';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

import Dashboard from "./pages/Dashboard";
import Maquinas from "./pages/Maquinas";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import ClientesLealtad from "./pages/Clientes-lealtad";
import Insumos from "./pages/insumos";
import MaquinaDetalle from "./pages/MaquinaDetalle";
import Corte from "./pages/Corte.jsx";
import Usuarios from "./pages/Usuarios";

// NUEVOS: pages de Clientes (asegúrate que existan los archivos)
import Clientes from "./pages/Clientes";
import ClienteDetalle from "./pages/ClienteDetalle";

// TEMPORAL: Página de migración (ELIMINAR DESPUÉS DE USAR)
import MigrationPage from "./pages/MigrationPage";

// Componente para proteger rutas (usa flag localStorage para dev)
const PrivateRoute = ({ children }) => {
  // En este entorno de desarrollo aceptamos el flag localStorage
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

        <Route path="/corte" element={
          <PrivateRoute>
            <Layout><Corte /></Layout>
          </PrivateRoute>
        } />

        <Route path="/usuarios" element={
          <PrivateRoute>
            <Layout><Usuarios /></Layout>
          </PrivateRoute>
        } />

        <Route path="/usuarios/:id" element={
          <PrivateRoute>
            <Layout><Usuarios /></Layout>
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

        {/* TEMPORAL: Ruta de migración (ELIMINAR DESPUÉS DE USAR) */}
        <Route path="/migration" element={
          <PrivateRoute>
            <MigrationPage />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;