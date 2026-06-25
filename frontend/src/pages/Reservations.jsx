import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  Plus, Search, Bookmark, CheckCircle2, X, AlertTriangle, AlertCircle, Eye, Calendar, User, ShoppingBag, Coins
} from 'lucide-react';

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedResForPayment, setSelectedResForPayment] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Espèces');
  const [paying, setPaying] = useState(false);

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedResForHistory, setSelectedResForHistory] = useState(null);

  // Edit Reservation State
  const [editingRes, setEditingRes] = useState(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [modelId, setModelId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [dateLimite, setDateLimite] = useState('');
  const [montantVerse, setMontantVerse] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let resUrl = '/ventes/reservations/';
      const params = [];
      if (search) params.push(`search=${search}`);
      if (statusFilter) params.push(`statut=${statusFilter}`);
      if (params.length > 0) resUrl += `?${params.join('&')}`;

      const [resRes, custRes, modelRes] = await Promise.all([
        api.get(resUrl),
        api.get('/ventes/customers/'),
        api.get('/catalogue/models/')
      ]);

      setReservations(resRes.data.results || resRes.data);
      setCustomers(custRes.data.results || custRes.data);
      setModels((modelRes.data.results || modelRes.data).filter(m => !m.is_archived));
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la récupération des réservations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter]);

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!customerId || !modelId || !dateLimite) {
      setError("Tous les champs obligatoires doivent être renseignés.");
      return;
    }

    try {
      const payload = {
        customer: parseInt(customerId),
        model: parseInt(modelId),
        quantite: parseInt(quantity),
        date_limite: dateLimite,
        montant_verse: parseFloat(montantVerse) || 0.00
      };

      if (editingRes) {
        const res = await api.put(`/ventes/reservations/${editingRes.id}/`, payload);
        setSuccess(`Réservation ${res.data.reference} modifiée avec succès.`);
        handleCancelEdit();
      } else {
        const res = await api.post('/ventes/reservations/', payload);
        setSuccess(`Réservation ${res.data.reference} créée avec succès.`);
        setCustomerId('');
        setModelId('');
        setQuantity(1);
        setDateLimite('');
        setMontantVerse('');
        setShowForm(false);
      }
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.detail || "Erreur lors de l'enregistrement de la réservation.");
    }
  };

  const handleStartEdit = (res) => {
    setEditingRes(res);
    setCustomerId(res.customer.toString());
    setModelId(res.model.toString());
    setQuantity(res.quantite);
    setDateLimite(res.date_limite);
    setMontantVerse(res.montant_verse);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingRes(null);
    setCustomerId('');
    setModelId('');
    setQuantity(1);
    setDateLimite('');
    setMontantVerse('');
    setShowForm(false);
  };

  const handleToggleForm = () => {
    if (showForm) {
      handleCancelEdit();
    } else {
      setShowForm(true);
    }
  };

  const handleCancelReservation = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette réservation ? Cette action libérera les stocks associés.")) return;
    try {
      setError(null);
      setSuccess(null);
      await api.post(`/ventes/reservations/${id}/cancel/`);
      setSuccess("Réservation annulée avec succès.");
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Erreur lors de l'annulation de la réservation.");
    }
  };

  const handleCompleteReservation = async (id) => {
    if (!window.confirm("Valider le retrait de cette réservation ? L'article sera marqué comme livré et vendu.")) return;
    try {
      setError(null);
      setSuccess(null);
      await api.post(`/ventes/reservations/${id}/complete/`);
      setSuccess("Réservation validée et retirée par le client.");
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Erreur lors de la validation du retrait.");
    }
  };

  const handleOpenPayModal = (res) => {
    setSelectedResForPayment(res);
    setPayAmount(res.montant_restant);
    setPayMode('Espèces');
    setShowPayModal(true);
  };

  const handlePayBalance = async (e) => {
    e.preventDefault();
    if (!selectedResForPayment) return;
    setError(null);
    setSuccess(null);
    setPaying(true);

    try {
      const payload = {
        amount: parseFloat(payAmount),
        payment_mode: payMode
      };
      const res = await api.post(`/ventes/reservations/${selectedResForPayment.id}/pay/`, payload);
      setSuccess(`Paiement de ${formatFCFA(payload.amount)} enregistré avec succès pour la réservation ${res.data.reference}.`);
      setShowPayModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Erreur lors de l'enregistrement du paiement.");
    } finally {
      setPaying(false);
    }
  };

  const formatFCFA = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('fr-FR') + ' FCFA';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'EN_ATTENTE': return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'PAIEMENT_PARTIEL': return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
      case 'PAYEE': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'RECUPEREE': return 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
      case 'ANNULEE': return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      case 'EXPIREE': return 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30';
      default: return 'bg-slate-800 text-slate-300';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'EN_ATTENTE': return 'En attente';
      case 'PAIEMENT_PARTIEL': return 'Paiement partiel';
      case 'PAYEE': return 'Payée';
      case 'RECUPEREE': return 'Récupérée';
      case 'ANNULEE': return 'Annulée';
      case 'EXPIREE': return 'Expirée';
      default: return status;
    }
  };

  // Helper calculation
  const selectedModelObj = models.find(m => m.id === parseInt(modelId));
  const suggestedPrice = selectedModelObj ? parseFloat(selectedModelObj.prix_vente_conseille) : 0;
  const totalPrice = quantity * suggestedPrice;
  const remainingPrice = totalPrice - (parseFloat(montantVerse) || 0);

  // Check if date is overdue
  const isOverdue = (dateStr, statut) => {
    if (!['EN_ATTENTE', 'PAIEMENT_PARTIEL', 'PAYEE'].includes(statut)) return false;
    const limit = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    return limit < today;
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Réservations Clients</h1>
          <p className="text-sm text-slate-400 mt-1">Gestion des habits réservés en boutique, acomptes et dates limites de retrait</p>
        </div>
        <button 
          onClick={handleToggleForm}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-white font-semibold rounded-lg shadow-lg shadow-gold-600/10 hover:shadow-gold-500/20 transition-all duration-200 text-sm"
        >
          <Plus size={18} />
          {showForm ? "Fermer le formulaire" : "Créer une réservation"}
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-400 text-sm flex items-center gap-2 animate-fadeIn">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* New / Edit Reservation Form */}
      {showForm && (
        <div className="glass-card p-6 rounded-2xl border border-gold-500/20 space-y-4 animate-fadeIn">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bookmark className="text-gold-400" size={20} />
            {editingRes ? "Modifier la réservation" : "Enregistrer une nouvelle réservation"}
          </h2>
          
          <form onSubmit={handleCreateReservation} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <User size={12} className="text-gold-400" /> Client acheteur *
                </label>
                <select 
                  value={customerId} 
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                >
                  <option value="">-- Choisir le client --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.telephone})</option>)}
                </select>
                <span className="text-[10px] text-slate-500 block mt-1">Client à qui réserver l'habit.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <ShoppingBag size={12} className="text-gold-400" /> Modèle d'habit *
                </label>
                <select 
                  value={modelId} 
                  onChange={(e) => setModelId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                >
                  <option value="">-- Choisir le modèle --</option>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({formatFCFA(m.prix_vente_conseille)})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 block mt-1">Modèle d'habit réservé dans le catalogue.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Quantité réservée *</label>
                <input 
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Généralement 1 pièce.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Calendar size={12} className="text-gold-400" /> Date limite de retrait *
                </label>
                <input 
                  type="date"
                  required
                  value={dateLimite}
                  onChange={(e) => setDateLimite(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Date limite contractuelle de récupération de l'habit.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Coins size={12} className="text-gold-400" /> Acompte versé (FCFA)
                </label>
                <input 
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={montantVerse}
                  onChange={(e) => setMontantVerse(e.target.value)}
                  disabled={!!editingRes}
                  className={`w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm font-bold text-emerald-400 ${editingRes ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  {editingRes ? "Les acomptes ne sont modifiables que via les versements successifs." : "Montant d'acompte de garantie versé à la commande."}
                </span>
              </div>

              {selectedModelObj && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col justify-center text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-400"><span>Prix unitaire :</span> <span className="font-semibold text-slate-200">{formatFCFA(suggestedPrice)}</span></div>
                  <div className="flex justify-between text-slate-400"><span>Total à payer :</span> <span className="font-semibold text-slate-200">{formatFCFA(totalPrice)}</span></div>
                  <div className="flex justify-between font-bold border-t border-slate-800 pt-1 text-gold-400"><span>Reste dû :</span> <span>{formatFCFA(remainingPrice)}</span></div>
                </div>
              )}

            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
              <button 
                type="button" 
                onClick={handleCancelEdit}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-sm font-semibold"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-500 text-white font-semibold rounded-xl text-sm"
              >
                {editingRes ? "Enregistrer les modifications" : "Enregistrer la réservation"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-3 text-slate-500" />
          <input 
            type="text"
            placeholder="Rechercher par référence, nom client, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-850 rounded-lg text-white focus:outline-none focus:border-gold-500/40 text-sm"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-white focus:outline-none text-sm"
          >
            <option value="">-- Tous les statuts --</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="PAIEMENT_PARTIEL">Paiement partiel</option>
            <option value="PAYEE">Payée</option>
            <option value="RECUPEREE">Récupérée</option>
            <option value="ANNULEE">Annulée</option>
            <option value="EXPIREE">Expirée</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="text-center py-12 text-gold-500 font-medium">Chargement des réservations...</div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border border-slate-850 rounded-2xl bg-slate-900/10">
          Aucune réservation trouvée.
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden bg-slate-900/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Téléphone</th>
                  <th className="px-4 py-3">Habit réservé</th>
                  <th className="px-4 py-3 text-center">Quantité</th>
                  <th className="px-4 py-3 text-center">Date limite</th>
                  <th className="px-4 py-3 text-right">Montant Total</th>
                  <th className="px-4 py-3 text-right">Montant Payé</th>
                  <th className="px-4 py-3 text-right">Reste à payer</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {reservations.map((res) => {
                  const overdue = isOverdue(res.date_limite, res.statut);
                  const remains = parseFloat(res.montant_restant) || 0;
                  
                  return (
                    <tr key={res.id} className={`hover:bg-slate-800/10 transition ${overdue ? 'bg-rose-950/10' : ''}`}>
                      <td className="px-4 py-3 font-semibold text-gold-500">
                        {res.reference}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        {res.customer_name}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {res.customer_phone}
                      </td>
                      <td className="px-4 py-3 flex items-center gap-3">
                        {res.model_image ? (
                          <div className="w-10 h-10 relative flex items-center justify-center rounded-lg border border-slate-850 overflow-hidden">
                            <img 
                              src={res.model_image} 
                              alt={res.model_name} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                const fallback = e.target.parentNode.querySelector('.img-fallback');
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <div className="img-fallback hidden absolute inset-0 w-full h-full items-center justify-center bg-slate-900 text-[8px] text-slate-500 text-center font-medium">
                              N/A
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-850 bg-slate-900 text-[10px] text-slate-500">
                            N/A
                          </div>
                        )}
                        <span className="font-semibold text-slate-200">{res.model_name}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">
                        {res.quantite}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${overdue ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                          {new Date(res.date_limite).toLocaleDateString('fr-FR')}
                        </span>
                        {overdue && (
                          <span className="block text-[9px] text-rose-500 font-bold uppercase tracking-wider flex items-center justify-center gap-0.5 mt-0.5">
                            <AlertTriangle size={8} /> Dépassée !
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300 font-semibold">
                        {formatFCFA(parseFloat(res.montant_verse) + remains)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-semibold">
                        {formatFCFA(res.montant_verse)}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-400 font-semibold">
                        {formatFCFA(remains)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadge(res.statut)}`}>
                          {getStatusLabel(res.statut)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {/* If active, not RECUPEREE, ANNULEE, EXPIREE */}
                          {!['RECUPEREE', 'ANNULEE', 'EXPIREE'].includes(res.statut) && (
                            <>
                              {remains > 0 ? (
                                <>
                                  <button
                                    onClick={() => handleOpenPayModal(res)}
                                    className="px-2 py-1 bg-gold-600 hover:bg-gold-500 text-white font-bold rounded text-xs transition shadow-sm"
                                    title="Enregistrer un versement"
                                  >
                                    Payer
                                  </button>
                                  <button
                                    onClick={() => handleStartEdit(res)}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-750 font-bold rounded text-xs transition"
                                    title="Modifier la réservation"
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    onClick={() => handleCancelReservation(res.id)}
                                    className="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/50 text-rose-400 font-bold rounded text-xs transition"
                                    title="Annuler la réservation"
                                  >
                                    Annuler
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleCompleteReservation(res.id)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-xs transition shadow-sm"
                                    title="Valider la récupération et livraison"
                                  >
                                    Récupérer
                                  </button>
                                  <button
                                    onClick={() => handleStartEdit(res)}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-750 font-bold rounded text-xs transition"
                                    title="Modifier la réservation"
                                  >
                                    Modifier
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          
                          {res.statut === 'RECUPEREE' && (
                            <button
                              disabled
                              className="px-2 py-1 bg-slate-800/80 text-slate-500 font-bold rounded text-xs cursor-not-allowed border border-slate-750"
                            >
                              Vente terminée
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              setSelectedResForHistory(res);
                              setShowHistoryModal(true);
                            }}
                            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-300 font-semibold rounded text-xs transition"
                          >
                            Historique ({res.payments ? res.payments.length : 0})
                          </button>
                        </div>
                      </td>
                    </tr>
                  );

                })}
              </tbody>
            </table>
          </div>
         </div>
      )}

      {/* Pay Modal */}
      {showPayModal && selectedResForPayment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-gold-500/20 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Coins className="text-gold-400" size={20} />
                Payer le solde - {selectedResForPayment.reference}
              </h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-white transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handlePayBalance} className="space-y-4">
              <div className="text-sm text-slate-300 space-y-1 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between"><span>Client :</span> <span className="font-semibold text-white">{selectedResForPayment.customer_name}</span></div>
                <div className="flex justify-between"><span>Habit :</span> <span className="font-semibold text-white">{selectedResForPayment.model_name}</span></div>
                <div className="flex justify-between border-t border-slate-800 pt-1 mt-1 font-bold">
                  <span>Reste à payer :</span> <span className="text-rose-400">{formatFCFA(selectedResForPayment.montant_restant)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Montant à régler (FCFA) *</label>
                <input 
                  type="number"
                  min="1"
                  max={selectedResForPayment.montant_restant}
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm font-bold text-emerald-400"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Vous pouvez effectuer un paiement partiel ou total.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Mode de paiement *</label>
                <select 
                  value={payMode} 
                  onChange={(e) => setPayMode(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="Wave">Wave</option>
                  <option value="Virement">Virement bancaire</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 text-sm font-semibold"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={paying}
                  className="px-5 py-2 bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition"
                >
                  {paying ? "Enregistrement..." : "Enregistrer le paiement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedResForHistory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl border border-gold-500/20 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="text-gold-400" size={20} />
                Historique des paiements - {selectedResForHistory.reference}
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-slate-300 grid grid-cols-2 gap-4 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <div>Client : <span className="font-semibold text-white block">{selectedResForHistory.customer_name}</span></div>
                <div>Habit : <span className="font-semibold text-white block">{selectedResForHistory.model_name}</span></div>
                <div>Montant total : <span className="font-semibold text-slate-200 block">{formatFCFA(parseFloat(selectedResForHistory.montant_verse) + parseFloat(selectedResForHistory.montant_restant))}</span></div>
                <div>Reste à payer : <span className="font-semibold text-rose-400 block">{formatFCFA(selectedResForHistory.montant_restant)}</span></div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Versements enregistrés</h4>
                {!selectedResForHistory.payments || selectedResForHistory.payments.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-800 rounded-lg">
                    Aucun paiement enregistré pour cette réservation.
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-[10px] uppercase text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-2">Date / Heure</th>
                          <th className="px-4 py-2 text-right">Montant</th>
                          <th className="px-4 py-2">Mode</th>
                          <th className="px-4 py-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {selectedResForHistory.payments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-800/20">
                            <td className="px-4 py-2 text-slate-400">
                              {new Date(p.date_paiement).toLocaleString('fr-FR', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
                            </td>
                            <td className="px-4 py-2 text-right text-emerald-400 font-bold">
                              {formatFCFA(p.montant)}
                            </td>
                            <td className="px-4 py-2 text-slate-300">
                              {p.mode_paiement}
                            </td>
                            <td className="px-4 py-2 text-slate-500 italic max-w-[120px] truncate" title={p.notes}>
                              {p.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button 
                type="button" 
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-sm transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reservations;
