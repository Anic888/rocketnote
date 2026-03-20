import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import './styles/themes/dark-glass.css';
import './styles/themes/ultra-dark.css';
import './styles/themes/glassmorphism.css';
import './styles/themes/light.css';
import './styles/themes/accents.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
