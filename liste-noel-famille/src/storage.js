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
  log('👂', 'Configuration des listeners pour', userId);
  
  const listeners = [];
  
  try {
    // Listener USERS
    log('👂', 'Abonnement aux changements de users');
    const usersRef = ref(database, 'users');
    const usersListener = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        log('🔔', 'Mise à jour reçue pour users:', snapshot.val());
        onDataChange({ users: snapshot.val() });
        log('🔔', 'Utilisateurs mis à jour:', snapshot.val());
      }
    });
    listeners.push(() => usersListener());

    // Listener GIFTS ← AJOUT CRUCIAL ICI !
    log('👂', 'Abonnement aux changements de gifts');
    const giftsRef = ref(database, 'gifts');
    const giftsListener = onValue(giftsRef, (snapshot) => {
      if (snapshot.exists()) {
        const giftsData = snapshot.val();
        const giftsArray = Object.entries(giftsData).map(([id, gift]) => ({
          id,
          ...gift
        }));
        log('🔔', 'Mise à jour reçue pour gifts:', giftsArray.length, 'cadeaux');
        onDataChange({ gifts: giftsArray });
        log('🔔', 'Cadeaux mis à jour:', giftsArray.length);
      } else {
        log('🔔', 'Aucun cadeau dans la base');
        onDataChange({ gifts: [] });
      }
    });
    listeners.push(() => giftsListener());

    // Listener PROFILES
    log('👂', 'Abonnement aux changements de profiles');
    const profilesRef = ref(database, 'profiles');
    const profilesListener = onValue(profilesRef, (snapshot) => {
      if (snapshot.exists()) {
        log('🔔', 'profiles mis à jour:', snapshot.val());
        onDataChange({ profiles: snapshot.val() });
      } else {
        log('🔔', 'profiles supprimé ou vide');
      }
    });
    listeners.push(() => profilesListener());

    // Listener BLOCKED USERS
    log('👂', 'Abonnement aux changements de blockedUsers');
    const blockedRef = ref(database, 'blockedUsers');
    const blockedListener = onValue(blockedRef, (snapshot) => {
      if (snapshot.exists()) {
        log('🔔', 'blockedUsers mis à jour:', snapshot.val());
        onDataChange({ blockedUsers: snapshot.val() });
      } else {
        log('🔔', 'blockedUsers supprimé ou vide');
      }
    });
    listeners.push(() => blockedListener());

    // Listener LOGIN ATTEMPTS
    log('👂', 'Abonnement aux changements de loginAttempts');
    const attemptsRef = ref(database, 'loginAttempts');
    const attemptsListener = onValue(attemptsRef, (snapshot) => {
      if (snapshot.exists()) {
        log('🔔', 'loginAttempts mis à jour:', snapshot.val());
        onDataChange({ loginAttempts: snapshot.val() });
      } else {
        log('🔔', 'loginAttempts supprimé ou vide');
      }
    });
    listeners.push(() => attemptsListener());

    return () => {
      log('🔌', 'Déconnexion des listeners');
      listeners.forEach(unsubscribe => unsubscribe());
    };
  } catch (error) {
    log('❌', 'Erreur configuration listeners:', error.message);
    throw error;
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
