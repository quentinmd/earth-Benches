import React, { useState } from 'react';

function RatingSystem({ initialRating = 0, onRatingChange, readOnly = false }) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  const handleStarClick = (selectedRating) => {
    if (readOnly) return;
    
    setRating(selectedRating);
    if (onRatingChange) {
      onRatingChange(selectedRating);
    }
  };

  const handleStarHover = (hoveredRating) => {
    if (readOnly) return;
    setHoverRating(hoveredRating);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverRating(0);
  };

  // Générer 5 étoiles
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    let starClass = 'star';
    if (readOnly) {
      starClass += ' read-only';
    }
    
    if ((hoverRating && i <= hoverRating) || (!hoverRating && i <= rating)) {
      starClass += ' filled';
    }
    
    stars.push(
      <span 
        key={i}
        className={starClass}
        onClick={() => handleStarClick(i)}
        onMouseEnter={() => handleStarHover(i)}
        onMouseLeave={handleMouseLeave}
      >
        ★
      </span>
    );
  }

  return (
    <div className="rating-system">
      <div className="stars-container">
        {stars}
      </div>
      {!readOnly && (
        <div className="rating-label">
          {rating > 0 ? (
            getRatingLabel(rating)
          ) : (
            "Évaluez ce banc"
          )}
        </div>
      )}
    </div>
  );
}

// Obtenir un libellé descriptif en fonction de la note
function getRatingLabel(rating) {
  switch (rating) {
    case 1:
      return "Inconfortable";
    case 2:
      return "Passable";
    case 3:
      return "Correct";
    case 4:
      return "Confortable";
    case 5:
      return "Très confortable";
    default:
      return "";
  }
}

export default RatingSystem;