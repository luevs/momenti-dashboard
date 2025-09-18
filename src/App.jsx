import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import './index.css';

import Dashboard from "./pages/Dashboard";
import Maquinas from "./pages/Maquinas";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import ClientesLealtad from "./pages/clientes-lealtad";
import Insumos from "./pages/insumos";
import MaquinaDetalle from "./pages/MaquinaDetalle";

function App() {
  return (
   <Router>
  <Routes>
    <Route path="/" element={<Layout><Dashboard /></Layout>} />
    <Route path="/maquinas" element={<Layout><Maquinas /></Layout>} />
    <Route path="/maquinas/:id" element={<Layout><MaquinaDetalle /></Layout>} />
    <Route path="/reportes" element={<Layout><Reportes /></Layout>} />
    <Route path="/configuracion" element={<Layout><Configuracion /></Layout>} />
    <Route path="/clientes-lealtad" element={<Layout><ClientesLealtad /></Layout>} />
    <Route path="/insumos" element={<Layout><Insumos /></Layout>} />
  </Routes>
</Router>
  );
}

export default App;