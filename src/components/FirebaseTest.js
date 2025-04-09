import React, { useState } from 'react';
import { db } from '../firebase';  // Importer depuis le fichier firebase.js
import { collection, addDoc, getDocs } from 'firebase/firestore';

function FirebaseTest() {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);

  const runTest = async () => {
    try {
      setStatus('testing');
      console.log("Tentative d'écriture dans Firestore...");
      
      // Test d'écriture avec gestion de timeout
      const writePromise = Promise.race([
        addDoc(collection(db, "test_collection"), {
          message: "Test de connexion",
          timestamp: new Date().toISOString()
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout d'écriture dépassé")), 10000)
        )
      ]);
      
      const docRef = await writePromise;
      console.log("Document écrit avec ID:", docRef.id);
      
      // Test de lecture
      console.log("Tentative de lecture depuis Firestore...");
      const querySnapshot = await getDocs(collection(db, "test_collection"));
      const documents = [];
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      console.log("Documents lus:", documents.length);
      
      setResult({
        success: true,
        message: "Connexion à Firebase réussie!",
        documentId: docRef.id,
        documentsCount: querySnapshot.size,
        sampleData: documents.slice(0, 3)
      });
      
      setStatus('success');
    } catch (error) {
      console.error("Erreur du test Firebase:", error);
      
      setResult({
        success: false,
        message: `Erreur: ${error.message}`,
        stack: error.stack,
        code: error.code
      });
      
      setStatus('error');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Test de connexion Firebase</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runTest}
          disabled={status === 'testing'}
          style={{
            padding: '10px 20px',
            backgroundColor: status === 'testing' ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: status === 'testing' ? 'not-allowed' : 'pointer'
          }}
        >
          {status === 'testing' ? 'Test en cours...' : 'Tester la connexion Firebase'}
        </button>
      </div>
      
      {status === 'testing' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Test en cours... (max 10 secondes)</p>
        </div>
      )}
      
      {result && (
        <div style={{ 
          border: `1px solid ${result.success ? '#4CAF50' : '#f44336'}`,
          borderRadius: '4px',
          padding: '15px',
          backgroundColor: result.success ? '#e8f5e9' : '#ffebee'
        }}>
          <h3>{result.success ? 'Succès' : 'Échec'}</h3>
          <p><strong>{result.message}</strong></p>
          
          {result.success ? (
            <>
              <p>Document créé avec l'ID: {result.documentId}</p>
              <p>Nombre de documents dans la collection: {result.documentsCount}</p>
              
              {result.sampleData && result.sampleData.length > 0 && (
                <div>
                  <h4>Échantillon de données:</h4>
                  <pre style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '10px', 
                    overflowX: 'auto' 
                  }}>
                    {JSON.stringify(result.sampleData, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <>
              {result.code && <p><strong>Code d'erreur:</strong> {result.code}</p>}
              <p><strong>Détails:</strong></p>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '10px', 
                overflowX: 'auto',
                color: '#f44336'
              }}>
                {result.stack || 'Pas de détails supplémentaires'}
              </pre>
            </>
          )}
        </div>
      )}
      
      <div style={{ marginTop: '30px' }}>
        <h3>Instructions importantes:</h3>
        <ol>
          <li>Vérifiez que vous avez créé une base de données <strong>Firestore</strong> dans votre nouveau projet Firebase</li>
          <li>Les règles Firestore doivent être configurées ainsi dans la console Firebase:
            <pre style={{ backgroundColor: '#f5f5f5', padding: '10px' }}>
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
            </pre>
          </li>
        </ol>
      </div>
    </div>
  );
}

export default FirebaseTest;