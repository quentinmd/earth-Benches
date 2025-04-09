import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

function AddBenchForm({ userLocation, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    material: 'wood',
    hasBackrest: false,
    comment: '',
    lat: userLocation?.lat || 0,
    lng: userLocation?.lng || 0,
  });
  const [selectedPosition, setSelectedPosition] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  
  // Initialiser la carte pour sélectionner la position du banc
  useEffect(() => {
    // Créer la carte centrée sur la position de l'utilisateur
    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView(
      [userLocation?.lat || 48.856614, userLocation?.lng || 2.352222],
      userLocation ? 18 : 13
    );
    
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);
    
    // Ajouter un marqueur initial à la position de l'utilisateur
    if (userLocation) {
      markerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        draggable: true,
      }).addTo(map);
      
      // Mettre à jour les coordonnées quand le marqueur est déplacé
      markerRef.current.on('dragend', function(e) {
        const position = markerRef.current.getLatLng();
        setSelectedPosition(position);
        setFormData(prev => ({
          ...prev,
          lat: position.lat,
          lng: position.lng,
        }));
      });
      
      setSelectedPosition(userLocation);
    }
    
    // Permettre de cliquer sur la carte pour placer le marqueur
    map.on('click', function(e) {
      const { lat, lng } = e.latlng;
      
      // Supprimer le marqueur existant s'il y en a un
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
      
      // Créer un nouveau marqueur à la position cliquée
      markerRef.current = L.marker([lat, lng], {
        draggable: true,
      }).addTo(map);
      
      // Mettre à jour les coordonnées quand le marqueur est déplacé
      markerRef.current.on('dragend', function(e) {
        const position = markerRef.current.getLatLng();
        setSelectedPosition(position);
        setFormData(prev => ({
          ...prev,
          lat: position.lat,
          lng: position.lng,
        }));
      });
      
      // Mettre à jour l'état avec la nouvelle position
      setSelectedPosition({ lat, lng });
      setFormData(prev => ({
        ...prev,
        lat,
        lng,
      }));
    });
    
    mapInstanceRef.current = map;
    
    return () => {
      if (map) map.remove();
    };
  }, [userLocation]);
  
  // Gérer les changements dans le formulaire
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  
  // Soumettre le formulaire
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      lat: selectedPosition?.lat || formData.lat,
      lng: selectedPosition?.lng || formData.lng,
    });
  };
  
  return (
    <div className="add-bench-form">
      <div 
        ref={mapRef} 
        className="location-picker-map"
      ></div>
      
      <div className="form-section">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Nom du banc:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="ex: Banc du parc"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="material">Matériau:</label>
            <select
              id="material"
              name="material"
              value={formData.material}
              onChange={handleChange}
            >
              <option value="wood">Bois</option>
              <option value="metal">Métal</option>
              <option value="stone">Pierre</option>
              <option value="concrete">Béton</option>
              <option value="plastic">Plastique</option>
              <option value="other">Autre</option>
            </select>
          </div>
          
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="hasBackrest"
                checked={formData.hasBackrest}
                onChange={handleChange}
              />
              Ce banc a un dossier
            </label>
          </div>
          
          <div className="form-group">
            <label htmlFor="comment">Commentaire:</label>
            <textarea
              id="comment"
              name="comment"
              value={formData.comment}
              onChange={handleChange}
              placeholder="Décrivez ce banc, son emplacement..."
            />
          </div>
          
          <div className="coordinates-display">
            <p>Latitude: {selectedPosition?.lat.toFixed(6) || userLocation?.lat.toFixed(6) || '?'}</p>
            <p>Longitude: {selectedPosition?.lng.toFixed(6) || userLocation?.lng.toFixed(6) || '?'}</p>
            <p className="position-hint">Ajustez la position en déplaçant le marqueur ou en cliquant sur la carte</p>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onCancel}>
              Annuler
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={!selectedPosition}
            >
              Enregistrer le banc
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddBenchForm;