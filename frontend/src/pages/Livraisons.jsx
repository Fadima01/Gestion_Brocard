import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  Truck, Search, CheckCircle2, AlertCircle, Edit2, Calendar, 
  DollarSign, User, Info, Check, X, CreditCard, Clipboard 
} from 'lucide-react';

const Livraisons = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal / Form state
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form fields
  const [statutLivraison, setStatutLivraison] = useState('PREPARATION');
  const [adresseLivraison, setAdresseLivraison] = useState('');
  const [livreurNom, setLivreurNom] = useState('');
  const [livreurPrenom, setLivreurPrenom] = useState('');
  const [livreurTelephone, setLivreurTelephone] = useState('');
  const [fraisLivraison, setFraisLivraison] = useState('0');
  const [observations, setObservations] = useState('');
  const [montantEncaisseLivreur, setMontantEncaisseLivreur] = useState('0');
  const [modePaiementRecu, setModePaiementRecu] = useState('Espèces');
  const [argentRemisABrocard, setArgentRemisABrocard] = useState(false);
  const [montantRemis, setMontantRemis] = useState('0');
  const [dateRemiseArgent, setDateRemiseArgent] = useState('');

  const paymentModes = [
    'Espèces',
    'Orange Money',
    'Moov Money',
    'Virement bancaire',
    'Paiement mixte'
  ];

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/livraisons/?search=${search}`);
      setDeliveries(response.data.results || response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des livraisons :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [search]);

  const handleOpenEdit = (d) => {
    setSelectedDelivery(d);
    setStatutLivraison(d.statut_livraison);
    setAdresseLivraison(d.adresse_livraison);
    setLivreurNom(d.livreur_nom || '');
    setLivreurPrenom(d.livreur_prenom || '');
    setLivreurTelephone(d.livreur_telephone || '');
    setFraisLivraison(String(parseFloat(d.frais_livraison) || 0));
    setObservations(d.observations || '');
    setMontantEncaisseLivreur(String(parseFloat(d.montant_encaisse_livreur) || 0));
    setModePaiementRecu(d.mode_paiement_recu || 'Espèces');
    setArgentRemisABrocard(d.argent_remis_a_brocard || false);
    setMontantRemis(String(parseFloat(d.montant_remis) || 0));
    
    if (d.date_remise_argent) {
      setDateRemiseArgent(d.date_remise_argent.split('T')[0]);
    } else {
      setDateRemiseArgent(new Date().toISOString().split('T')[0]);
    }
    
    setError(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!adresseLivraison.trim()) {
      setError("L'adresse de livraison est requise.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        statut_livraison: statutLivraison,
        adresse_livraison: adresseLivraison,
        livreur_nom: livreurNom,
        livreur_prenom: livreurPrenom,
        livreur_telephone: livreurTelephone,
        frais_livraison: parseFloat(fraisLivraison) || 0,
        observations: observations,
        montant_encaisse_livreur: parseFloat(montantEncaisseLivreur) || 0,
        mode_paiement_recu: modePaiementRecu,
        argent_remis_a_brocard: argentRemisABrocard,
        montant_remis: parseFloat(montantRemis) || 0,
        date_remise_argent: argentRemisABrocard ? (dateRemiseArgent ? new Date(dateRemiseArgent).toISOString() : new Date().toISOString()) : null
      };

      await api.patch(`/livraisons/${selectedDelivery.id}/`, payload);
      
      setSuccess("Livraison mise à jour avec succès.");
      setShowEditModal(false);
      setSelectedDelivery(null);
      fetchDeliveries();
      
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.detail || "Erreur lors de la mise à jour de la livraison.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatFCFA = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('fr-FR') + ' F';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
      case 'SHIPPING':
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/25';
      case 'RETURNED':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/25';
      case 'PREPARATION':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
      default:
        return 'bg-slate-800 text-slate-400 border border-slate-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PREPARATION': return 'En préparation';
      case 'SHIPPING': return 'En cours d\'expédition';
      case 'DELIVERED': return 'Livré';
      case 'RETURNED': return 'Retourné / Échec';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Suivi des Livraisons</h1>
        <p className="text-sm text-slate-400 mt-1">
          Suivez les expéditions de commandes et contrôlez les encaissements perçus par les livreurs
        </p>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Filter and search bar */}
      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 w-full max-w-md">
        <Search size={18} className="text-slate-500 mr-2" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par livreur, commande, adresse..."
          className="bg-transparent border-none outline-none w-full text-white placeholder-slate-500 text-sm"
        />
      </div>

      {/* Deliveries table */}
      {loading && !showEditModal ? (
        <div className="text-center py-16 text-gold-500 font-semibold animate-pulse">
          Chargement de la logistique...
        </div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
          Aucune livraison planifiée trouvée.
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Commande</th>
                  <th className="px-6 py-4">Livreur</th>
                  <th className="px-6 py-4">Destination</th>
                  <th className="px-6 py-4 text-right">Frais</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4 text-center">Encaissement</th>
                  <th className="px-6 py-4 text-center">Remis ?</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/20 transition-all text-xs">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gold-500">{d.order_reference || `ID: ${d.order}`}</div>
                      <div className="text-slate-500 text-[10px]">{d.customer_name || 'Client inconnu'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {d.livreur_nom ? (
                        <div>
                          <div className="font-semibold text-slate-200">{d.livreur_prenom} {d.livreur_nom}</div>
                          {d.livreur_telephone && <div className="text-slate-500 text-[10px] font-mono">{d.livreur_telephone}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Non désigné</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 max-w-xs truncate" title={d.adresse_livraison}>
                      {d.adresse_livraison}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-300">
                      {formatFCFA(d.frais_livraison)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(d.statut_livraison)}`}>
                        {getStatusLabel(d.statut_livraison)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {parseFloat(d.montant_encaisse_livreur) > 0 ? (
                        <div>
                          <div className="font-bold text-emerald-400 font-mono">{formatFCFA(d.montant_encaisse_livreur)}</div>
                          <div className="text-[10px] text-slate-500">{d.mode_paiement_recu}</div>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold ${
                        d.argent_remis_a_brocard 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`} title={d.argent_remis_a_brocard ? `Remis le ${new Date(d.date_remise_argent).toLocaleDateString()}` : "En attente"}>
                        {d.argent_remis_a_brocard ? "✓" : "✗"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleOpenEdit(d)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-all border border-slate-750"
                        title="Détails & Mettre à jour"
                      >
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Delivery Dialog / Modal */}
      {showEditModal && selectedDelivery && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-card max-w-2xl w-full border border-slate-800 bg-slate-950 rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck size={20} className="text-gold-400" />
                <div>
                  <h3 className="text-white font-bold text-lg">Mise à jour livraison - Commande {selectedDelivery.order_reference}</h3>
                  <p className="text-xs text-slate-500">Client : {selectedDelivery.customer_name} ({selectedDelivery.customer_phone})</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowEditModal(false); setSelectedDelivery(null); }}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-5">
              
              {/* Delivery info & Rider */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gold-400 flex items-center gap-1">
                  <User size={12} /> Logistique & Coursier
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Prénom Livreur</label>
                    <input 
                      type="text"
                      placeholder="Ex: Amadou"
                      value={livreurPrenom}
                      onChange={(e) => setLivreurPrenom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:border-gold-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nom Livreur</label>
                    <input 
                      type="text"
                      placeholder="Ex: Diallo"
                      value={livreurNom}
                      onChange={(e) => setLivreurNom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:border-gold-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Téléphone Livreur</label>
                    <input 
                      type="text"
                      placeholder="Ex: 77 123 45 67"
                      value={livreurTelephone}
                      onChange={(e) => setLivreurTelephone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:border-gold-500 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Adresse de livraison</label>
                    <input 
                      type="text"
                      value={adresseLivraison}
                      onChange={(e) => setAdresseLivraison(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:border-gold-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Frais de livraison</label>
                    <input 
                      type="number"
                      value={fraisLivraison}
                      onChange={(e) => setFraisLivraison(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:border-gold-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status & Observations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-800/80 pt-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Statut Livraison</label>
                  <select
                    value={statutLivraison}
                    onChange={(e) => setStatutLivraison(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:border-gold-500 outline-none"
                  >
                    <option value="PREPARATION">En préparation</option>
                    <option value="SHIPPING">Expédié / En cours</option>
                    <option value="DELIVERED">Livré</option>
                    <option value="RETURNED">Retourné / Échec</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Observations / Notes</label>
                  <input 
                    type="text"
                    placeholder="Ex: Colis déposé chez le voisin..."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:border-gold-500 outline-none"
                  />
                </div>
              </div>

              {/* Rider Cash Collection */}
              <div className="space-y-3 border-t border-slate-800/80 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gold-400 flex items-center gap-1">
                  <DollarSign size={12} /> Encaissement Livreur
                </h4>
                
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 text-xs space-y-1.5 text-slate-400 mb-2">
                  <div className="flex justify-between">
                    <span>Total Commande :</span>
                    <span className="font-semibold text-slate-200">{formatFCFA(selectedDelivery.order_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Statut Paiement Commande :</span>
                    <span className={`font-bold uppercase text-[9px] ${
                      selectedDelivery.order_payment_status === 'PAID' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>{selectedDelivery.order_payment_status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Montant encaissé par le livreur (FCFA)
                    </label>
                    <input 
                      type="number"
                      value={montantEncaisseLivreur}
                      onChange={(e) => setMontantEncaisseLivreur(e.target.value)}
                      placeholder="Ex: 35000"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:border-gold-500 outline-none font-bold"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Mode de paiement reçu
                    </label>
                    <select
                      value={modePaiementRecu}
                      onChange={(e) => setModePaiementRecu(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:border-gold-500 outline-none"
                    >
                      {paymentModes.map(mode => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Remittance to Brocard */}
              <div className="space-y-3 border-t border-slate-800/80 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gold-400 flex items-center gap-1">
                  <Clipboard size={12} /> Remise de l'argent à la Direction
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      id="argentRemis"
                      checked={argentRemisABrocard}
                      onChange={(e) => {
                        setArgentRemisABrocard(e.target.checked);
                        if (e.target.checked && montantRemis === '0') {
                          setMontantRemis(montantEncaisseLivreur);
                        }
                      }}
                      className="h-4.5 w-4.5 text-gold-500 bg-slate-900 border-slate-800 rounded"
                    />
                    <label htmlFor="argentRemis" className="text-xs font-bold text-slate-200 cursor-pointer">
                      Argent remis à Brocard
                    </label>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Montant remis (FCFA)
                    </label>
                    <input 
                      type="number"
                      value={montantRemis}
                      onChange={(e) => setMontantRemis(e.target.value)}
                      disabled={!argentRemisABrocard}
                      className="w-full bg-slate-900 disabled:opacity-50 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:border-gold-500 outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Date de remise de l'argent
                    </label>
                    <input 
                      type="date"
                      value={dateRemiseArgent}
                      onChange={(e) => setDateRemiseArgent(e.target.value)}
                      disabled={!argentRemisABrocard}
                      className="w-full bg-slate-900 disabled:opacity-50 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:border-gold-500 outline-none font-mono"
                    />
                  </div>

                </div>
                
                {argentRemisABrocard && (
                  <p className="text-[10px] text-emerald-400 font-sans italic">
                    ⚠️ Mettre "Argent remis à Brocard" à OUI et enregistrer va valider automatiquement un encaissement de {formatFCFA(montantRemis)} sur la commande.
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedDelivery(null); }}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition text-sm font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gold-600 hover:bg-gold-500 text-slate-950 font-bold rounded-xl transition text-sm shadow-lg shadow-gold-600/15"
                >
                  {submitting ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Livraisons;
