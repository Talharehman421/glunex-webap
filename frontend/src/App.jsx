import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Assess from './pages/Assess';
import Results from './pages/Results';
import About from './pages/About';
import Navbar from './components/Navbar';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/assess" element={<Assess />} />
        <Route path="/results" element={<Results />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}
