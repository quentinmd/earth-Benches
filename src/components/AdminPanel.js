import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

function AdminPanel() {
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [benchCount, setBenchCount] = useState(0);
  const [benches, setBenches] = useState([]);
  const [region, setRegion] = useState({
    south: 48.815573, // Latitude Sud de Paris
    west: 2.224199,   // Longitude Ouest de Paris
    north: 48.902156, // Latitude Nord de Paris
    east: 2.469920    // Longitude Est de Paris
  });

  // Récupérer les bancs existants
  useEffect(() => {
    fetchBenches();
  }, []);
  
  // Fonction pour récupérer tous les bancs
  const fetchBenches = async () => {
    try {
      const benchesRef = collection(db, "benches");
      const snapshot = await getDocs(benchesRef);
      const benchList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setBenches(benchList);
      setBenchCount(benchList.length);
    } catch (error) {
      console.error("Erreur lors de la récupération des bancs:", error);
      setMessage(`Erreur: ${error.message}`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Assurer que la valeur est un nombre et utiliser un point comme séparateur décimal
    const numericValue = value.replace(',', '.');
    setRegion(prev => ({
      ...prev,
      [name]: parseFloat(numericValue)
    }));
  };

  const handleImport = async (e) => {
    e.preventDefault();
    setIsImporting(true);
    setMessage("Préparation de l'importation...");
    setProgress(0);
    
    try {
      // S'assurer que les coordonnées utilisent des points comme séparateurs
      const { south, west, north, east } = {
        south: parseFloat(region.south.toString().replace(',', '.')),
        west: parseFloat(region.west.toString().replace(',', '.')),
        north: parseFloat(region.north.toString().replace(',', '.')),
        east: parseFloat(region.east.toString().replace(',', '.'))
      };
      
      console.log(`Coordonnées utilisées pour l'importation: ${south}, ${west}, ${north}, ${east}`);
      
      // Récupérer les bancs existants pour vérifier les doublons
      setMessage("Récupération des bancs existants pour éviter les doublons...");
      
      const benchesRef = collection(db, "benches");
      const snapshot = await getDocs(benchesRef);
      
      // Créer un index pour recherche rapide basé sur les coordonnées
      const existingCoords = {};
      snapshot.forEach(doc => {
        const bench = doc.data();
        if (bench.lat && bench.lon) {
          // Créer une clé unique basée sur les coordonnées arrondies à 6 décimales
          const coordKey = `${bench.lat.toFixed(6)}_${bench.lon.toFixed(6)}`;
          existingCoords[coordKey] = true;
        }
      });
      
      console.log(`${Object.keys(existingCoords).length} coordonnées uniques déjà en base`);
      
      // Requête Overpass API
      const overpassQuery = `
        [out:json][timeout:60];
        (
          node["amenity"="bench"](${south},${west},${north},${east});
          way["amenity"="bench"](${south},${west},${north},${east});
          node["public_transport"="platform"]["bench"="yes"](${south},${west},${north},${east});
          node["public_transport"="stop_position"]["bench"="yes"](${south},${west},${north},${east});
          node["highway"="bus_stop"]["bench"="yes"](${south},${west},${north},${east});
        );
        out body;
        >;
        out skel qt;
      `;
      
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
      setMessage("Récupération des bancs depuis OpenStreetMap...");
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erreur de l'API Overpass: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filtrer pour ne garder que les éléments avec coordonnées valides
      const validElements = data.elements.filter(
        elem => elem.type === 'node' && typeof elem.lat === 'number' && typeof elem.lon === 'number'
      );
      
      setMessage(`${validElements.length} bancs valides trouvés. Vérification des doublons...`);
      
      // Tous les éléments valides
      const elementsToImport = validElements;
      
      // Importer les bancs par lots pour éviter les limitations Firebase
      const batchSize = 50; // Taille de chaque lot
      const totalBatches = Math.ceil(elementsToImport.length / batchSize);
      let importedCount = 0;
      let duplicatesSkipped = 0;

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * batchSize;
        const end = Math.min(start + batchSize, elementsToImport.length);
        const currentBatch = elementsToImport.slice(start, end);
        
        setMessage(`Traitement du lot ${batchIndex+1}/${totalBatches} (${start+1} à ${end} sur ${elementsToImport.length} bancs)`);
        
        // Traiter chaque banc du lot actuel
        for (let i = 0; i < currentBatch.length; i++) {
          try {
            const bench = currentBatch[i];
            
            // Vérifier si le banc existe déjà à ces coordonnées
            const coordKey = `${bench.lat.toFixed(6)}_${bench.lon.toFixed(6)}`;
            
            if (!existingCoords[coordKey]) {
              // Ajouter le banc seulement s'il n'existe pas déjà
              await addDoc(collection(db, "benches"), {
                osmId: bench.id.toString(),
                lat: bench.lat,
                lon: bench.lon,
                tags: bench.tags || {},
                source: "osm",
                dateAdded: new Date().toISOString()
              });
              
              // Marquer comme existant pour les prochaines vérifications
              existingCoords[coordKey] = true;
              importedCount++;
            } else {
              duplicatesSkipped++;
            }
            
            const processedCount = importedCount + duplicatesSkipped;
            const progressPercent = Math.round((processedCount / elementsToImport.length) * 100);
            setProgress(progressPercent);
            
            if (i % 10 === 0) { // Mettre à jour le message tous les 10 bancs
              setMessage(`Importation en cours: ${importedCount} ajoutés, ${duplicatesSkipped} doublons ignorés (${progressPercent}%)`);
            }
          } catch (err) {
            console.error(`Erreur lors de l'importation du banc:`, err);
          }
        }
        
        // Pause entre les lots pour éviter de surcharger Firebase
        if (batchIndex < totalBatches - 1) {
          setMessage(`Pause de 1 seconde avant le prochain lot...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      setMessage(`Importation terminée: ${importedCount} bancs ajoutés, ${duplicatesSkipped} doublons ignorés`);
      
      // Actualiser la liste
      await fetchBenches();
      
    } catch (error) {
      console.error("Erreur lors de l'importation:", error);
      setMessage(`Erreur: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Nettoyer les doublons existants
  const cleanupDuplicates = async () => {
    if (!window.confirm("Cette action va rechercher et supprimer les bancs en double basés sur les coordonnées identiques. Continuer?")) {
      return;
    }
    
    setIsImporting(true);
    setMessage("Recherche des doublons...");
    setProgress(0);
    
    try {
      const benchesRef = collection(db, "benches");
      const snapshot = await getDocs(benchesRef);
      
      // Regrouper par coordonnées
      const coordGroups = {};
      let totalBenches = 0;
      
      snapshot.forEach(doc => {
        totalBenches++;
        const bench = doc.data();
        if (bench.lat && bench.lon) {
          const coordKey = `${bench.lat.toFixed(6)}_${bench.lon.toFixed(6)}`;
          if (!coordGroups[coordKey]) {
            coordGroups[coordKey] = [];
          }
          coordGroups[coordKey].push({
            id: doc.id,
            ...bench
          });
        }
      });
      
      // Identifier les doublons
      let duplicatesFound = 0;
      const toDelete = [];
      
      Object.values(coordGroups).forEach(group => {
        if (group.length > 1) {
          // Garder le premier élément, supprimer les autres
          for (let i = 1; i < group.length; i++) {
            toDelete.push(group[i].id);
            duplicatesFound++;
          }
        }
      });
      
      setMessage(`${duplicatesFound} doublons trouvés sur ${totalBenches} bancs. Suppression en cours...`);
      
      // Supprimer les doublons
      let deleted = 0;
      for (const id of toDelete) {
        await deleteDoc(doc(db, "benches", id));
        deleted++;
        setProgress(Math.round((deleted / duplicatesFound) * 100));
        
        if (deleted % 10 === 0) {
          setMessage(`Suppression en cours: ${deleted}/${duplicatesFound} doublons (${Math.round((deleted / duplicatesFound) * 100)}%)`);
        }
      }
      
      setMessage(`Nettoyage terminé: ${deleted} doublons supprimés sur ${totalBenches} bancs`);
      
      // Actualiser la liste
      await fetchBenches();
      
    } catch (error) {
      console.error("Erreur lors du nettoyage des doublons:", error);
      setMessage(`Erreur: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Supprimer un banc
  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce banc?")) {
      try {
        await deleteDoc(doc(db, "benches", id));
        setMessage("Banc supprimé avec succès");
        
        // Mettre à jour la liste
        setBenches(prev => prev.filter(bench => bench.id !== id));
        setBenchCount(prev => prev - 1);
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        setMessage(`Erreur lors de la suppression: ${error.message}`);
      }
    }
  };

  return (
    <div className="admin-panel">
      <h2>Panel d'administration</h2>
      
      <div className="admin-section">
        <h3>Bancs dans la base de données: {benchCount}</h3>
        
        <div className="admin-actions">
          <button 
            className="cleanup-btn"
            onClick={cleanupDuplicates}
            disabled={isImporting}
          >
            Nettoyer les doublons
          </button>
        </div>
        
        <h3>Importer des bancs depuis OpenStreetMap</h3>
        <form onSubmit={handleImport}>
          <div className="form-row">
            <div className="form-group">
              <label>Sud (latitude):</label>
              <input
                type="text"
                name="south"
                value={region.south}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Ouest (longitude):</label>
              <input
                type="text"
                name="west"
                value={region.west}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Nord (latitude):</label>
              <input
                type="text"
                name="north"
                value={region.north}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Est (longitude):</label>
              <input
                type="text"
                name="east"
                value={region.east}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="import-btn"
            disabled={isImporting}
          >
            {isImporting ? 'Importation en cours...' : 'Importer les bancs'}
          </button>
          
          {message && (
            <div className="message">
              {message}
              {isImporting && progress > 0 && (
                <div className="progress-container">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${progress}%` }}
                  ></div>
                  <div className="progress-text">{progress}%</div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="admin-section">
        <h3>Liste des bancs ({benches.length})</h3>
        <div className="benches-table-container">
          <table className="benches-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {benches.slice(0, 20).map((bench) => (
                <tr key={bench.id}>
                  <td>{bench.id.substring(0, 8)}...</td>
                  <td>{bench.lat}</td>
                  <td>{bench.lon}</td>
                  <td>{bench.source || 'inconnu'}</td>
                  <td>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(bench.id)}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {benches.length > 20 && (
            <p className="table-note">Affichage des 20 premiers bancs. {benches.length - 20} autres bancs non affichés.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;