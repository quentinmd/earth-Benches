import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { db } from '../firebase';
import { collection, getDocs, query, limit, addDoc, doc, updateDoc, getDoc, arrayUnion, setDoc } from 'firebase/firestore';

function BenchMap() {
  const [loading, setLoading] = useState(true);
  const [benchCount, setBenchCount] = useState(0);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const benchDataRef = useRef([]);
  const currentRatingBenchId = useRef(null);

  // Vérifier s'il y a un banc sélectionné depuis la page liste
  useEffect(() => {
    const selectedBenchData = sessionStorage.getItem('selectedBench');
    
    if (selectedBenchData) {
      try {
        const selectedBench = JSON.parse(selectedBenchData);
        
        // Si on a un banc sélectionné et la carte est chargée
        if (selectedBench && mapInstanceRef.current) {
          console.log("🎯 Centrage sur le banc sélectionné:", selectedBench);
          
          // Centrer la carte sur le banc
          mapInstanceRef.current.setView([selectedBench.lat, selectedBench.lon], 18);
          
          // Chercher le marqueur correspondant et l'ouvrir
          setTimeout(() => {
            const layers = markersLayerRef.current.getLayers();
            for (const layer of layers) {
              if (layer.options.benchId === selectedBench.id) {
                layer.openPopup();
                break;
              }
            }
          }, 1000); // Petit délai pour s'assurer que les marqueurs sont chargés
          
          // Supprimer l'info après utilisation
          sessionStorage.removeItem('selectedBench');
        }
      } catch (error) {
        console.error("Erreur lors de la lecture du banc sélectionné:", error);
      }
    }
  }, [mapInstanceRef.current]);

  // Initialiser la carte
  useEffect(() => {
    console.log("🔄 Initialisation de la carte...");
    let map;
    
    try {
      // Initialisation de la carte Leaflet
      map = L.map('map', {
        zoomControl: false,
        attributionControl: true
      }).setView([48.856614, 2.352222], 13); // Paris
      
      // Ajouter les contrôles de zoom
      L.control.zoom({
        position: 'bottomright'
      }).addTo(map);
      
      // Ajouter le fond de carte
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      // Vérifier que le plugin MarkerCluster est disponible
      if (!L.markerClusterGroup) {
        console.error("⚠️ Le plugin MarkerCluster n'est pas disponible !");
        throw new Error("Le plugin Leaflet.MarkerCluster n'est pas chargé correctement");
      }
      
      // Créer le groupe de marqueurs pour les clusters
      const markers = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        disableClusteringAtZoom: 18,
        spiderfyOnMaxZoom: false
      });
      
      markersLayerRef.current = markers;
      map.addLayer(markers);
      
      mapInstanceRef.current = map;
      
      // Charger tous les bancs une seule fois
      fetchAllBenches().then(() => {
        // Filtre les bancs visibles une fois chargés
        filterBenchesInView(map);
        
        // Réagir aux mouvements de carte
        map.on('moveend', function() {
          filterBenchesInView(map);
        });
      });

      // Ajouter un gestionnaire d'événements pour les clics sur les boutons de notation
      document.addEventListener('click', handleRatingClick);
      
    } catch (error) {
      console.error("❌ Erreur critique:", error);
      setError(`Erreur critique: ${error.message}`);
      setLoading(false);
    }
    
    return () => {
      if (map) map.remove();
      document.removeEventListener('click', handleRatingClick);
    };
  }, []);

  // Gestionnaire pour les clics sur les boutons de notation
  const handleRatingClick = (e) => {
    const target = e.target;
    
    // Si on clique sur le bouton "Noter"
    if (target.classList.contains('rate-btn')) {
      const benchId = target.getAttribute('data-bench-id');
      if (benchId) {
        showRatingForm(benchId);
      }
    }
    
    // Si on clique sur une étoile de notation
    if (target.classList.contains('rating-star')) {
      const rating = parseInt(target.getAttribute('data-rating'));
      const benchId = currentRatingBenchId.current;
      
      if (benchId && !isNaN(rating)) {
        submitRating(benchId, rating);
      }
    }
  };

  // Afficher le formulaire de notation
  const showRatingForm = (benchId) => {
    currentRatingBenchId.current = benchId;
    
    const popup = document.querySelector(`.bench-popup[data-bench-id="${benchId}"]`);
    if (popup) {
      const ratingUI = popup.querySelector('.rating-ui');
      
      if (ratingUI) {
        ratingUI.style.display = 'block';
        const ratingMsg = popup.querySelector('.rating-message');
        if (ratingMsg) {
          ratingMsg.textContent = 'Sélectionnez une note:';
        }
      }
    }
  };

  // Soumettre une note
  const submitRating = async (benchId, rating) => {
    try {
      console.log(`📝 Soumission d'une note de ${rating} étoiles pour le banc ${benchId}`);
      
      // Récupérer les références Firebase
      const benchRef = doc(db, "benches", benchId);
      const ratingsRef = doc(db, "bench_ratings", benchId);
      
      // Enregistrer la note dans la collection bench_ratings
      await setDoc(ratingsRef, {
        ratings: arrayUnion({
          value: rating,
          timestamp: new Date().toISOString()
        })
      }, { merge: true });
      
      // Récupérer toutes les notes pour calculer la moyenne
      const ratingsDoc = await getDoc(ratingsRef);
      const ratings = ratingsDoc.exists() ? ratingsDoc.data().ratings : [];
      const avgRating = ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length;
      
      // Mettre à jour la note moyenne dans le document du banc
      await updateDoc(benchRef, {
        averageRating: avgRating,
        ratingCount: ratings.length
      });
      
      // Mettre à jour le banc dans la cache locale
      const benchIndex = benchDataRef.current.findIndex(b => b.id === benchId);
      if (benchIndex !== -1) {
        benchDataRef.current[benchIndex].averageRating = avgRating;
        benchDataRef.current[benchIndex].ratingCount = ratings.length;
      }
      
      // Rafraîchir l'affichage
      const map = mapInstanceRef.current;
      if (map) {
        map.closePopup();
        filterBenchesInView(map);
      }
      
      alert(`Merci pour votre note de ${rating} étoiles!`);
      
    } catch (error) {
      console.error("❌ Erreur lors de la notation:", error);
      alert(`Erreur lors de la notation: ${error.message}`);
    }
  };

  // Fonction pour récupérer tous les bancs
  const fetchAllBenches = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("📚 Chargement des bancs depuis Firebase...");
      
      // Vérifier si les données sont déjà en cache
      if (benchDataRef.current.length > 0) {
        console.log("📦 Utilisation du cache - bancs déjà chargés:", benchDataRef.current.length);
        setLoading(false);
        return;
      }
      
      // Récupérer tous les bancs depuis Firestore
      const benchesRef = collection(db, "benches");
      const querySnapshot = await getDocs(benchesRef);
      
      if (querySnapshot.empty) {
        console.warn("⚠️ Aucun banc trouvé dans Firebase");
        setError("Aucun banc trouvé dans la base de données");
        setLoading(false);
        return;
      }
      
      console.log(`✅ ${querySnapshot.size} bancs trouvés dans Firebase`);
      
      // Transformer en tableau et stocker dans la référence
      const benches = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        benches.push({
          id: doc.id,
          ...data
        });
      });
      
      // Stocker dans le cache
      benchDataRef.current = benches;
      console.log(`📥 ${benches.length} bancs stockés en mémoire`);
      
    } catch (error) {
      console.error("❌ Erreur lors du chargement des bancs:", error);
      setError(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour filtrer et afficher les bancs dans la vue actuelle
  const filterBenchesInView = (map) => {
    try {
      setLoading(true);
      
      // Obtenir les limites de la carte
      const bounds = map.getBounds();
      const south = bounds.getSouth();
      const west = bounds.getWest();
      const north = bounds.getNorth();
      const east = bounds.getEast();
      
      console.log(`🗺️ Zone visible: ${south.toFixed(4)},${west.toFixed(4)} à ${north.toFixed(4)},${east.toFixed(4)}`);
      
      // Vérifier si des bancs sont chargés
      if (benchDataRef.current.length === 0) {
        console.warn("⚠️ Aucun banc en mémoire");
        setLoading(false);
        return;
      }
      
      // Filtrer les bancs visibles
      const benchesInView = benchDataRef.current.filter(bench => 
        bench.lat >= south && 
        bench.lat <= north && 
        bench.lon >= west && 
        bench.lon <= east
      );
      
      console.log(`🔍 ${benchesInView.length} bancs dans la vue actuelle sur ${benchDataRef.current.length} au total`);
      
      // Afficher les bancs
      displayBenches(benchesInView, map);
      
    } catch (error) {
      console.error("❌ Erreur lors du filtrage des bancs:", error);
      setError(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour afficher les bancs sur la carte
  const displayBenches = (benchData, map) => {
    try {
      console.log(`🌟 Affichage de ${benchData.length} bancs sur la carte`);
      
      // Vider le calque des marqueurs
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
      }
      
      // Limiter le nombre de marqueurs pour éviter de surcharger le navigateur
      const maxMarkers = 2000;
      let benchesToShow = benchData;
      
      if (benchData.length > maxMarkers) {
        console.warn(`⚠️ Limitation à ${maxMarkers} marqueurs sur ${benchData.length}`);
        benchesToShow = benchData.slice(0, maxMarkers);
        setError(`Trop de bancs dans cette zone (${benchData.length}). Affichage limité à ${maxMarkers} bancs.`);
      } else {
        setError(null);
      }
      
      // Créer un marqueur pour chaque banc
      let markersAdded = 0;
      
      benchesToShow.forEach((bench) => {
        try {
          // Vérifier que les coordonnées sont valides
          const lat = Number(bench.lat);
          const lng = Number(bench.lon);
          
          if (isNaN(lat) || isNaN(lng)) {
            return; // Ignorer ce banc
          }
          
          // Créer l'icône personnalisée
          const benchIcon = L.divIcon({
            className: `bench-marker ${bench.source === 'user' ? 'user-added' : ''}`,
            html: `<div class="bench-icon"><i class="fas fa-chair"></i></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
          });
          
          // Créer le marqueur
          const marker = L.marker([lat, lng], {
            icon: benchIcon,
            benchId: bench.id
          });
          
          // Extraire le nom du banc depuis les tags OSM s'il existe
          const getBenchName = (bench) => {
            if (bench.tags) {
              if (bench.tags.name) return bench.tags.name;
              if (bench.tags.description) return bench.tags.description;
              if (bench.tags.ref) return `Banc ${bench.tags.ref}`;
            }
            return `Banc #${bench.id.substring(0, 8)}`;
          };

          const benchName = getBenchName(bench);
          
          // Construire le contenu du popup avec uniquement la note et le bouton noter
          const averageRating = bench.averageRating || 0;
          const ratingCount = bench.ratingCount || 0;
          
          let popupContent = `
            <div class="bench-popup" data-bench-id="${bench.id}">
              <h3>${benchName}</h3>
              
              <div class="bench-rating">
                <div class="stars-display">
                  ${'★'.repeat(Math.floor(averageRating))}${'☆'.repeat(5 - Math.floor(averageRating))}
                  <span class="rating-value">${averageRating.toFixed(1)}</span>
                  <span class="review-count">(${ratingCount} avis)</span>
                </div>
              </div>
              
              <div class="rating-ui" style="display: none;">
                <p class="rating-message">Chargement...</p>
                <div class="stars-input">
                  <span class="rating-star" data-rating="1">☆</span>
                  <span class="rating-star" data-rating="2">☆</span>
                  <span class="rating-star" data-rating="3">☆</span>
                  <span class="rating-star" data-rating="4">☆</span>
                  <span class="rating-star" data-rating="5">☆</span>
                </div>
              </div>
              
              <button class="rate-btn" data-bench-id="${bench.id}">Noter</button>
            </div>
          `;
          
          marker.bindPopup(popupContent);
          
          // Ajouter le marqueur au groupe
          markersLayerRef.current.addLayer(marker);
          markersAdded++;
        } catch (err) {
          console.error(`❌ Erreur lors de l'ajout d'un marqueur:`, err);
        }
      });
      
      console.log(`✅ ${markersAdded} marqueurs ajoutés sur la carte`);
      
      // Mettre à jour le compteur
      setBenchCount(benchData.length);
    } catch (error) {
      console.error("❌ Erreur lors de l'affichage des bancs:", error);
    }
  };

  return (
    <div className="map-container">
      <div id="map" style={{ height: '100%', minHeight: 'calc(100vh - 70px)' }}></div>
      
      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Chargement des bancs...</p>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="error-overlay">{error}</div>
      )}

      {/* Bench count */}
      <div className="bench-count-control">
        <strong>{benchCount}</strong> bancs trouvés dans cette zone
      </div>
    </div>
  );
}

export default BenchMap;