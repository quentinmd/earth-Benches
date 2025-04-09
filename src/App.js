import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import BenchMap from './components/BenchMap';
import BenchList from './components/BenchList';
import AdminPanel from './components/AdminPanel';
import './styles/main.css';
import './styles/responsive.css';
import './styles/map.css';
import './styles/admin.css';
import './styles/header.css';
import './styles/footer.css';
import './styles/list.css';

function App() {
  const [activeView, setActiveView] = useState('map');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return (
    <div className={`app ${isMobile ? 'mobile-view' : ''}`}>
      <Header onViewChange={setActiveView} activeView={activeView} />
      <main className="main-content">
        {activeView === 'map' && <BenchMap />}
        {activeView === 'list' && <BenchList onViewChange={setActiveView} />}
        {activeView === 'admin' && <AdminPanel />}
      </main>
      <Footer />
    </div>
  );
}

export default App;