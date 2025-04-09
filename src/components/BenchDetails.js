import React, { useState } from 'react';
import RatingSystem from './RatingSystem';

function BenchDetails({ bench, onBack }) {
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const handleSubmitReview = (e) => {
    e.preventDefault();
    // Ici, vous enverriez normalement la notation à votre API
    console.log("Évaluation soumise:", { benchId: bench.id, rating: userRating, comment });
    setSubmitted(true);
  };
  
  return (
    <div className="bench-details">
      <button className="back-btn" onClick={onBack}>
        <i className="fas fa-arrow-left"></i>
      </button>
      
      <div className="bench-images">
        {/* Image du banc (placeholder pour l'instant) */}
        <div className="bench-image-placeholder">
          <i className="fas fa-chair"></i>
        </div>
      </div>
      
      <div className="bench-info-card">
        <h2>{bench.name}</h2>
        
        <div className="bench-rating-summary">
          <div className="avg-rating">
            <span className="rating-value">{bench.rating.toFixed(1)}</span>
            <RatingSystem initialRating={Math.round(bench.rating)} readOnly={true} />
            <span className="review-count">{bench.reviewCount} avis</span>
          </div>
        </div>
        
        <div className="bench-details-list">
          <div className="detail-item">
            <i className="fas fa-chair"></i>
            <span>Matériau: {bench.material}</span>
          </div>
          <div className="detail-item">
            <i className="fas fa-couch"></i>
            <span>Dossier: {bench.hasBackrest ? 'Oui' : 'Non'}</span>
          </div>
          <div className="detail-item">
            <i className="fas fa-map-marker-alt"></i>
            <span>Coordonnées: {bench.lat.toFixed(6)}, {bench.lng.toFixed(6)}</span>
          </div>
        </div>
        
        {!submitted ? (
          <div className="review-form">
            <h3>Évaluer ce banc</h3>
            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <RatingSystem 
                  initialRating={userRating} 
                  onRatingChange={setUserRating} 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="comment">Commentaire:</label>
                <textarea 
                  id="comment" 
                  value={comment} 
                  onChange={(e) => setComment(e.target.value)} 
                  placeholder="Partagez votre expérience..." 
                />
              </div>
              
              <button 
                type="submit" 
                className="submit-review-btn"
                disabled={userRating === 0}
              >
                Soumettre mon avis
              </button>
            </form>
          </div>
        ) : (
          <div className="review-success">
            <i className="fas fa-check-circle"></i>
            <h3>Merci pour votre avis!</h3>
            <p>Votre évaluation a été enregistrée.</p>
          </div>
        )}
        
        <div className="bench-actions">
          <button className="action-btn">
            <i className="fas fa-directions"></i>
            <span>Y aller</span>
          </button>
          <button className="action-btn">
            <i className="fas fa-heart"></i>
            <span>Favoris</span>
          </button>
          <button className="action-btn">
            <i className="fas fa-share-alt"></i>
            <span>Partager</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default BenchDetails;