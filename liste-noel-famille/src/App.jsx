import React, { useState, useEffect } from 'react';
import { Gift, User, Users, LogOut, Plus, Trash2, Edit2, Check, Lock, Unlock, Download, Upload, BarChart3, UserPlus, Shield, Wifi, WifiOff, X, AlertCircle } from 'lucide-react';
import { storage } from './firebase';

// ===== CONSTANTES =====
const INITIAL_USERS = {
  'Papa': '1234',
  'Maman': '5678',
  'Enfant1': '1111',
  'Enfant2': '2222'
};

const ADMIN_USERNAME = 'AdminJay';
const ADMIN_PASSWORD = '486GP9kw3x2RE5Sr8vXkCm3Nu';

// ===== COMPOSANT: INDICATEUR DE CONNEXION =====
const ConnectionIndicator = ({ isOnline, lastSync }) => {
  return (
    <div className="flex items-center gap-2">
      {isOnline ? (
        <>
          <Wifi className="w-5 h-5 text-green-500" />
          <span className="text-sm text-green-600 hidden md:inline">En ligne</span>
        </>
      ) : (
        <>
          <WifiOff className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-600 hidden md:inline">Hors ligne</span>
        </>
      )}
      {lastSync && (
        <span className="text-xs text-gray-500 hidden lg:inline">
          {new Date(lastSync).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

// ===== COMPOSANT PRINCIPAL =====
function App() {
  // États principaux
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [profiles, setProfiles] = useState({});
  const [selectedUser, setSelectedUser] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [loginAttempts, setLoginAttempts] = useState({});
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loginStats, setLoginStats] = useState({});
  
  // États UI
  const [view, setView] = useState('login');
  const [isEditing, setIsEditing] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const [newGift, setNewGift] = useState({ name: '', price: '', description: '', image: '' });
  const [deleteError, setDeleteError] = useState(null);
  
  // États Admin
  const [adminView, setAdminView] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [importDataText, setImportDataText] = useState('');
  
  // États Enfants
  const [showChildForm, setShowChildForm] = useState(false);
  const [newChild, setNewChild] = useState({ name: '', age: '', interests: '' });
  const [selectedChild, setSelectedChild] = useState(null);
  const [newChildGift, setNewChildGift] = useState({ name: '', price: '', description: '', image: '' });
  
  // États Firebase
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);

  // ===== EFFET: CHARGEMENT ET SYNCHRONISATION =====
  useEffect(() => {
    loadData();
    
    // Écouter les changements en temps réel
    const unsubscribe = storage.listen('christmas-app-data', (result) => {
      if (result && result.value) {
        try {
          const data = JSON.parse(result.value);
          
          // Ne pas mettre à jour si on est en train d'éditer
          if (!isEditing && !editingGift) {
            setUsers(data.users || INITIAL_USERS);
            setProfiles(data.profiles || {});
            setLoginAttempts(data.loginAttempts || {});
            setBlockedUsers(data.blockedUsers || []);
            setLoginStats(data.loginStats || {});
            setLastSync(new Date());
            setSyncError(null);
          }
        } catch (error) {
          console.error('Erreur parsing data:', error);
          setSyncError('Erreur de synchronisation');
        }
      }
    });

    // Vérifier la connexion périodiquement
    const checkConnection = async () => {
      const connected = await storage.checkConnection();
      setIsOnline(connected);
    };
    
    checkConnection();
    const connectionInterval = setInterval(checkConnection, 15000);

    // Nettoyage
    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(connectionInterval);
    };
  }, []);

  // ===== EFFET: SAUVEGARDE AUTOMATIQUE =====
  useEffect(() => {
    if (!currentUser && adminView !== 'panel') return;

    const timeoutId = setTimeout(() => {
      saveData();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [users, profiles, loginAttempts, blockedUsers, loginStats]);

  // ===== FONCTIONS DE DONNÉES =====
  const loadData = async () => {
    try {
      const result = await storage.get('christmas-app-data');
      if (result && result.value) {
        const data = JSON.parse(result.value);
        setUsers(data.users || INITIAL_USERS);
        setProfiles(data.profiles || {});
        setLoginAttempts(data.loginAttempts || {});
        setBlockedUsers(data.blockedUsers || []);
        setLoginStats(data.loginStats || {});
        setLastSync(new Date());
        console.log('✅ Données chargées depuis Firebase');
      } else {
        console.log('📝 Initialisation des données');
        setUsers(INITIAL_USERS);
        await saveData();
      }
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      setSyncError('Impossible de charger les données');
    }
  };

  const saveData = async () => {
    try {
      const data = {
        users,
        profiles,
        loginAttempts,
        blockedUsers,
        loginStats,
        lastUpdate: new Date().toISOString()
      };
      
      const success = await storage.set('christmas-app-data', JSON.stringify(data));
      
      if (success) {
        setLastSync(new Date());
        setSyncError(null);
        console.log('✅ Données sauvegardées sur Firebase');
      } else {
        setSyncError('Sauvegarde locale uniquement');
        console.warn('⚠️ Sauvegarde locale uniquement (hors ligne)');
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      setSyncError('Erreur de sauvegarde');
    }
  };

  // ===== FONCTIONS DE CONNEXION =====
  const handleLogin = () => {
    if (!selectedUser) {
      alert('⚠️ Veuillez sélectionner votre prénom');
      return;
    }

    if (blockedUsers.includes(selectedUser)) {
      alert('🔒 Votre compte est bloqué. Contactez l\'administrateur.');
      return;
    }

    const correctPin = users[selectedUser];
    
    if (pinCode === correctPin) {
      setCurrentUser(selectedUser);
      setView('profile');
      setPinCode('');
      setLoginAttempts(prev => ({ ...prev, [selectedUser]: 0 }));
      
      setLoginStats(prev => ({
        ...prev,
        [selectedUser]: (prev[selectedUser] || 0) + 1
      }));
    } else {
      const attempts = (loginAttempts[selectedUser] || 0) + 1;
      setLoginAttempts(prev => ({ ...prev, [selectedUser]: attempts }));
      
      if (attempts >= 3) {
        setBlockedUsers(prev => [...prev, selectedUser]);
        alert('🔒 Compte bloqué après 3 tentatives incorrectes !');
        setPinCode('');
        setSelectedUser('');
      } else {
        alert(`❌ Code incorrect ! Tentative ${attempts}/3`);
        setPinCode('');
      }
    }
  };

  const handleAdminLogin = () => {
    if (adminUsername === ADMIN_USERNAME && adminPassword === ADMIN_PASSWORD) {
      setAdminView('panel');
      setAdminUsername('');
      setAdminPassword('');
    } else {
      alert('❌ Identifiants administrateur incorrects');
      setAdminPassword('');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('login');
    setSelectedUser('');
    setPinCode('');
    setIsEditing(false);
    setEditingGift(null);
    setNewGift({ name: '', price: '', description: '', image: '' });
    setSelectedChild(null);
  };

  // ===== FONCTIONS PROFIL =====
  const getProfile = (username) => {
    if (!profiles[username]) {
      return {
        color: '',
        size: '',
        hobby: '',
        interests: '',
        wishlist: [],
        children: []
      };
    }
    return profiles[username];
  };

  const updateProfile = (field, value) => {
    setProfiles(prev => ({
      ...prev,
      [currentUser]: {
        ...getProfile(currentUser),
        [field]: value
      }
    }));
  };

  // ===== FONCTIONS CADEAUX =====
  const addGift = () => {
    if (!newGift.name.trim()) {
      alert('⚠️ Le nom du cadeau est obligatoire');
      return;
    }

    const gift = {
      id: Date.now().toString(),
      ...newGift,
      reservations: []
    };

    setProfiles(prev => ({
      ...prev,
      [currentUser]: {
        ...getProfile(currentUser),
        wishlist: [...(getProfile(currentUser).wishlist || []), gift]
      }
    }));

    setNewGift({ name: '', price: '', description: '', image: '' });
  };

  const updateGift = () => {
    if (!editingGift.name.trim()) {
      alert('⚠️ Le nom du cadeau est obligatoire');
      return;
    }

    const currentProfile = getProfile(currentUser);
    const gift = currentProfile.wishlist.find(g => g.id === editingGift.id);
    
    if (gift && gift.reservations && gift.reservations.length > 0) {
      alert('❌ Impossible de modifier un cadeau déjà réservé');
      return;
    }

    setProfiles(prev => ({
      ...prev,
      [currentUser]: {
        ...prev[currentUser],
        wishlist: prev[currentUser].wishlist.map(g =>
          g.id === editingGift.id ? editingGift : g
        )
      }
    }));

    setEditingGift(null);
  };

  const deleteGift = (giftId) => {
    const profile = getProfile(currentUser);
    const gift = profile.wishlist.find(g => g.id === giftId);
    
    if (gift && gift.reservations && gift.reservations.length > 0) {
      setDeleteError(giftId);
      setTimeout(() => setDeleteError(null), 5000);
      return;
    }

    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce cadeau ?')) {
      setProfiles(prev => ({
        ...prev,
        [currentUser]: {
          ...prev[currentUser],
          wishlist: prev[currentUser].wishlist.filter(g => g.id !== giftId)
        }
      }));
    }
  };

  const toggleReservation = (targetUser, giftId) => {
    setProfiles(prev => {
      const targetProfile = prev[targetUser] || getProfile(targetUser);
      const gift = targetProfile.wishlist.find(g => g.id === giftId);
      
      if (!gift) return prev;

      const reservations = gift.reservations || [];
      const hasReserved = reservations.some(r => r.user === currentUser);

      let newReservations;
      if (hasReserved) {
        newReservations = reservations.filter(r => r.user !== currentUser);
      } else {
        newReservations = [...reservations, { user: currentUser, date: new Date().toISOString() }];
      }

      return {
        ...prev,
        [targetUser]: {
          ...targetProfile,
          wishlist: targetProfile.wishlist.map(g =>
            g.id === giftId ? { ...g, reservations: newReservations } : g
          )
        }
      };
    });
  };
  // ===== FONCTIONS ENFANTS =====
  const addChild = () => {
    if (!newChild.name.trim()) {
      alert('⚠️ Le prénom de l\'enfant est obligatoire');
      return;
    }

    const child = {
      id: Date.now().toString(),
      ...newChild,
      wishlist: []
    };

    setProfiles(prev => ({
      ...prev,
      [currentUser]: {
        ...getProfile(currentUser),
        children: [...(getProfile(currentUser).children || []), child]
      }
    }));

    setNewChild({ name: '', age: '', interests: '' });
    setShowChildForm(false);
  };

  const deleteChild = (childId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet enfant et tous ses cadeaux ?')) {
      setProfiles(prev => ({
        ...prev,
        [currentUser]: {
          ...prev[currentUser],
          children: prev[currentUser].children.filter(c => c.id !== childId)
        }
      }));
      if (selectedChild && selectedChild.id === childId) {
        setSelectedChild(null);
      }
    }
  };

  const addChildGift = (childId) => {
    if (!newChildGift.name.trim()) {
      alert('⚠️ Le nom du cadeau est obligatoire');
      return;
    }

    const gift = {
      id: Date.now().toString(),
      ...newChildGift,
      reservations: []
    };

    setProfiles(prev => ({
      ...prev,
      [currentUser]: {
        ...prev[currentUser],
        children: prev[currentUser].children.map(c =>
          c.id === childId
            ? { ...c, wishlist: [...(c.wishlist || []), gift] }
            : c
        )
      }
    }));

    setNewChildGift({ name: '', price: '', description: '', image: '' });
  };

  const deleteChildGift = (childId, giftId) => {
    const profile = getProfile(currentUser);
    const child = profile.children.find(c => c.id === childId);
    const gift = child.wishlist.find(g => g.id === giftId);
    
    if (gift && gift.reservations && gift.reservations.length > 0) {
      setDeleteError(`child-${giftId}`);
      setTimeout(() => setDeleteError(null), 5000);
      return;
    }

    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce cadeau ?')) {
      setProfiles(prev => ({
        ...prev,
        [currentUser]: {
          ...prev[currentUser],
          children: prev[currentUser].children.map(c =>
            c.id === childId
              ? { ...c, wishlist: c.wishlist.filter(g => g.id !== giftId) }
              : c
          )
        }
      }));
    }
  };

  const toggleChildReservation = (parentUser, childId, giftId) => {
    setProfiles(prev => {
      const parentProfile = prev[parentUser] || getProfile(parentUser);
      const child = parentProfile.children.find(c => c.id === childId);
      
      if (!child) return prev;

      const gift = child.wishlist.find(g => g.id === giftId);
      if (!gift) return prev;

      const reservations = gift.reservations || [];
      const hasReserved = reservations.some(r => r.user === currentUser);

      let newReservations;
      if (hasReserved) {
        newReservations = reservations.filter(r => r.user !== currentUser);
      } else {
        newReservations = [...reservations, { user: currentUser, date: new Date().toISOString() }];
      }

      return {
        ...prev,
        [parentUser]: {
          ...parentProfile,
          children: parentProfile.children.map(c =>
            c.id === childId
              ? {
                  ...c,
                  wishlist: c.wishlist.map(g =>
                    g.id === giftId ? { ...g, reservations: newReservations } : g
                  )
                }
              : c
          )
        }
      };
    });
  };

  // ===== FONCTIONS ADMIN =====
  const addUser = () => {
    if (!newUsername.trim()) {
      alert('⚠️ Le prénom est obligatoire');
      return;
    }

    if (users[newUsername]) {
      alert('❌ Cet utilisateur existe déjà');
      return;
    }

    let pin = newUserPin;
    if (!pin || pin.length !== 4) {
      pin = Math.floor(1000 + Math.random() * 9000).toString();
      alert(`✅ Code généré automatiquement : ${pin}`);
    }

    setUsers(prev => ({
      ...prev,
      [newUsername]: pin
    }));

    setNewUsername('');
    setNewUserPin('');
  };

  const deleteUser = () => {
    if (!deleteConfirm || deleteConfirm === 'IMPORT') return;

    const username = deleteConfirm;

    // Supprimer l'utilisateur
    const newUsers = { ...users };
    delete newUsers[username];
    setUsers(newUsers);

    // Supprimer son profil
    const newProfiles = { ...profiles };
    delete newProfiles[username];
    setProfiles(newProfiles);

    // Supprimer ses réservations chez les autres
    Object.keys(newProfiles).forEach(user => {
      if (newProfiles[user].wishlist) {
        newProfiles[user].wishlist = newProfiles[user].wishlist.map(gift => ({
          ...gift,
          reservations: (gift.reservations || []).filter(r => r.user !== username)
        }));
      }
      if (newProfiles[user].children) {
        newProfiles[user].children = newProfiles[user].children.map(child => ({
          ...child,
          wishlist: (child.wishlist || []).map(gift => ({
            ...gift,
            reservations: (gift.reservations || []).filter(r => r.user !== username)
          }))
        }));
      }
    });
    setProfiles(newProfiles);

    // Nettoyer les autres données
    const newLoginAttempts = { ...loginAttempts };
    delete newLoginAttempts[username];
    setLoginAttempts(newLoginAttempts);

    setBlockedUsers(prev => prev.filter(u => u !== username));

    const newLoginStats = { ...loginStats };
    delete newLoginStats[username];
    setLoginStats(newLoginStats);

    setDeleteConfirm(null);
    alert(`✅ ${username} a été supprimé avec succès`);
  };

  const unblockUser = (username) => {
    setBlockedUsers(prev => prev.filter(u => u !== username));
    setLoginAttempts(prev => ({ ...prev, [username]: 0 }));
    alert(`✅ ${username} a été débloqué`);
  };

  const exportData = () => {
    const data = {
      users,
      profiles,
      loginAttempts,
      blockedUsers,
      loginStats,
      exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `liste-noel-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    alert('✅ Export téléchargé avec succès !');
  };

  const importDataFunc = () => {
    try {
      const data = JSON.parse(importDataText);

      if (!data.users || !data.profiles) {
        alert('❌ Format de fichier invalide');
        return;
      }

      setUsers(data.users || INITIAL_USERS);
      setProfiles(data.profiles || {});
      setLoginAttempts(data.loginAttempts || {});
      setBlockedUsers(data.blockedUsers || []);
      setLoginStats(data.loginStats || {});

      setImportDataText('');
      setDeleteConfirm(null);

      alert('✅ Import réussi ! Toutes les données ont été restaurées.');
      
      // Forcer la sauvegarde
      setTimeout(() => saveData(), 500);
    } catch (error) {
      console.error('Erreur import:', error);
      alert('❌ Erreur lors de l\'import. Vérifiez le format du fichier.');
    }
  };

  const calculateStats = () => {
    const totalUsers = Object.keys(users).length;
    let totalGifts = 0;
    let totalReservations = 0;
    const totalLogins = Object.values(loginStats).reduce((sum, count) => sum + count, 0);

    Object.values(profiles).forEach(profile => {
      totalGifts += (profile.wishlist || []).length;
      (profile.wishlist || []).forEach(gift => {
        totalReservations += (gift.reservations || []).length;
      });

      (profile.children || []).forEach(child => {
        totalGifts += (child.wishlist || []).length;
        (child.wishlist || []).forEach(gift => {
          totalReservations += (gift.reservations || []).length;
        });
      });
    });

    return { totalUsers, totalGifts, totalReservations, totalLogins };
  };
  // ===== RENDU: PAGE DE CONNEXION =====
  if (!currentUser && adminView !== 'panel' && adminView !== 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎄</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Liste de Noël</h1>
            <p className="text-gray-600">Connectez-vous pour voir votre liste</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionnez votre prénom
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">-- Choisir --</option>
                  {Object.keys(users).map(username => (
                    <option key={username} value={username}>
                      {username} {blockedUsers.includes(username) ? '🔒' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code à 4 chiffres
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength="4"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="••••"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center text-2xl tracking-widest"
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={!selectedUser || pinCode.length !== 4}
                className="w-full bg-gradient-to-r from-red-600 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-red-700 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Se connecter
              </button>
            </div>
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => setAdminView('login')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mx-auto"
            >
              <Lock className="w-4 h-4" />
              <span className="text-sm">Accès administrateur</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== RENDU: PAGE ADMIN LOGIN =====
  if (adminView === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🔐 Administration</h1>
            <p className="text-gray-600">Accès réservé à l'administrateur</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom d'utilisateur
                </label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="AdminJay"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleAdminLogin}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Se connecter
              </button>
            </div>
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => setAdminView('')}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              ← Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== RENDU: PANEL ADMIN =====
  if (adminView === 'panel') {
    const stats = calculateStats();

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50">
        <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">🔐 Panel Administrateur</h1>
                  <p className="text-sm text-blue-100">Gestion complète de l'application</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <ConnectionIndicator isOnline={isOnline} lastSync={lastSync} />
                <button
                  onClick={() => {
                    setAdminView('');
                    setView('login');
                  }}
                  className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Statistiques */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">Statistiques Globales</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-200">
                <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
                <div className="text-sm text-blue-700 font-medium">Utilisateurs</div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200">
                <div className="text-3xl font-bold text-green-600">{stats.totalGifts}</div>
                <div className="text-sm text-green-700 font-medium">Cadeaux au total</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-2 border-purple-200">
                <div className="text-3xl font-bold text-purple-600">{stats.totalReservations}</div>
                <div className="text-sm text-purple-700 font-medium">Réservations</div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border-2 border-orange-200">
                <div className="text-3xl font-bold text-orange-600">{stats.totalLogins}</div>
                <div className="text-sm text-orange-700 font-medium">Connexions totales</div>
              </div>
            </div>
          </div>

          {/* Gestion des utilisateurs */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">Gestion des Utilisateurs</h2>
            </div>

            {/* Ajouter un utilisateur */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Ajouter un utilisateur
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Prénom"
                  className="px-4 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength="4"
                  value={newUserPin}
                  onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Code (optionnel, auto si vide)"
                  className="px-4 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={addUser}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Ajouter
                </button>
              </div>
            </div>

            {/* Liste des utilisateurs */}
            <div className="space-y-3">
              {Object.entries(users).map(([username, pin]) => {
                const isBlocked = blockedUsers.includes(username);
                const attempts = loginAttempts[username] || 0;
                const logins = loginStats[username] || 0;

                return (
                  <div
                    key={username}
                    className={`border-2 rounded-lg p-4 ${
                      isBlocked ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-blue-300'
                    } transition-colors`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-100 p-3 rounded-full">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            {username}
                            {isBlocked && <span className="text-red-600">🔒 Bloqué</span>}
                          </div>
                          <div className="text-sm text-gray-600">
                            Code: {pin} • Tentatives: {attempts}/3 • Connexions: {logins}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {isBlocked && (
                          <button
                            onClick={() => unblockUser(username)}
                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Unlock className="w-4 h-4" />
                            Débloquer
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(username)}
                          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Export / Import */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Download className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">Export / Import des Données</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Export</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Télécharger une sauvegarde complète de toutes les données
                </p>
                <button
                  onClick={exportData}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Télécharger l'export
                </button>
              </div>

              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                <h3 className="font-semibold text-orange-800 mb-2">Import</h3>
                <p className="text-sm text-orange-700 mb-3">
                  ⚠️ ATTENTION : L'import va écraser toutes les données existantes !
                </p>
                <textarea
                  value={importDataText}
                  onChange={(e) => setImportDataText(e.target.value)}
                  placeholder="Collez ici le contenu du fichier d'export JSON..."
                  className="w-full px-4 py-2 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 min-h-[100px] font-mono text-sm mb-3"
                />
                <button
                  onClick={() => setDeleteConfirm('IMPORT')}
                  disabled={!importDataText.trim()}
                  className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  Importer les données
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de confirmation de suppression utilisateur */}
        {deleteConfirm && deleteConfirm !== 'IMPORT' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Confirmation de suppression</h3>
              <p className="text-gray-700 mb-6">
                Êtes-vous absolument sûr de vouloir supprimer <strong>{deleteConfirm}</strong> ?
                <br /><br />
                Cette action supprimera :
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-6 space-y-1">
                <li>Le compte utilisateur</li>
                <li>Son profil complet</li>
                <li>Sa liste de souhaits</li>
                <li>Ses enfants et leurs listes</li>
                <li>Toutes ses réservations</li>
              </ul>
              <p className="text-red-600 font-bold mb-6">
                ⚠️ Cette action est IRRÉVERSIBLE !
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteUser}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmation d'import */}
        {deleteConfirm === 'IMPORT' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-orange-600 mb-4">⚠️ Confirmation d'import</h3>
              <p className="text-gray-700 mb-6">
                L'import va <strong>écraser toutes les données existantes</strong> par celles contenues dans le fichier.
                <br /><br />
                Cela inclut :
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-6 space-y-1">
                <li>Tous les utilisateurs et leurs codes</li>
                <li>Tous les profils</li>
                <li>Toutes les listes de souhaits</li>
                <li>Tous les enfants et leurs listes</li>
                <li>Toutes les réservations</li>
              </ul>
              <p className="text-orange-600 font-bold mb-6">
                ⚠️ Il est recommandé de faire un export avant d'importer !
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={importDataFunc}
                  className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                >
                  Confirmer l'import
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  // ===== RENDU: PAGE PRINCIPALE =====
  const profile = getProfile(currentUser);
  const otherUsers = Object.keys(users).filter(u => u !== currentUser);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-green-50">
      <header className="bg-gradient-to-r from-red-600 to-green-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">🎄 Liste de Noël</h1>
                <p className="text-sm text-red-100">Connecté : {currentUser}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ConnectionIndicator isOnline={isOnline} lastSync={lastSync} />
              {syncError && (
                <div className="flex items-center gap-2 bg-yellow-500 text-white px-3 py-1 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {syncError}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setView('profile')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              view === 'profile'
                ? 'bg-gradient-to-r from-red-600 to-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <User className="w-5 h-5 inline mr-2" />
            Mon Profil
          </button>
          <button
            onClick={() => setView('others')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              view === 'others'
                ? 'bg-gradient-to-r from-red-600 to-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Listes des Autres
          </button>
        </div>

        {/* Vue Profil */}
        {view === 'profile' && (
          <div className="space-y-6">
            {/* Informations personnelles */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Mes Informations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Couleur préférée
                  </label>
                  <input
                    type="text"
                    value={profile.color || ''}
                    onChange={(e) => updateProfile('color', e.target.value)}
                    placeholder="Ex: Bleu"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taille de vêtements
                  </label>
                  <input
                    type="text"
                    value={profile.size || ''}
                    onChange={(e) => updateProfile('size', e.target.value)}
                    placeholder="Ex: M, L, XL"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passe-temps favori
                  </label>
                  <input
                    type="text"
                    value={profile.hobby || ''}
                    onChange={(e) => updateProfile('hobby', e.target.value)}
                    placeholder="Ex: Lecture, Sport"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Centres d'intérêt
                  </label>
                  <input
                    type="text"
                    value={profile.interests || ''}
                    onChange={(e) => updateProfile('interests', e.target.value)}
                    placeholder="Ex: Cuisine, Musique"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Ma Liste de Souhaits */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Ma Liste de Souhaits</h2>
              
              {/* Formulaire d'ajout/édition */}
              {!editingGift ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-green-800 mb-3">Ajouter un cadeau</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newGift.name}
                      onChange={(e) => setNewGift({ ...newGift, name: e.target.value })}
                      placeholder="Nom du cadeau *"
                      className="w-full px-4 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      value={newGift.price}
                      onChange={(e) => setNewGift({ ...newGift, price: e.target.value })}
                      placeholder="Prix approximatif (ex: 50€)"
                      className="w-full px-4 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <textarea
                      value={newGift.description}
                      onChange={(e) => setNewGift({ ...newGift, description: e.target.value })}
                      placeholder="Description (optionnel)"
                      className="w-full px-4 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 min-h-[80px]"
                    />
                    <input
                      type="url"
                      value={newGift.image}
                      onChange={(e) => setNewGift({ ...newGift, image: e.target.value })}
                      placeholder="Lien image (optionnel)"
                      className="w-full px-4 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={addGift}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Ajouter à ma liste
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-800 mb-3">Modifier le cadeau</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editingGift.name}
                      onChange={(e) => setEditingGift({ ...editingGift, name: e.target.value })}
                      placeholder="Nom du cadeau *"
                      className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={editingGift.price}
                      onChange={(e) => setEditingGift({ ...editingGift, price: e.target.value })}
                      placeholder="Prix approximatif"
                      className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      value={editingGift.description}
                      onChange={(e) => setEditingGift({ ...editingGift, description: e.target.value })}
                      placeholder="Description"
                      className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    />
                    <input
                      type="url"
                      value={editingGift.image}
                      onChange={(e) => setEditingGift({ ...editingGift, image: e.target.value })}
                      placeholder="Lien image"
                      className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingGift(null)}
                        className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={updateGift}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
                      >
                        <Check className="w-5 h-5" />
                        Enregistrer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Liste des cadeaux */}
              <div className="space-y-4">
                {profile.wishlist && profile.wishlist.length > 0 ? (
                  profile.wishlist.map(gift => (
                    <div
                      key={gift.id}
                      className={`border-2 rounded-lg p-4 transition-all ${
                        gift.reservations && gift.reservations.length > 0
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:border-red-300'
                      }`}
                    >
                      <div className="flex gap-4">
                        {gift.image && (
                          <img
                            src={gift.image}
                            alt={gift.name}
                            className="w-24 h-24 object-cover rounded-lg"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-lg text-gray-800">{gift.name}</h3>
                              {gift.price && (
                                <p className="text-sm text-gray-600 mt-1">💰 {gift.price}</p>
                              )}
                              {gift.description && (
                                <p className="text-sm text-gray-600 mt-2">{gift.description}</p>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingGift(gift)}
                                disabled={gift.reservations && gift.reservations.length > 0}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={gift.reservations && gift.reservations.length > 0 ? "Impossible de modifier un cadeau réservé" : "Modifier"}
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => deleteGift(gift.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {gift.reservations && gift.reservations.length > 0 && (
                            <div className="mt-3 bg-white border-2 border-green-200 rounded-lg p-3">
                              <p className="text-sm font-semibold text-green-700 mb-2">
                                ✅ Réservé par :
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {gift.reservations.map((reservation, index) => (
                                  <span
                                    key={index}
                                    className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
                                  >
                                    {reservation.user}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {deleteError === gift.id && (
                            <div className="mt-3 bg-red-50 border-2 border-red-200 rounded-lg p-3 flex items-start gap-2">
                              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-red-700">
                                <strong>Impossible de supprimer :</strong> Ce cadeau a déjà été réservé par quelqu'un. Demandez-lui de le dé-réserver d'abord.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Gift className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Aucun cadeau dans votre liste</p>
                    <p className="text-sm">Ajoutez vos premiers souhaits ci-dessus</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mes Enfants */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Mes Enfants</h2>
                <button
                  onClick={() => setShowChildForm(!showChildForm)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter un enfant
                </button>
              </div>

              {/* Formulaire d'ajout d'enfant */}
              {showChildForm && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-purple-800 mb-3">Nouvel enfant</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newChild.name}
                      onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                      placeholder="Prénom de l'enfant *"
                      className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      value={newChild.age}
                      onChange={(e) => setNewChild({ ...newChild, age: e.target.value })}
                      placeholder="Âge (ex: 8 ans)"
                      className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      value={newChild.interests}
                      onChange={(e) => setNewChild({ ...newChild, interests: e.target.value })}
                      placeholder="Centres d'intérêt"
                      className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowChildForm(false);
                          setNewChild({ name: '', age: '', interests: '' });
                        }}
                        className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={addChild}
                        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Liste des enfants */}
              {profile.children && profile.children.length > 0 ? (
                <div className="space-y-4">
                  {profile.children.map(child => (
                    <div key={child.id} className="border-2 border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{child.name}</h3>
                          {child.age && <p className="text-sm text-gray-600">👶 {child.age}</p>}
                          {child.interests && <p className="text-sm text-gray-600">❤️ {child.interests}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedChild(selectedChild?.id === child.id ? null : child)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                          >
                            {selectedChild?.id === child.id ? 'Fermer' : 'Gérer sa liste'}
                          </button>
                          <button
                            onClick={() => deleteChild(child.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer l'enfant"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Formulaire d'ajout de cadeau pour l'enfant */}
                      {selectedChild?.id === child.id && (
                        <div className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-800 mb-3">Ajouter un cadeau pour {child.name}</h4>
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={newChildGift.name}
                              onChange={(e) => setNewChildGift({ ...newChildGift, name: e.target.value })}
                              placeholder="Nom du cadeau *"
                              className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              value={newChildGift.price}
                              onChange={(e) => setNewChildGift({ ...newChildGift, price: e.target.value })}
                              placeholder="Prix approximatif"
                              className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <textarea
                              value={newChildGift.description}
                              onChange={(e) => setNewChildGift({ ...newChildGift, description: e.target.value })}
                              placeholder="Description"
                              className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                            />
                            <input
                              type="url"
                              value={newChildGift.image}
                              onChange={(e) => setNewChildGift({ ...newChildGift, image: e.target.value })}
                              placeholder="Lien image"
                              className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => addChildGift(child.id)}
                              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
                            >
                              <Plus className="w-5 h-5" />
                              Ajouter
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Liste des cadeaux de l'enfant */}
                      {child.wishlist && child.wishlist.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <h4 className="font-semibold text-gray-700">Liste de souhaits de {child.name} :</h4>
                          {child.wishlist.map(gift => (
                            <div
                              key={gift.id}
                              className={`border-2 rounded-lg p-3 ${
                                gift.reservations && gift.reservations.length > 0
                                  ? 'border-green-300 bg-green-50'
                                  : 'border-gray-200'
                              }`}
                            >
                              <div className="flex gap-3">
                                {gift.image && (
                                  <img
                                    src={gift.image}
                                    alt={gift.name}
                                    className="w-20 h-20 object-cover rounded-lg"
                                    onError={(e) => e.target.style.display = 'none'}
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h5 className="font-bold text-gray-800">{gift.name}</h5>
                                      {gift.price && <p className="text-sm text-gray-600">💰 {gift.price}</p>}
                                      {gift.description && <p className="text-sm text-gray-600 mt-1">{gift.description}</p>}
                                    </div>
                                    <button
                                      onClick={() => deleteChildGift(child.id, gift.id)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {gift.reservations && gift.reservations.length > 0 && (
                                    <div className="mt-2 bg-white border-2 border-green-200 rounded-lg p-2">
                                      <p className="text-xs font-semibold text-green-700 mb-1">✅ Réservé par :</p>
                                      <div className="flex flex-wrap gap-1">
                                        {gift.reservations.map((reservation, index) => (
                                          <span
                                            key={index}
                                            className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium"
                                          >
                                            {reservation.user}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {deleteError === `child-${gift.id}` && (
                                    <div className="mt-2 bg-red-50 border-2 border-red-200 rounded-lg p-2 flex items-start gap-2">
                                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                      <p className="text-xs text-red-700">
                                        Impossible de supprimer : Ce cadeau est déjà réservé.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Aucun enfant ajouté</p>
                  <p className="text-sm">Cliquez sur "Ajouter un enfant" ci-dessus</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vue Autres */}
        {view === 'others' && (
          <div className="space-y-6">
            {otherUsers.map(username => {
              const userProfile = getProfile(username);
              const totalGifts = (userProfile.wishlist || []).length;
              const totalChildrenGifts = (userProfile.children || []).reduce(
                (sum, child) => sum + (child.wishlist || []).length,
                0
              );

              return (
                <div key={username} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{username}</h2>
                      <p className="text-sm text-gray-600">
                        {totalGifts + totalChildrenGifts} cadeau(x) au total
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-red-100 to-green-100 p-3 rounded-full">
                      <User className="w-8 h-8 text-red-600" />
                    </div>
                  </div>

                  {/* Informations de l'utilisateur */}
                  {(userProfile.color || userProfile.size || userProfile.hobby || userProfile.interests) && (
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-gray-700 mb-3">Informations utiles :</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {userProfile.color && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">🎨 Couleur :</span>
                            <span className="font-medium">{userProfile.color}</span>
                          </div>
                        )}
                        {userProfile.size && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">👕 Taille :</span>
                            <span className="font-medium">{userProfile.size}</span>
                          </div>
                        )}
                        {userProfile.hobby && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">🎮 Passe-temps :</span>
                            <span className="font-medium">{userProfile.hobby}</span>
                          </div>
                        )}
                        {userProfile.interests && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">❤️ Intérêts :</span>
                            <span className="font-medium">{userProfile.interests}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Liste de souhaits personnelle */}
                  {userProfile.wishlist && userProfile.wishlist.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-700 mb-3">Sa liste de souhaits :</h3>
                      <div className="space-y-3">
                        {userProfile.wishlist.map(gift => {
                          const hasReserved = gift.reservations && gift.reservations.some(r => r.user === currentUser);
                          const reservationCount = gift.reservations ? gift.reservations.length : 0;

                          return (
                            <div
                              key={gift.id}
                              className={`border-2 rounded-lg p-4 transition-all ${
                                hasReserved
                                  ? 'border-green-300 bg-green-50'
                                  : 'border-gray-200 hover:border-red-300'
                              }`}
                            >
                              <div className="flex gap-4">
                                {gift.image && (
                                  <img
                                    src={gift.image}
                                    alt={gift.name}
                                    className="w-24 h-24 object-cover rounded-lg"
                                    onError={(e) => e.target.style.display = 'none'}
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h4 className="font-bold text-lg text-gray-800">{gift.name}</h4>
                                      {gift.price && <p className="text-sm text-gray-600 mt-1">💰 {gift.price}</p>}
                                    </div>
                                    <button
                                      onClick={() => toggleReservation(username, gift.id)}
                                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                        hasReserved
                                          ? 'bg-red-600 text-white hover:bg-red-700'
                                          : 'bg-green-600 text-white hover:bg-green-700'
                                      }`}
                                    >
                                      {hasReserved ? 'Dé-réserver' : 'Réserver'}
                                    </button>
                                  </div>

                                  {gift.description && (
                                    <p className="text-sm text-gray-600 mb-2">{gift.description}</p>
                                  )}

                                  {reservationCount > 0 && (
                                    <div className="bg-white border-2 border-green-200 rounded-lg p-2">
                                      <p className="text-xs font-semibold text-green-700 mb-1">
                                        {hasReserved
                                          ? '✅ Vous avez réservé ce cadeau'
                                          : `⚠️ Déjà réservé ${reservationCount} fois`}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Listes des enfants */}
                  {userProfile.children && userProfile.children.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-3">
                        Listes des enfants de {username} :
                      </h3>
                      <div className="space-y-4">
                        {userProfile.children.map(child => (
                          <div key={child.id} className="border-2 border-purple-200 rounded-lg p-4">
                            <div className="mb-3">
                              <h4 className="font-bold text-lg text-purple-800">{child.name}</h4>
                              {child.age && <p className="text-sm text-gray-600">👶 {child.age}</p>}
                              {child.interests && <p className="text-sm text-gray-600">❤️ {child.interests}</p>}
                            </div>

                            {child.wishlist && child.wishlist.length > 0 ? (
                              <div className="space-y-3">
                                {child.wishlist.map(gift => {
                                  const hasReserved = gift.reservations && gift.reservations.some(r => r.user === currentUser);
                                  const reservationCount = gift.reservations ? gift.reservations.length : 0;

                                  return (
                                    <div
                                      key={gift.id}
                                      className={`border-2 rounded-lg p-3 ${
                                        hasReserved
                                          ? 'border-green-300 bg-green-50'
                                          : 'border-gray-200'
                                      }`}
                                    >
                                      <div className="flex gap-3">
                                        {gift.image && (
                                          <img
                                            src={gift.image}
                                            alt={gift.name}
                                            className="w-20 h-20 object-cover rounded-lg"
                                            onError={(e) => e.target.style.display = 'none'}
                                          />
                                        )}
                                        <div className="flex-1">
                                          <div className="flex items-start justify-between mb-2">
                                            <div>
                                              <h5 className="font-bold text-gray-800">{gift.name}</h5>
                                              {gift.price && <p className="text-xs text-gray-600">💰 {gift.price}</p>}
                                            </div>
                                            <button
                                              onClick={() => toggleChildReservation(username, child.id, gift.id)}
                                              className={`px-3 py-1 rounded-lg font-semibold text-sm transition-colors ${
                                                hasReserved
                                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                                  : 'bg-green-600 text-white hover:bg-green-700'
                                              }`}
                                            >
                                              {hasReserved ? 'Dé-réserver' : 'Réserver'}
                                            </button>
                                          </div>

                                          {gift.description && (
                                            <p className="text-xs text-gray-600 mb-2">{gift.description}</p>
                                          )}

                                          {reservationCount > 0 && (
                                            <div className="bg-white border border-green-200 rounded p-1">
                                              <p className="text-xs text-green-700">
                                                {hasReserved
                                                  ? '✅ Vous avez réservé'
                                                  : `⚠️ Réservé ${reservationCount}×`}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 text-center py-4">
                                Aucun cadeau dans la liste de {child.name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message si aucune donnée */}
                  {(!userProfile.wishlist || userProfile.wishlist.length === 0) &&
                   (!userProfile.children || userProfile.children.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <Gift className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>{username} n'a pas encore ajouté de cadeaux</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
