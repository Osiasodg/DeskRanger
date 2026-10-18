import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Un fichier lâché hors d'une zone ne doit pas remplacer la page.
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

createRoot(document.getElementById('root')).render(<App />);
