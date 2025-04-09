import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>Les Bancs du Monde</h3>
          <p>Recensement des bancs publics</p>
        </div>
        
        <div className="footer-section">
          <h3>Navigation</h3>
          <ul className="footer-links">
            <li><a href="#map">Carte</a></li>
            <li><a href="#list">Liste</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>Liens</h3>
          <ul className="footer-links">
            <li><a href="#about">À propos</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>Contact</h3>
          <div className="social-links">
            <a href="#twitter" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
            <a href="#facebook" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {currentYear} Les Bancs du Monde</p>
      </div>
    </footer>
  );
}

export default Footer;