import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  Coins, ArrowDown, ArrowUp, Plus, CheckCircle, AlertCircle, 
  RefreshCw, Filter, Search, Landmark, Receipt, Sparkles, X
} from 'lucide-react';

const Caisse = () => {
  const [globalStatus, setGlobalStatus] = useState({
    solde_actuel: 0,
    total_ventes: 0,
    total_depenses: 0,
    total_entrees: 0,
    total_sorties: 0
  });
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type_mouvement: 'ENTREE',
    montant: '',
    mode_paiement: 'Espèces',
    description: ''
  });

  const paymentModes = [
    'Espèces',
    'Orange Money',
    'Moov Money',
    'Virement bancaire',
    'Paiement mixte'
  ];

  const fetchGlobalStatus = async () => {
    const response = await api.get('/caisse/movements/global/');
    setGlobalStatus(response.data);
  };

  const fetchMovements = async () => {
    const response = await api.get('/caisse/movements/');
    setMovements(response.data.results || response.data);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchGlobalStatus(),
        fetchMovements()
      ]);
    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement des données de la Caisse Globale.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!formData.montant || parseFloat(formData.montant) <= 0) {
      setError("Veuillez entrer un montant valide supérieur à 0.");
      return;
    }
    if (!formData.description.trim()) {
      setError("La description / le motif est obligatoire pour la traçabilité.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const payload = {
        type_mouvement: formData.type_mouvement,
        montant: parseFloat(formData.montant),
        mode_paiement: formData.mode_paiement,
        description: formData.description
      };

      await api.post('/caisse/movements/', payload);

      setFormData({
        type_mouvement: 'ENTREE',
        montant: '',
        mode_paiement: 'Espèces',
        description: ''
      });
      setShowForm(false);
      setSuccess("Mouvement de caisse enregistré avec succès.");
      
      // Refresh statistics and list
      await fetchData();

      // Clear success message after 4s
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.detail || "Erreur lors de l'enregistrement du mouvement.");
    } finally {
      setSubmitting(false);
    }
  };

  // Format currency helper
  const formatFCFA = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('fr-FR') + ' FCFA';
  };

  // Filtered movements
  const filteredMovements = movements.filter(m => {
    const matchesSearch = searchQuery === '' || 
      (m.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.mode_paiement || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === '' || m.type_mouvement === typeFilter;
    const matchesMode = modeFilter === '' || m.mode_paiement === modeFilter;
    
    return matchesSearch && matchesType && matchesMode;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Caisse Globale</h1>
          <p className="text-sm text-slate-400 mt-1">
            Suivi en temps réel de tous les flux financiers de l'entreprise (Suivi Brocard)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={fetchData}
            className="flex items-center justify-center p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all duration-200"
            title="Rafraîchir les données"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-white font-semibold rounded-xl shadow-lg transition-all duration-300"
          >
            <Plus size={18} />
            Opération manuelle
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-400 text-sm flex items-center gap-2 animate-fadeIn">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gold-500 font-semibold animate-pulse">
          Chargement des informations de caisse...
        </div>
      ) : (
        <>
          {/* Main indicators counters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Balance Card */}
            <div className="glass-card p-6 rounded-2xl border border-gold-500/20 bg-gradient-to-br from-gold-950/15 via-slate-900/60 to-slate-900 flex flex-col justify-between h-36">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-400">Solde Caisse Globale</span>
                <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-gold-500/10 text-gold-400">
                  <Landmark size={18} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-extrabold text-white tracking-tight">
                  {formatFCFA(globalStatus.solde_actuel)}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Disponibilité nette immédiate multi-mode</p>
              </div>
            </div>

            {/* Total Inflows Card */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 flex flex-col justify-between h-36">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cumul des Entrées</span>
                <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-400">
                  <ArrowUp size={18} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-extrabold text-emerald-400 tracking-tight">
                  {formatFCFA(globalStatus.total_entrees)}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Ventes & Acomptes reçus : {formatFCFA(globalStatus.total_ventes)}
                </p>
              </div>
            </div>

            {/* Total Outflows Card */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 flex flex-col justify-between h-36">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cumul des Sorties</span>
                <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-rose-500/10 text-rose-400">
                  <ArrowDown size={18} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-extrabold text-rose-400 tracking-tight">
                  {formatFCFA(globalStatus.total_sorties)}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Dépenses d'exploitation : {formatFCFA(globalStatus.total_depenses)}
                </p>
              </div>
            </div>

          </div>

          {/* Operation Registration Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
              <div className="glass-card max-w-lg w-full border border-gold-500/20 bg-slate-950 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-gold-400" />
                    <h3 className="text-white font-bold text-lg">Enregistrer un mouvement manuel</h3>
                  </div>
                  <button 
                    onClick={() => setShowForm(false)}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Type d'opération
                      </label>
                      <select
                        value={formData.type_mouvement}
                        onChange={(e) => setFormData({ ...formData, type_mouvement: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-gold-500 outline-none"
                      >
                        <option value="ENTREE">Entrée (+) / Apport</option>
                        <option value="SORTIE">Sortie (-) / Dépense</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Mode de paiement
                      </label>
                      <select
                        value={formData.mode_paiement}
                        onChange={(e) => setFormData({ ...formData, mode_paiement: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-gold-500 outline-none"
                      >
                        {paymentModes.map(mode => (
                          <option key={mode} value={mode}>{mode}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Montant de la transaction (FCFA)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="Ex: 25000"
                      value={formData.montant}
                      onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-gold-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Motif / Description précise
                    </label>
                    <textarea
                      required
                      placeholder="Indiquez le motif précis (ex: Ajustement de caisse, Apport personnel, etc.)"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
                      rows="3"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition text-sm font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 bg-gold-600 hover:bg-gold-500 text-slate-950 font-bold rounded-xl transition text-sm shadow-lg shadow-gold-600/15"
                    >
                      {submitting ? "Enregistrement..." : "Confirmer l'opération"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Movements list / logs */}
          <div className="glass-card rounded-2xl border border-slate-800/80 bg-slate-900/20 overflow-hidden">
            
            {/* Filter bar */}
            <div className="p-5 bg-slate-900/60 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-slate-200">Journal des Mouvements de Caisse</h3>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                {/* Search */}
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 w-full sm:w-60">
                  <Search size={14} className="text-slate-500 mr-2" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher description..."
                    className="bg-transparent border-none outline-none w-full text-white placeholder-slate-500 text-xs"
                  />
                </div>

                {/* Type Filter */}
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none w-full sm:w-auto"
                >
                  <option value="">Tous les flux</option>
                  <option value="ENTREE">Entrées uniquement</option>
                  <option value="SORTIE">Sorties uniquement</option>
                </select>

                {/* Payment Mode Filter */}
                <select 
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none w-full sm:w-auto"
                >
                  <option value="">Tous les modes</option>
                  {paymentModes.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredMovements.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-sm">
                Aucun mouvement de caisse trouvé dans l'historique.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Date et Heure</th>
                      <th className="px-6 py-4">Sens</th>
                      <th className="px-6 py-4">Mode</th>
                      <th className="px-6 py-4">Motif / Description</th>
                      <th className="px-6 py-4 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredMovements.map((move) => {
                      const isEntree = move.type_mouvement === 'ENTREE';
                      return (
                        <tr key={move.id} className="hover:bg-slate-850/10 transition-colors">
                          <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                            {new Date(move.date_mouvement || move.created_at).toLocaleString('fr-FR')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isEntree 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {isEntree ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                              {isEntree ? 'Entrée' : 'Sortie'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300 text-xs font-semibold">
                            {move.mode_paiement || 'Espèces'}
                          </td>
                          <td className="px-6 py-4 text-slate-300 text-xs max-w-sm font-sans" title={move.description}>
                            {move.description || "Aucun motif enregistré"}
                          </td>
                          <td className={`px-6 py-4 text-right font-mono font-bold text-xs ${
                            isEntree ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {isEntree ? '+' : '-'}{parseFloat(move.montant).toLocaleString()} F
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Caisse;
