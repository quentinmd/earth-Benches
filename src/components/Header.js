import React, { useState } from 'react';

function Header({ onViewChange, activeView }) {
  const [menuOpen, setMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  const handleNavClick = (view) => {
    onViewChange(view);
    setMenuOpen(false);
  };
  
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <h1>Les Bancs du Monde</h1>
        </div>
        
        <div className={`mobile-menu-button ${menuOpen ? 'open' : ''}`} onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>
        
        <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>
          <ul>
            <li>
              <a 
                href="#map"
                className={`nav-link ${activeView === 'map' ? 'active' : ''}`} 
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick('map');
                }}
              >
                Carte
              </a>
            </li>
            <li>
              <a 
                href="#list"
                className={`nav-link ${activeView === 'list' ? 'active' : ''}`} 
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick('list');
                }}
              >
                Liste
              </a>
            </li>
            <li>
              <a 
                href="#admin"
                className={`nav-link ${activeView === 'admin' ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick('admin');
                }}
              >
                Admin
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;