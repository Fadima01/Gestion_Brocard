import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { DollarSign, Plus, Calendar, Tag, FileText, CheckCircle, AlertCircle, Trash, X } from 'lucide-react';

const CATEGORIES = [
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'FOOD', label: 'Nourriture' },
  { value: 'DRINKS', label: 'Eau / Boisson' },
  { value: 'FUEL', label: 'Carburant' },
  { value: 'COMMUNICATION', label: 'Communication' },
  { value: 'COMPENSATION', label: 'Rémunérations' },
  { value: 'RAW_MAT', label: 'Achat Matières Premières' },
  { value: 'OTHER', label: 'Autre' }
];

const Depenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    categorie: 'TRANSPORT',
    montant: '',
    date_depense: new Date().toISOString().split('T')[0],
    description: '',
    ordre_production: ''
  });

  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = filterCategory 
        ? `/depenses/?categorie=${filterCategory}&no_pagination=true` 
        : '/depenses/?no_pagination=true';
      
      const [expRes, poRes] = await Promise.all([
        api.get(url),
        api.get('/production/orders/?no_pagination=true')
      ]);

      const expList = expRes.data.results || expRes.data;
      setExpenses(expList);
      setProductionOrders(poRes.data.results || poRes.data);
      
      // Calculate total
      const total = expList.reduce((sum, item) => sum + parseFloat(item.montant), 0);
      setTotalAmount(total);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la récupération des données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterCategory]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditClick = (expense) => {
    setEditingId(expense.id);
    setFormData({
      categorie: expense.categorie,
      montant: expense.montant,
      date_depense: expense.date_depense,
      description: expense.description || '',
      ordre_production: expense.ordre_production || ''
    });
    setError(null);
    setSuccess(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      categorie: 'TRANSPORT',
      montant: '',
      date_depense: new Date().toISOString().split('T')[0],
      description: '',
      ordre_production: ''
    });
    setError(null);
    setSuccess(false);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette dépense ?")) {
      return;
    }
    try {
      setError(null);
      setSuccess(false);
      await api.delete(`/depenses/${id}/`);
      setSuccess(true);
      fetchData();
      if (editingId === id) {
        handleCancelEdit();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Erreur lors de la suppression de la dépense.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.montant || parseFloat(formData.montant) <= 0) {
      setError("Le montant doit être supérieur à 0.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const payload = {
        categorie: formData.categorie,
        montant: parseFloat(formData.montant),
        date_depense: formData.date_depense,
        description: formData.description,
        ordre_production: formData.ordre_production || null
      };

      if (editingId) {
        await api.put(`/depenses/${editingId}/`, payload);
        setSuccess(true);
        setEditingId(null);
      } else {
        await api.post('/depenses/', payload);
        setSuccess(true);
      }

      setFormData({
        categorie: 'TRANSPORT',
        montant: '',
        date_depense: new Date().toISOString().split('T')[0],
        description: '',
        ordre_production: ''
      });
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Erreur lors de l'enregistrement de la dépense.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dépenses d'Exploitation</h1>
        <p className="text-sm text-slate-400 mt-1">Saisie et suivi des charges annexes (carburant, nourriture, fournitures...)</p>
      </div>

      {/* Grid Layout: Form vs List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Log/Edit Expense Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card rounded-2xl border border-slate-800/80 p-6 bg-slate-900/50">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="text-gold-500" size={20} />
              {editingId ? 'Modifier la dépense' : 'Enregistrer une dépense'}
            </h2>

            {error && (
              <div className="p-3 mb-4 rounded-lg bg-rose-955/40 border border-rose-800/50 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 mb-4 rounded-lg bg-emerald-955/40 border border-emerald-800/50 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle size={14} />
                <span>Opération effectuée avec succès.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Catégorie</label>
                <select
                  name="categorie"
                  value={formData.categorie}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-gold-500 outline-none"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Montant (FCFA)</label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-slate-500 text-sm">FCFA</span>
                  <input
                    type="number"
                    name="montant"
                    value={formData.montant}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-16 pr-4 py-2.5 text-white text-sm focus:border-gold-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Date de la dépense</label>
                <input
                  type="date"
                  name="date_depense"
                  value={formData.date_depense}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-gold-500 outline-none"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description / Motif</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Détails de la charge..."
                  rows="3"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-gold-500 outline-none"
                />
              </div>

              {/* OP Imputé */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Imputer à un Atelier / Ordre de prod.</label>
                <select
                  name="ordre_production"
                  value={formData.ordre_production}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-gold-500 outline-none"
                >
                  <option value="">-- Dépense générale --</option>
                  {productionOrders.map(po => (
                    <option key={po.id} value={po.id}>{po.reference} (Atelier {po.workshop_name || po.workshop})</option>
                  ))}
                </select>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-slate-950 font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-gold-950/20 text-center flex items-center justify-center gap-2"
              >
                {submitting ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : 'Valider la dépense'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 px-4 rounded-xl transition-all duration-200 text-center flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Annuler la modification
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: List of Expenses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dashboard Summary widget */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl border border-slate-800/80 p-5 flex items-center gap-4 bg-slate-900/30">
              <div className="h-12 w-12 rounded-xl bg-gold-950/40 border border-gold-900/50 flex items-center justify-center text-gold-400">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Total des charges filtrées</p>
                <p className="text-2xl font-bold text-white mt-0.5">{totalAmount.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </div>

          {/* List and Filters */}
          <div className="glass-card rounded-2xl border border-slate-800/80 bg-slate-900/20 overflow-hidden">
            <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-slate-200">Journal des dépenses</h3>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-xs text-slate-400 whitespace-nowrap">Filtrer par catégorie:</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                >
                  <option value="">Toutes</option>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gold-500 font-medium">Chargement des dépenses...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">Aucune dépense enregistrée.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Référence</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Catégorie</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Origine / Imputation</th>
                      <th className="px-6 py-4 text-right">Montant</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {expenses.map((expense) => {
                      const catObj = CATEGORIES.find(c => c.value === expense.categorie);
                      return (
                        <tr key={expense.id} className="hover:bg-slate-800/10 transition-all text-xs">
                          <td className="px-6 py-4 font-semibold text-gold-500 whitespace-nowrap">
                            {expense.reference || `DEP-${expense.id}`}
                          </td>
                          <td className="px-6 py-4 text-slate-400 whitespace-nowrap flex items-center gap-2">
                            <Calendar size={14} className="text-slate-600" />
                            {new Date(expense.date_depense).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300">
                              <Tag size={10} className="text-gold-500" />
                              {catObj ? catObj.label : expense.categorie}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300 max-w-xs truncate" title={expense.description}>
                            {expense.description || "-"}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            {expense.ordre_production && (
                              <div className="text-rose-455">OF ID: {expense.ordre_production}</div>
                            )}
                            {expense.session_caisse && (
                              <div className="text-amber-455">Caisse: #{expense.session_caisse}</div>
                            )}
                            {expense.fabric_purchase && (
                              <div className="text-emerald-455">Achat Matières #{expense.fabric_purchase}</div>
                            )}
                            {!expense.ordre_production && !expense.session_caisse && !expense.fabric_purchase && (
                              <span className="text-slate-600">Charge générale</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-white whitespace-nowrap font-mono">
                            {parseFloat(expense.montant).toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleEditClick(expense)}
                                className="p-1.5 hover:text-gold-400 text-slate-500 transition-colors"
                                title="Modifier"
                              >
                                <FileText size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteClick(expense.id)}
                                className="p-1.5 hover:text-rose-500 text-slate-500 transition-colors"
                                title="Supprimer"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Depenses;
