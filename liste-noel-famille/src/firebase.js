import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, off, remove } from 'firebase/database';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBkcZI7mUQQtVApobD-MouSZkiQMsfo5Yw",
  authDomain: "liste-noel-famille.firebaseapp.com",
  databaseURL: "https://liste-noel-famille-default-rtdb.europe-west1.firebasedatabase.app", // ⚠️ AJOUTEZ CETTE LIGNE
  projectId: "liste-noel-famille",
  storageBucket: "liste-noel-famille.firebasestorage.app",
  messagingSenderId: "967237704243",
  appId: "1:967237704243:web:c0a6f42f525f276ec56146"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

console.log("🔥 Firebase initialisé avec succès");
console.log("📡 Database URL:", database._repoInternal.repoInfo_.host);

// Classe de gestion du stockage
class FirebaseStorage {
  constructor() {
    this.listeners = new Map();
  }

  // Sauvegarder des données
  async save(key, data) {
    try {
      console.log(`💾 Sauvegarde de ${key}:`, data);
      await set(ref(database, key), data);
      console.log(`✅ ${key} sauvegardé avec succès`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur sauvegarde ${key}:`, error);
      throw error;
    }
  }

  // Charger des données
  async load(key) {
    try {
      console.log(`📥 Chargement de ${key}...`);
      const snapshot = await get(ref(database, key));
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log(`✅ ${key} chargé:`, data);
        return data;
      } else {
        console.log(`⚠️ ${key} n'existe pas encore`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Erreur chargement ${key}:`, error);
      throw error;
    }
  }

  // Supprimer des données
  async delete(key) {
    try {
      console.log(`🗑️ Suppression de ${key}...`);
      await remove(ref(database, key));
      console.log(`✅ ${key} supprimé avec succès`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur suppression ${key}:`, error);
      throw error;
    }
  }

  // Écouter les changements en temps réel
  subscribe(key, callback) {
    console.log(`👂 Abonnement aux changements de ${key}`);
    const dbRef = ref(database, key);
    
    const unsubscribe = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log(`🔔 Mise à jour reçue pour ${key}:`, data);
        callback(data);
      } else {
        console.log(`🔔 ${key} supprimé ou vide`);
        callback(null);
      }
    }, (error) => {
      console.error(`❌ Erreur d'écoute ${key}:`, error);
    });

    this.listeners.set(key, unsubscribe);
    return unsubscribe;
  }

  // Se désabonner
  unsubscribe(key) {
    if (this.listeners.has(key)) {
      const unsubscribe = this.listeners.get(key);
      unsubscribe();
      this.listeners.delete(key);
      console.log(`🔇 Désabonnement de ${key}`);
    }
  }

  // Se désabonner de tout
  unsubscribeAll() {
    console.log(`🔇 Désabonnement de tous les listeners`);
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
  }

  // Exporter toutes les données
  async exportAll() {
    try {
      console.log("📦 Export de toutes les données...");
      const snapshot = await get(ref(database, '/'));
      if (snapshot.exists()) {
        const allData = snapshot.val();
        console.log("✅ Export réussi:", allData);
        return allData;
      }
      return {};
    } catch (error) {
      console.error("❌ Erreur export:", error);
      throw error;
    }
  }

  // Importer toutes les données
  async importAll(data) {
    try {
      console.log("📥 Import de toutes les données...", data);
      await set(ref(database, '/'), data);
      console.log("✅ Import réussi");
      return true;
    } catch (error) {
      console.error("❌ Erreur import:", error);
      throw error;
    }
  }

  // Réinitialiser toutes les données
  async reset() {
    try {
      console.log("🗑️ Réinitialisation de toutes les données...");
      await remove(ref(database, '/'));
      console.log("✅ Réinitialisation réussie");
      return true;
    } catch (error) {
      console.error("❌ Erreur réinitialisation:", error);
      throw error;
    }
  }
}

// Instance unique
export const storage = new FirebaseStorage();

// Export de la database pour usage avancé
export { database };
