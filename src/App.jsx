import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Impresoras from "./pages/Impresoras";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import ClientesLealtad from "./pages/clientes-lealtad";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/impresoras" element={<Layout><Impresoras /></Layout>} />
        <Route path="/reportes" element={<Layout><Reportes /></Layout>} />
        <Route path="/configuracion" element={<Layout><Configuracion /></Layout>} />
        <Route path="/clientes-lealtad" element={<Layout><ClientesLealtad /></Layout>} /> {/* Nueva ruta */}
      </Routes>
    </Router>
  );
}

export default App;