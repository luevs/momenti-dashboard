import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Impresoras from "./pages/Impresoras";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import Monitoreo from "./pages/Monitoreo";
import ClientesLealtad from "./pages/Clientes-lealtad"; // Nuevo

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/impresoras" element={<Layout><Impresoras /></Layout>} />
        <Route path="/reportes" element={<Layout><Reportes /></Layout>} />
        <Route path="/configuracion" element={<Layout><Configuracion /></Layout>} />
        <Route path="/monitoreo" element={<Layout><Monitoreo /></Layout>} />
        <Route path="/clientes-lealtad" element={<Layout><ClientesLealtad /></Layout>} /> {/* Nueva ruta */}
      </Routes>
    </Router>
  );
}

export default App;