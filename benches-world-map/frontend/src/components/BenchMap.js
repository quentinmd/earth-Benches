import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster'; // Ajout de cette importation
import { db } from '../firebase';
import { collection, getDocs, query, limit, addDoc } from 'firebase/firestore';

function BenchMap() {
  const [loading, setLoading] = useState(true);
  const [benchCount, setBenchCount] = useState(0);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const benchDataRef = useRef([]);

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
        
        // Permettre l'ajout de nouveaux bancs
        map.on('click', function(e) {
          if (window.confirm("Voulez-vous ajouter un nouveau banc à cet endroit?")) {
            addNewBench(e.latlng, map);
          }
        });
      });
    } catch (error) {
      console.error("❌ Erreur critique:", error);
      setError(`Erreur critique: ${error.message}`);
      setLoading(false);
    }
    
    return () => {
      if (map) map.remove();
    };
  }, []);

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
          
          // Construire le contenu du popup
          let popupContent = `<div class="bench-popup">`;
          popupContent += `<h3>Banc #${bench.id ? bench.id.substring(0, 8) : ''}</h3>`;
          
          if (bench.tags) {
            if (bench.tags.material) {
              popupContent += `<p>Matériau: ${bench.tags.material}</p>`;
            }
            if (bench.tags.backrest) {
              popupContent += `<p>Dossier: ${bench.tags.backrest === 'yes' ? 'Oui' : 'Non'}</p>`;
            }
          }
          
          popupContent += `
            <div class="bench-actions">
              <button class="rate-btn" data-bench-id="${bench.id}">Noter</button>
              ${bench.osmId ? `<a href="https://www.openstreetmap.org/node/${bench.osmId}" target="_blank" class="osm-link">Voir sur OSM</a>` : ''}
            </div>
          </div>`;
          
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

  // Fonction pour ajouter un nouveau banc
  const addNewBench = (latlng, map) => {
    const newBenchId = `user-${Date.now()}`;
    
    // Créer un formulaire popup
    const marker = L.marker([latlng.lat, latlng.lng]).addTo(map);
    marker.bindPopup(`
      <div class="new-bench-form">
        <h3>Nouveau banc</h3>
        <form id="bench-form">
          <div class="form-group">
            <label>Matériau:</label>
            <select id="bench-material">
              <option value="wood">Bois</option>
              <option value="metal">Métal</option>
              <option value="stone">Pierre</option>
              <option value="concrete">Béton</option>
              <option value="plastic">Plastique</option>
            </select>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="bench-backrest"> 
              Avec dossier
            </label>
          </div>
          <div class="form-actions">
            <button type="submit" class="save-btn">Enregistrer</button>
            <button type="button" class="cancel-btn" id="cancel-bench">Annuler</button>
          </div>
        </form>
      </div>
    `).openPopup();
    
    // Gérer la soumission du formulaire
    setTimeout(() => {
      const form = document.getElementById('bench-form');
      const cancelBtn = document.getElementById('cancel-bench');
      
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          try {
            const material = document.getElementById('bench-material').value;
            const hasBackrest = document.getElementById('bench-backrest').checked;
            
            // Créer le nouveau banc
            const newBench = {
              lat: latlng.lat,
              lon: latlng.lng,
              tags: {
                material,
                backrest: hasBackrest ? 'yes' : 'no'
              },
              source: 'user',
              dateAdded: new Date().toISOString()
            };
            
            // Ajouter à Firestore
            const docRef = await addDoc(collection(db, "benches"), newBench);
            console.log("✅ Nouveau banc ajouté:", newBench);
            
            // Ajouter au cache local
            benchDataRef.current.push({
              id: docRef.id,
              ...newBench
            });
            
            // Fermer le popup et supprimer le marqueur temporaire
            map.closePopup();
            map.removeLayer(marker);
            
            // Rafraîchir les bancs
            alert("Banc ajouté avec succès!");
            filterBenchesInView(map);
          } catch (error) {
            console.error("❌ Erreur lors de l'ajout du banc:", error);
            alert(`Erreur lors de l'ajout du banc: ${error.message}`);
          }
        });
      }
      
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          map.closePopup();
          map.removeLayer(marker);
        });
      }
    }, 100);
  };

  return (
    <div className="map-container">
      <div id="map" style={{ height: '100%', minHeight: 'calc(100vh - 70px)' }}></div>
      
      {/* Instructions */}
      <div className="user-instructions">
        <div className="instructions-panel">
          <p><strong>Cliquez sur la carte</strong> pour ajouter un nouveau banc</p>
        </div>
      </div>
      
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