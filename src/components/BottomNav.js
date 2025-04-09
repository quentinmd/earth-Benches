import React from 'react';

function BottomNav({ currentView, onNavigate, onAddBench }) {
  return (
    <nav className="bottom-nav">
      <button 
        className={`nav-btn ${currentView === 'map' ? 'active' : ''}`}
        onClick={() => onNavigate('map')}
      >
        <i className="fas fa-map-marked-alt"></i>
        <span>Carte</span>
      </button>
      
      <button 
        className={`nav-btn ${currentView === 'list' ? 'active' : ''}`}
        onClick={() => onNavigate('list')}
      >
        <i className="fas fa-list"></i>
        <span>Liste</span>
      </button>
      
      <button className="add-btn" onClick={onAddBench}>
        <i className="fas fa-plus"></i>
      </button>
      
      <button 
        className={`nav-btn ${currentView === 'favorites' ? 'active' : ''}`}
        onClick={() => onNavigate('favorites')}
      >
        <i className="fas fa-heart"></i>
        <span>Favoris</span>
      </button>
      
      <button 
        className={`nav-btn ${currentView === 'profile' ? 'active' : ''}`}
        onClick={() => onNavigate('profile')}
      >
        <i className="fas fa-user"></i>
        <span>Profil</span>
      </button>
    </nav>
  );
}

export default BottomNav;