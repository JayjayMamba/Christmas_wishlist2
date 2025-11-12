import { ref, set, get, onValue, push } from 'firebase/database';
import { database } from './firebase';

// ========================================
// LOGS DE DÉBOGAGE
// ========================================
const log = (emoji, message, data = null) => {
  console.log(`${emoji} ${message}`, data || '');
};

// ========================================
// LISTENERS TEMPS RÉEL
// ========================================
export const setupRealtimeListeners = (userId, onDataChange) => {
  log('🎧', 'Configuration des listeners pour:', userId);
  
  const listeners = [];
  
  try {
    // Listener utilisateurs
    const usersRef = ref(database, 'users');
    const usersListener = onValue(usersRef, (snapshot) => {
      log('📥', 'Mise à jour utilisateurs reçue');
      if (snapshot.exists()) {
        onDataChange({ users: snapshot.val() });
        log('✅', 'Utilisateurs synchronisés');
      }
    }, (error) => {
      log('❌', 'Erreur listener utilisateurs:', error.message);
    });
    listeners.push(usersListener);

    // Listener cadeaux
    const giftsRef = ref(database, 'gifts');
    const giftsListener = onValue(giftsRef, (snapshot) => {
      log('📥', 'Mise à jour cadeaux reçue');
      if (snapshot.exists()) {
        const giftsObj = snapshot.val();
        const giftsArray = Object.entries(giftsObj).map(([id, gift]) => ({
          id,
          ...gift
        }));
        onDataChange({ gifts: giftsArray });
        log('✅', 'Cadeaux synchronisés:', giftsArray.length);
      } else {
        onDataChange({ gifts: [] });
      }
    }, (error) => {
      log('❌', 'Erreur listener cadeaux:', error.message);
    });
    listeners.push(giftsListener);

    log('✅', 'Listeners configurés avec succès');

    // Fonction de nettoyage
    return () => {
      log('🔌', 'Nettoyage des listeners');
    };

  } catch (error) {
    log('❌', 'Erreur configuration listeners:', error.message);
    return () => {};
  }
};

// ========================================
// CHARGEMENT INITIAL
// ========================================
export const loadInitialData = async () => {
  log('📥', 'Chargement des données initiales...');
  
  try {
    const [usersSnapshot, giftsSnapshot] = await Promise.all([
      get(ref(database, 'users')),
      get(ref(database, 'gifts'))
    ]);

    const users = usersSnapshot.exists() ? usersSnapshot.val() : {};
    const giftsObj = giftsSnapshot.exists() ? giftsSnapshot.val() : {};
    const gifts = Object.entries(giftsObj).map(([id, gift]) => ({
      id,
      ...gift
    }));

    log('✅', 'Données chargées:', { 
      utilisateurs: Object.keys(users).length,
      cadeaux: gifts.length 
    });

    return { users, gifts };
  } catch (error) {
    log('❌', 'Erreur chargement:', error.message);
    throw error;
  }
};

// ========================================
// SAUVEGARDE DONNÉES
// ========================================
export const saveUsers = async (users) => {
  log('💾', 'Sauvegarde utilisateurs...');
  try {
    await set(ref(database, 'users'), users);
    log('✅', 'Utilisateurs sauvegardés');
    return true;
  } catch (error) {
    log('❌', 'Erreur sauvegarde utilisateurs:', error.message);
    throw error;
  }
};

export const saveGifts = async (gifts) => {
  log('💾', 'Sauvegarde cadeaux...');
  try {
    const giftsObj = {};
    gifts.forEach(gift => {
      const { id, ...giftData } = gift;
      giftsObj[id] = giftData;
    });
    await set(ref(database, 'gifts'), giftsObj);
    log('✅', 'Cadeaux sauvegardés:', gifts.length);
    return true;
  } catch (error) {
    log('❌', 'Erreur sauvegarde cadeaux:', error.message);
    throw error;
  }
};

export const addGift = async (gift) => {
  log('➕', 'Ajout cadeau:', gift.name);
  try {
    const giftsRef = ref(database, 'gifts');
    const newGiftRef = push(giftsRef);
    await set(newGiftRef, gift);
    log('✅', 'Cadeau ajouté avec ID:', newGiftRef.key);
    return newGiftRef.key;
  } catch (error) {
    log('❌', 'Erreur ajout cadeau:', error.message);
    throw error;
  }
};

// ========================================
// FONCTIONS UTILITAIRES
// ========================================
export const updateGift = async (giftId, updatedGift) => {
  log('🔄', 'Mise à jour cadeau:', giftId);
  try {
    const { id, ...giftData } = updatedGift;
    await set(ref(database, `gifts/${giftId}`), giftData);
    log('✅', 'Cadeau mis à jour');
    return true;
  } catch (error) {
    log('❌', 'Erreur mise à jour cadeau:', error.message);
    throw error;
  }
};

export const deleteGift = async (giftId) => {
  log('🗑️', 'Suppression cadeau:', giftId);
  try {
    await set(ref(database, `gifts/${giftId}`), null);
    log('✅', 'Cadeau supprimé');
    return true;
  } catch (error) {
    log('❌', 'Erreur suppression cadeau:', error.message);
    throw error;
  }
};
