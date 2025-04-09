import { db } from "../firebase";
import { collection, addDoc, writeBatch, doc } from "firebase/firestore";

/**
 * Importe les bancs à partir d'un fichier JSON vers Firebase
 * @param {Object[]} benches - Liste des bancs à importer
 */
export async function importBenchesToFirebase(benches) {
  try {
    console.log(`Début de l'importation de ${benches.length} bancs...`);
    
    const batchSize = 500; // Firebase limite à 500 opérations par batch
    const totalBatches = Math.ceil(benches.length / batchSize);
    
    for (let i = 0; i < totalBatches; i++) {
      const batch = writeBatch(db);
      const start = i * batchSize;
      const end = Math.min(start + batchSize, benches.length);
      
      console.log(`Traitement du lot ${i+1}/${totalBatches} (${start} - ${end})`);
      
      for (let j = start; j < end; j++) {
        const bench = benches[j];
        const benchRef = doc(collection(db, "benches"));
        
        batch.set(benchRef, {
          id: bench.id || benchRef.id,
          lat: bench.lat || bench.latitude,
          lon: bench.lon || bench.longitude || bench.lng,
          tags: bench.tags || {},
          type: bench.type || "standard",
          rating: bench.rating || 0,
          ratingCount: bench.ratingCount || 0,
          lastUpdated: new Date(),
          source: "seposer.fr"
        });
      }
      
      await batch.commit();
      console.log(`Lot ${i+1} importé avec succès`);
    }
    
    console.log(`Importation terminée: ${benches.length} bancs ajoutés à Firebase`);
    return true;
  } catch (error) {
    console.error("Erreur lors de l'importation des bancs:", error);
    return false;
  }
}

/**
 * Récupère les bancs depuis OpenStreetMap et les importe dans Firebase
 */
export async function importBenchesFromOSM(south, west, north, east) {
  try {
    // Requête Overpass API
    const overpassQuery = `
      [out:json][timeout:60];
      (
        // Bancs standards
        node["amenity"="bench"](${south},${west},${north},${east});
        way["amenity"="bench"](${south},${west},${north},${east});
        
        // Bancs aux arrêts de transport
        node["public_transport"="platform"]["bench"="yes"](${south},${west},${north},${east});
        node["public_transport"="stop_position"]["bench"="yes"](${south},${west},${north},${east});
        node["highway"="bus_stop"]["bench"="yes"](${south},${west},${north},${east});
      );
      out body;
      >;
      out skel qt;
    `;
    
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
    
    console.log("Récupération des bancs depuis OpenStreetMap...");
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur de l'API Overpass: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`${data.elements.length} bancs trouvés`);
    
    // Filtrer pour ne garder que les éléments avec coordonnées valides
    const validElements = data.elements.filter(
      elem => elem.type === 'node' && typeof elem.lat === 'number' && typeof elem.lon === 'number'
    );
    
    console.log(`${validElements.length} bancs valides avec coordonnées`);
    
    // Importation dans Firebase
    return await importBenchesToFirebase(validElements);
    
  } catch (error) {
    console.error("Erreur lors de la récupération des bancs:", error);
    return false;
  }
}