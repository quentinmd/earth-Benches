import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, limit } from 'firebase/firestore';

function FirebaseDiagnostic() {
  const [status, setStatus] = useState('idle');
  const [stats, setStats] = useState(null);
  const [sampleData, setSampleData] = useState([]);
  const [error, setError] = useState(null);

  const runDiagnostic = async () => {
    try {
      setStatus('running');
      setError(null);
      
      console.log("Diagnostic Firebase en cours...");
      
      // 1. Récupérer un échantillon de données
      const benchesRef = collection(db, "benches");
      const querySnapshot = await getDocs(benchesRef);
      
      if (querySnapshot.empty) {
        throw new Error("Aucun banc trouvé dans la base de données");
      }
      
      // 2. Collecter des statistiques sur les données
      const totalBenches = querySnapshot.size;
      let validCoordinates = 0;
      let invalidCoordinates = 0;
      let withTags = 0;
      let withOsmId = 0;
      const formatIssues = [];
      const sampleBenches = [];
      
      // Analyser chaque document
      querySnapshot.forEach(doc => {
        const bench = doc.data();
        const benchWithId = { id: doc.id, ...bench };
        
        if (sampleBenches.length < 10) {
          sampleBenches.push(benchWithId);
        }
        
        // Vérifier les coordonnées
        if (typeof bench.lat === 'number' && typeof bench.lon === 'number') {
          validCoordinates++;
        } else {
          invalidCoordinates++;
          formatIssues.push(`Banc ${doc.id} a des coordonnées invalides: lat=${bench.lat}, lon=${bench.lon}`);
        }
        
        // Vérifier les tags
        if (bench.tags && typeof bench.tags === 'object') {
          withTags++;
        }
        
        // Vérifier l'ID OSM
        if (bench.osmId) {
          withOsmId++;
        }
      });
      
      // 3. Définir les statistiques
      setStats({
        totalBenches,
        validCoordinates,
        invalidCoordinates,
        withTags,
        withOsmId,
        formatIssues
      });
      
      // 4. Conserver l'échantillon
      setSampleData(sampleBenches);
      
      setStatus('success');
    } catch (err) {
      console.error("Erreur lors du diagnostic:", err);
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Diagnostic des données Firebase</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runDiagnostic}
          disabled={status === 'running'}
          style={{
            padding: '10px 20px',
            backgroundColor: status === 'running' ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: status === 'running' ? 'not-allowed' : 'pointer'
          }}
        >
          {status === 'running' ? 'Diagnostic en cours...' : 'Lancer le diagnostic'}
        </button>
      </div>
      
      {status === 'running' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Analyse des données en cours...</p>
        </div>
      )}
      
      {error && (
        <div style={{ 
          border: '1px solid #f44336',
          borderRadius: '4px',
          padding: '15px',
          backgroundColor: '#ffebee',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#d32f2f' }}>Erreur</h3>
          <p>{error}</p>
        </div>
      )}
      
      {stats && (
        <div style={{ 
          border: '1px solid #4CAF50',
          borderRadius: '4px',
          padding: '15px',
          backgroundColor: '#e8f5e9'
        }}>
          <h3>Résultats du diagnostic</h3>
          
          <div style={{ marginTop: '15px' }}>
            <h4>Statistiques de la base de données</h4>
            <ul>
              <li>Nombre total de bancs: <strong>{stats.totalBenches}</strong></li>
              <li>Bancs avec coordonnées valides: <strong>{stats.validCoordinates}</strong></li>
              <li>Bancs avec coordonnées invalides: <strong style={{ color: stats.invalidCoordinates > 0 ? '#f44336' : 'inherit' }}>{stats.invalidCoordinates}</strong></li>
              <li>Bancs avec tags: <strong>{stats.withTags}</strong></li>
              <li>Bancs avec ID OSM: <strong>{stats.withOsmId}</strong></li>
            </ul>
          </div>
          
          {stats.formatIssues.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <h4>Problèmes détectés</h4>
              <ul style={{ color: '#f44336' }}>
                {stats.formatIssues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {sampleData.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Échantillon de données</h3>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '10px', 
            overflowX: 'auto',
            fontSize: '12px' 
          }}>
            {JSON.stringify(sampleData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default FirebaseDiagnostic;