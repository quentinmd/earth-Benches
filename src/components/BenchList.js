import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, limit, where, orderBy } from 'firebase/firestore';
import BenchCard from './BenchCard';

function BenchList({ onViewChange }) {
  const [benches, setBenches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('rating');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadLimit, setLoadLimit] = useState(50); // Limite initiale de 50 bancs

  useEffect(() => {
    fetchBenches();
  }, [filterType, sortBy, loadLimit]); // Recharger quand les filtres ou la limite changent

  const fetchBenches = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Base de la requête
      let benchesRef = collection(db, "benches");
      let benchQuery;
      
      // Appliquer différentes requêtes selon le filtre
      if (filterType === 'rated') {
        // Uniquement les bancs notés (avec une note > 0)
        benchQuery = query(
          benchesRef,
          where("averageRating", ">", 0),
          orderBy("averageRating", "desc"),
          limit(loadLimit)
        );
      } else {
        // Requête standard avec limite
        benchQuery = query(
          benchesRef,
          orderBy(sortBy === 'rating' ? 'averageRating' : 'dateAdded', 
                 sortBy === 'rating' ? 'desc' : 'desc'),
          limit(loadLimit)
        );
      }
      
      const querySnapshot = await getDocs(benchQuery);
      
      if (querySnapshot.empty) {
        setError("Aucun banc trouvé dans la base de données");
        setLoading(false);
        return;
      }
      
      // Transformer en tableau
      const benchesData = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        benchesData.push({
          id: doc.id,
          title: getBenchName(data),
          location: getBenchLocation(data),
          rating: data.averageRating || 0,
          ratingCount: data.ratingCount || 0,
          dateAdded: data.dateAdded || '',
          tags: data.tags || {},
          lat: data.lat,
          lon: data.lon,
          source: data.source
        });
      });
      
      setBenches(benchesData);
    } catch (error) {
      console.error("❌ Erreur lors du chargement des bancs:", error);
      setError(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Extraire le nom du banc depuis les données
  const getBenchName = (bench) => {
    if (bench.tags && bench.tags.name) return bench.tags.name;
    if (bench.tags && bench.tags.description) return bench.tags.description;
    if (bench.tags && bench.tags.ref) return `Banc ${bench.tags.ref}`;
    return `Banc #${bench.id ? bench.id.substring(0, 8) : ''}`;
  };

  // Extraire la localisation du banc
  const getBenchLocation = (bench) => {
    return `${bench.lat.toFixed(6)}, ${bench.lon.toFixed(6)}`;
  };

  // Filtrer les bancs pour la recherche
  const getSortedAndFilteredBenches = () => {
    if (!searchQuery) return benches;
    
    // Appliquer la recherche
    const query = searchQuery.toLowerCase();
    return benches.filter(bench => 
      bench.title.toLowerCase().includes(query)
    );
  };

  // Gérer le changement de filtre de tri
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  // Gérer le changement de filtre de type
  const handleFilterChange = (e) => {
    setFilterType(e.target.value);
  };

  // Gérer la recherche
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Charger plus de bancs
  const loadMoreBenches = () => {
    setLoadLimit(prev => prev + 50);
  };

  // Fonction pour naviguer vers le banc sur la carte
  const viewBenchOnMap = (bench) => {
    // Stocker les coordonnées du banc dans sessionStorage pour les récupérer dans la vue carte
    sessionStorage.setItem('selectedBench', JSON.stringify({
      id: bench.id,
      lat: bench.lat,
      lon: bench.lon
    }));
    
    // Changer la vue pour la carte
    onViewChange('map');
  };

  // Obtenir les bancs filtrés et triés
  const sortedAndFilteredBenches = getSortedAndFilteredBenches();

  return (
    <div className="bench-list-container">
      <div className="list-header">
        <h1>Liste des bancs</h1>
        <p className="bench-count">{sortedAndFilteredBenches.length} bancs affichés (limite: {loadLimit})</p>
      </div>

      <div className="list-filters">
        <div className="search-box">
          <input 
            type="text"
            placeholder="Rechercher un banc..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
          <i className="fas fa-search search-icon"></i>
        </div>
        
        <div className="filter-group">
          <label>Trier par:</label>
          <select className="filter-select" value={sortBy} onChange={handleSortChange}>
            <option value="rating">Meilleure note</option>
            <option value="ratingCount">Nombre d'avis</option>
            <option value="recent">Récemment ajoutés</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Afficher:</label>
          <select className="filter-select" value={filterType} onChange={handleFilterChange}>
            <option value="all">Tous les bancs</option>
            <option value="rated">Bancs notés uniquement</option>
            <option value="withBackrest">Avec dossier</option>
            <option value="wooden">En bois</option>
            <option value="metal">En métal</option>
            <option value="stone">En pierre</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Chargement des bancs...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="benches-grid">
            {sortedAndFilteredBenches.length > 0 ? (
              sortedAndFilteredBenches.map(bench => (
                <BenchCard 
                  key={bench.id} 
                  bench={bench} 
                  onViewMap={() => viewBenchOnMap(bench)} 
                />
              ))
            ) : (
              <div className="no-benches-found">
                <i className="fas fa-search"></i>
                <p>Aucun banc ne correspond à vos critères</p>
              </div>
            )}
          </div>
          
          {benches.length >= loadLimit && (
            <div className="load-more-container">
              <button onClick={loadMoreBenches} className="load-more-btn">
                Charger plus de bancs
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BenchList;