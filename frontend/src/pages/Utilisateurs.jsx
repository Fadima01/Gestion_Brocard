import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { formatFullName } from '../store/authContext';
import { User, Shield, Plus, Key, CheckCircle, AlertCircle, Edit, Trash, ToggleLeft, ToggleRight } from 'lucide-react';

const Utilisateurs = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'SELLER',
    is_active: true
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/users/');
      setUsers(res.data.results || res.data);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la récupération des utilisateurs. Seuls les Administrateurs ont accès.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setError("Le nom d'utilisateur et le mot de passe sont obligatoires.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);
      await api.post('/users/', formData);
      setSuccess(true);
      setFormData({
        username: '',
        password: '',
        email: '',
        first_name: '',
        last_name: '',
        role: 'SELLER',
        is_active: true
      });
      setShowAddForm(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Erreur lors de la création de l'utilisateur (le nom existe peut-être déjà).");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      setError(null);
      await api.patch(`/users/${user.id}/`, {
        is_active: !user.is_active
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la modification de l'état de l'utilisateur.");
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Utilisateurs du Suivi Brocard</h1>
          <p className="text-sm text-slate-400 mt-1">Habilitations de connexion, rôles Administrateur / Vendeur et blocages de compte</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-gold-600 hover:bg-gold-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition w-max"
        >
          <Plus size={16} /> Ajouter un compte
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle size={16} />
          <span>Utilisateur créé avec succès.</span>
        </div>
      )}

      {/* Add User Drawer */}
      {showAddForm && (
        <div className="glass-card rounded-2xl border border-slate-800 p-6 max-w-xl bg-slate-900/40">
          <h3 className="text-white font-semibold text-base mb-4 flex items-center gap-2">
            <User className="text-gold-500" size={18} />
            Créer un nouveau compte utilisateur
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Identifiant (Username)</label>
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Key size={12} className="text-slate-500" /> Mot de passe
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Prénom</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nom</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                name="email"
                placeholder="Ex: jean@brocard.com"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Rôle habilité</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-gold-500 outline-none"
              >
                <option value="SELLER">Vendeur (Saisie & Caisse)</option>
                <option value="ADMIN">Administrateur (Tout accès)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="rounded border-slate-800 bg-slate-900 text-gold-500 focus:ring-gold-500 h-4 w-4"
              />
              <label htmlFor="is_active" className="text-xs font-semibold text-slate-400 cursor-pointer">
                Compte actif immédiatement
              </label>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-gold-600 hover:bg-gold-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition"
              >
                {submitting ? 'Création...' : 'Créer le compte'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      {loading ? (
        <div className="text-center py-12 text-gold-500 font-medium">Chargement de la liste des utilisateurs...</div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Nom d'utilisateur</th>
                <th className="px-6 py-4">Identité</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4 text-center">Rôle</th>
                <th className="px-6 py-4 text-center">Date inscription</th>
                <th className="px-6 py-4 text-center">Accès</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map((u) => {
                const isAdmin = u.role === 'ADMIN';
                return (
                  <tr key={u.id} className="hover:bg-slate-800/10 transition">
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2">
                      <User size={16} className="text-slate-600" />
                      {u.username}
                    </td>
                    <td className="px-6 py-4 text-slate-200">
                      {formatFullName(u.first_name, u.last_name, '') || "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-400">{u.email || "-"}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isAdmin ? 'bg-gold-950 text-gold-400 border border-gold-900/50' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                        <Shield size={10} className={isAdmin ? 'text-gold-500' : 'text-slate-500'} />
                        {isAdmin ? 'Admin' : 'Vendeur'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-500">
                      {new Date(u.date_joined).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold transition ${u.is_active ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50' : 'bg-rose-950/40 text-rose-400 border border-rose-900/50'}`}
                        title={u.is_active ? "Désactiver le compte" : "Activer le compte"}
                      >
                        {u.is_active ? 'Actif' : 'Bloqué'}
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Utilisateurs;
