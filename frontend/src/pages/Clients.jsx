import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Plus, Search, User, Phone, MapPin } from 'lucide-react';

const Clients = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [ville, setVille] = useState('');

  const fetchCustomers = async () => {
    try {
      const response = await api.get(`/ventes/customers/?search=${search}`);
      setCustomers(response.data.results || response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des clients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/ventes/customers/', { nom, telephone, ville });
      setNom('');
      setTelephone('');
      setVille('');
      setShowForm(false);
      fetchCustomers();
    } catch (err) {
      alert("Erreur lors de la création du client.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Fichier Clients</h1>
          <p className="text-sm text-slate-400 mt-1">Gérez vos contacts et l'historique d'acquisition client</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-white font-semibold rounded-lg shadow-lg shadow-gold-600/10 hover:shadow-gold-500/20 transition-all duration-200"
        >
          <Plus size={18} />
          Nouveau client
        </button>
      </div>

      {/* Form panel */}
      {showForm && (
        <div className="glass-card p-6 rounded-2xl border border-gold-500/20 w-full max-w-xl">
          <h2 className="text-lg font-bold text-white mb-4">Créer une fiche client</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nom complet</label>
                <input 
                  type="text" 
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50"
                  placeholder="Ex: Aminata Diop"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Téléphone</label>
                <input 
                  type="text" 
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50"
                  placeholder="+221770000000"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Ville de résidence</label>
              <input 
                type="text" 
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50"
                placeholder="Dakar, Saint-Louis..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-500 text-white font-semibold rounded-xl"
              >
                Créer la fiche
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and search bar */}
      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 w-full max-w-md">
        <Search size={18} className="text-slate-500 mr-2" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou téléphone..."
          className="bg-transparent border-none outline-none w-full text-white placeholder-slate-500 text-sm"
        />
      </div>

      {/* Customer list Grid */}
      {loading ? (
        <div className="text-center py-10 text-gold-500">Chargement de la base clients...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((c) => (
            <div key={c.id} className="glass-card p-5 rounded-2xl border border-slate-800/80 hover:border-gold-500/20 transition-all duration-300 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-gold-400">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100">{c.nom}</h3>
                  <p className="text-xs text-slate-500">Inscrit le {new Date(c.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-600" />
                  <span>{c.telephone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-600" />
                  <span>{c.ville || "Ville non précisée"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clients;
