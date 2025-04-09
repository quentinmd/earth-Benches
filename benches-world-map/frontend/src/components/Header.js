import React, { useState } from 'react';

function Header({ onViewChange, activeView }) {
  const [menuOpen, setMenuOpen] = useState(false);
  
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <h1>Les Bancs du Monde</h1>
        </div>
        
        <div className="mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </div>
        
        <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>
          <ul>
            <li>
              <button 
                className={activeView === 'map' ? 'active' : ''} 
                onClick={() => onViewChange('map')}
              >
                Carte
              </button>
            </li>
            <li>
              <button 
                className={activeView === 'list' ? 'active' : ''} 
                onClick={() => onViewChange('list')}
              >
                Liste
              </button>
            </li>
            <li><button>Se connecter</button></li>
            <li><button>S'inscrire</button></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;