import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, off } from 'firebase/database';

// Configuration Firebase avec vos clés
const firebaseConfig = {
  apiKey: "AIzaSyBkcZI7mUQQtVApobD-MouSZkiQMsfo5Yw",
  authDomain: "liste-noel-famille.firebaseapp.com",
  databaseURL: "https://liste-noel-famille-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "liste-noel-famille",
  storageBucket: "liste-noel-famille.firebasestorage.app",
  messagingSenderId: "967237704243",
  appId: "1:967237704243:web:c0a6f42f525f276ec56146"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Classe de gestion du stockage Firebase
class FirebaseStorage {
  constructor() {
    this.database = database;
    this.listeners = new Map();
    this.isOnline = true;
  }

  // Récupérer les données
  async get(key) {
    try {
      const dataRef = ref(this.database, key);
      const snapshot = await get(dataRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Sauvegarder en local comme backup
        this.setLocal(key, JSON.stringify(data));
        return { value: JSON.stringify(data) };
      }
      
      // Si pas de données sur Firebase, essayer le local
      return this.getLocal(key);
    } catch (error) {
      console.error('❌ Erreur Firebase get:', error);
      // Fallback sur localStorage
      return this.getLocal(key);
    }
  }

  // Sauvegarder les données
  async set(key, value) {
    try {
      const dataRef = ref(this.database, key);
      const data = JSON.parse(value);
      
      // Sauvegarder sur Firebase
      await set(dataRef, data);
      
      // Sauvegarder en local comme backup
      this.setLocal(key, value);
      
      this.isOnline = true;
      return true;
    } catch (error) {
      console.error('❌ Erreur Firebase set:', error);
      this.isOnline = false;
      
      // En cas d'erreur, sauvegarder quand même en local
      this.setLocal(key, value);
      return false;
    }
  }

  // Écouter les changements en temps réel
  listen(key, callback) {
    try {
      const dataRef = ref(this.database, key);
      
      const listener = onValue(dataRef, 
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const jsonData = JSON.stringify(data);
            
            // Sauvegarder en local
            this.setLocal(key, jsonData);
            
            // Appeler le callback
            callback({ value: jsonData });
            
            this.isOnline = true;
          }
        },
        (error) => {
          console.error('❌ Erreur listener Firebase:', error);
          this.isOnline = false;
        }
      );

      // Stocker le listener pour pouvoir le nettoyer plus tard
      this.listeners.set(key, { ref: dataRef, listener });
      
      return () => this.unlisten(key);
    } catch (error) {
      console.error('❌ Erreur création listener:', error);
      return () => {};
    }
  }

  // Arrêter d'écouter
  unlisten(key) {
    const listenerData = this.listeners.get(key);
    if (listenerData) {
      off(listenerData.ref);
      this.listeners.delete(key);
    }
  }

  // Nettoyer tous les listeners
  cleanup() {
    this.listeners.forEach((listenerData, key) => {
      off(listenerData.ref);
    });
    this.listeners.clear();
  }

  // LocalStorage fallback
  getLocal(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? { value } : null;
    } catch (error) {
      console.error('❌ Erreur localStorage get:', error);
      return null;
    }
  }

  setLocal(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('❌ Erreur localStorage set:', error);
    }
  }

  // Vérifier la connexion
  async checkConnection() {
    try {
      const connectedRef = ref(this.database, '.info/connected');
      const snapshot = await get(connectedRef);
      this.isOnline = snapshot.val() === true;
      return this.isOnline;
    } catch (error) {
      this.isOnline = false;
      return false;
    }
  }

  // Obtenir le statut de connexion
  getConnectionStatus() {
    return this.isOnline;
  }
}

// Créer et exporter l'instance unique
export const storage = new FirebaseStorage();
export { database };

// Log de confirmation
console.log('✅ Firebase initialisé avec succès');
