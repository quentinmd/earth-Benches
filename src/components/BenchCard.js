import React from 'react';

function BenchCard({ bench, onViewMap }) {
  // Utiliser placehold.co pour générer des images placeholder selon le matériau
  const getBenchImage = () => {
    // Couleur de base en fonction du matériau
    let color = "4CAF50"; // Vert par défaut
    let textColor = "FFFFFF"; // Texte blanc

    if (bench.tags && bench.tags.material) {
      switch (bench.tags.material) {
        case 'wood':
          color = "8B4513"; // Marron pour le bois
          break;
        case 'metal':
          color = "A9A9A9"; // Gris pour le métal
          break;
        case 'stone':
          color = "696969"; // Gris foncé pour la pierre
          break;
        case 'concrete':
          color = "808080"; // Gris pour le béton
          break;
        case 'plastic':
          color = "1E90FF"; // Bleu pour le plastique
          break;
        default:
          color = "4CAF50"; // Vert par défaut
      }
    }

    // Texte à afficher sur le placeholder
    const material = bench.tags?.material ? bench.tags.material : "banc";
    
    // Générer l'URL du placeholder avec le texte et la couleur
    return `https://placehold.co/600x400/${color}/${textColor}?text=Banc+en+${material}`;
  };

  // Formater la date pour l'affichage
  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Date invalide';
    }
  };

  // Déterminer les badges à afficher
  const renderBadges = () => {
    const badges = [];
    
    if (bench.source === 'user') {
      badges.push(
        <span key="user" className="badge badge-user">
          <i className="fas fa-user"></i> Ajouté par un utilisateur
        </span>
      );
    }
    
    if (bench.tags && bench.tags.backrest === 'yes') {
      badges.push(
        <span key="backrest" className="badge badge-feature">
          <i className="fas fa-chair"></i> Avec dossier
        </span>
      );
    }
    
    if (bench.tags && bench.tags.material) {
      badges.push(
        <span key="material" className="badge badge-material">
          <i className="fas fa-cube"></i> {getBenchMaterial(bench.tags.material)}
        </span>
      );
    }
    
    return badges;
  };

  // Obtenir le nom du matériau en français
  const getBenchMaterial = (material) => {
    switch (material) {
      case 'wood': return 'Bois';
      case 'metal': return 'Métal';
      case 'stone': return 'Pierre';
      case 'concrete': return 'Béton';
      case 'plastic': return 'Plastique';
      default: return material;
    }
  };

  return (
    <div className="bench-card">
      <div className="bench-image">
        <img src={getBenchImage()} alt={bench.title} />
      </div>
      <div className="bench-info">
        <h3>{bench.title}</h3>
        <div className="bench-badges">
          {renderBadges()}
        </div>
        <p className="bench-location">
          <i className="fas fa-map-marker-alt"></i> {bench.location}
        </p>
        <div className="bench-rating">
          <span className="stars">
            {'★'.repeat(Math.floor(bench.rating))}
            {'☆'.repeat(5 - Math.floor(bench.rating))}
          </span>
          <span className="rating-value">{bench.rating.toFixed(1)}</span>
          <span className="review-count">({bench.ratingCount} avis)</span>
        </div>
        <p className="bench-date">
          <i className="far fa-calendar-alt"></i> {formatDate(bench.dateAdded)}
        </p>
      </div>
      <div className="bench-actions">
        <button className="view-map-btn" onClick={onViewMap}>
          <i className="fas fa-map"></i> Voir sur la carte
        </button>
      </div>
    </div>
  );
}

export default BenchCard;