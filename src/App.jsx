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

// Componente para proteger rutas usando Supabase Auth session
const PrivateRoute = ({ children }) => {
  // undefined = loading, null = not authenticated, object = session
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data?.session ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      // s may be a Session object or { session }
      setSession(s?.session ?? s ?? null);
    });

    const subscription = data?.subscription;

    return () => {
      mounted = false;
      if (subscription && typeof subscription.unsubscribe === 'function') subscription.unsubscribe();
    };
  }, []);

  // loading
  if (session === undefined) return null; // or a spinner

  // not authenticated: allow legacy localStorage flag for compatibility while migrating
  const legacyAuth = (typeof window !== 'undefined') && localStorage.getItem('isAuthenticated') === 'true';
  if (session === null && !legacyAuth) return <Navigate to="/login" />;

  return children;
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