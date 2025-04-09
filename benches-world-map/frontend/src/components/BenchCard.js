import React from 'react';

function BenchCard({ bench }) {
  return (
    <div className="bench-card">
      <div className="bench-image">
        <img src={bench.image} alt={bench.title} />
      </div>
      <div className="bench-info">
        <h3>{bench.title}</h3>
        <p className="bench-location">{bench.location}</p>
        <div className="bench-rating">
          <span className="stars">
            {'★'.repeat(Math.floor(bench.rating))}
            {'☆'.repeat(5 - Math.floor(bench.rating))}
          </span>
          <span className="rating-value">{bench.rating}</span>
          <span className="review-count">({bench.reviewCount} avis)</span>
        </div>
      </div>
      <button className="see-more-btn">Voir détails</button>
    </div>
  );
}

export default BenchCard;