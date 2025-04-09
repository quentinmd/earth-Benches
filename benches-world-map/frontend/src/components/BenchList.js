import React from 'react';
import BenchCard from './BenchCard';

function BenchList() {
  // Mock de données de bancs
  const benches = [
    {
      id: 1,
      title: "Banc du Jardin du Luxembourg",
      location: "Paris, France",
      image: "https://example.com/bench1.jpg", 
      rating: 4.8,
      reviewCount: 124
    },
    {
      id: 2,
      title: "Banc de la Corniche Kennedy",
      location: "Marseille, France",
      image: "https://example.com/bench2.jpg",
      rating: 4.5,
      reviewCount: 89
    },
    {
      id: 3,
      title: "Banc du Parc de la Tête d'Or",
      location: "Lyon, France",
      image: "https://example.com/bench3.jpg",
      rating: 4.3,
      reviewCount: 56
    }
  ];
  
  return (
    <div className="bench-list">
      <div className="list-filters">
        <h2>Bancs populaires</h2>
        <select className="filter-select">
          <option>Mieux notés</option>
          <option>Récemment ajoutés</option>
          <option>À proximité</option>
        </select>
      </div>
      
      <div className="benches-container">
        {benches.map(bench => (
          <BenchCard key={bench.id} bench={bench} />
        ))}
      </div>
    </div>
  );
}

export default BenchList;