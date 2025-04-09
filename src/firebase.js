import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Nouvelle configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD1TkzyDbXj9cHvEI95J81NNDXjHmac860",
  authDomain: "map-banc.firebaseapp.com",
  projectId: "map-banc",
  storageBucket: "map-banc.appspot.com",
  messagingSenderId: "907928309587",
  appId: "1:907928309587:web:f0bb98012127e1a98f9ba6"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser les services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };