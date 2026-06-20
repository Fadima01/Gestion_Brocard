import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  Plus, Hammer, CheckCircle2, CreditCard, Clock, X, Trash2, 
  HelpCircle, AlertCircle, RefreshCw, Eye, Landmark, Calendar, Edit2
} from 'lucide-react';

const Production = () => {
  const [orders, setOrders] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [clothingModels, setClothingModels] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('orders'); // 'orders' or 'workshops'
  const [expandedOrders, setExpandedOrders] = useState({});
  
  const toggleExpandOrder = (id) => {
    setExpandedOrders(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Show Panels / Modals
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showWorkshopForm, setShowWorkshopForm] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null);
  const [editFields, setEditFields] = useState({
    date_debut: '',
    date_fin_prevue: '',
    quantite_demandee: '',
    cout_facon_unitaire: ''
  });

  // New Order Form State
  const [workshopId, setWorkshopId] = useState('');
  const [modelId, setModelId] = useState('');
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [dateFinPrevue, setDateFinPrevue] = useState('');
  const [quantiteDemandee, setQuantiteDemandee] = useState('');
  const [coutFaconUnitaire, setCoutFaconUnitaire] = useState('');
  const [consumedItems, setConsumedItems] = useState([{ raw_material: '', quantite_utilisee: '' }]);

  // Complete Order Modal State
  const [selectedOrderForComplete, setSelectedOrderForComplete] = useState(null);
  const [producedQty, setProducedQty] = useState('');
  const [defectiveQty, setDefectiveQty] = useState('0');

  // Pay Order Modal State
  const [selectedOrderForPay, setSelectedOrderForPay] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Especes');
  const [payNotes, setPayNotes] = useState('');

  // Workshop Form State
  const [editingWorkshop, setEditingWorkshop] = useState(null);
  const [shopName, setShopName] = useState('');
  const [shopResponsable, setShopResponsable] = useState('');
  const [shopTelephone, setShopTelephone] = useState('');
  const [shopAdresse, setShopAdresse] = useState('');
  const [shopVille, setShopVille] = useState('');
  const [shopEstActif, setShopEstActif] = useState(true);

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');

  // Fetch data dependencies
  const fetchData = async () => {
    try {
      const [orderRes, shopRes, modelRes, matRes, catRes] = await Promise.all([
        api.get('/production/orders/'),
        api.get('/production/workshops/'),
        api.get('/catalogue/models/'),
        api.get('/achats/materials/'),
        api.get('/catalogue/categories/')
      ]);
      setOrders(orderRes.data.results || orderRes.data);
      setWorkshops(shopRes.data.results || shopRes.data);
      setClothingModels(modelRes.data.results || modelRes.data);
      setCategories(catRes.data.results || catRes.data);
      // Filter out archived raw materials for selection
      const activeMaterials = (matRes.data.results || matRes.data).filter(m => !m.is_archived);
      setMaterials(activeMaterials);
    } catch (err) {
      console.error("Erreur lors de la récupération des données de confection:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Consumed materials handlers
  const handleAddMaterialItem = () => {
    setConsumedItems([...consumedItems, { raw_material: '', quantite_utilisee: '' }]);
  };

  const handleRemoveMaterialItem = (idx) => {
    const next = [...consumedItems];
    next.splice(idx, 1);
    setConsumedItems(next);
  };

  const handleMaterialItemChange = (idx, field, val) => {
    const next = [...consumedItems];
    next[idx][field] = val;
    setConsumedItems(next);
  };

  // Create order
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      // Filter out empty lines
      const materialsData = consumedItems
        .filter(item => item.raw_material && item.quantite_utilisee)
        .map(item => ({
          raw_material: parseInt(item.raw_material),
          quantite_utilisee: parseFloat(item.quantite_utilisee)
        }));

      await api.post('/production/orders/', {
        workshop: parseInt(workshopId),
        category: parseInt(categoryId),
        date_debut: dateDebut,
        date_fin_prevue: dateFinPrevue,
        quantite_demandee: parseInt(quantiteDemandee),
        cout_facon_unitaire: parseFloat(coutFaconUnitaire),
        materials_data: materialsData
      });

      // Reset Form
      setWorkshopId('');
      setCategoryId('');
      setDateDebut(new Date().toISOString().split('T')[0]);
      setDateFinPrevue('');
      setQuantiteDemandee('');
      setCoutFaconUnitaire('');
      setConsumedItems([{ raw_material: '', quantite_utilisee: '' }]);
      setShowOrderForm(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Erreur lors du lancement de la confection.");
    }
  };

  // Complete Order
  const handleOpenComplete = (order) => {
    setSelectedOrderForComplete(order);
    setProducedQty(order.quantite_demandee - order.quantite_produite);
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        produced_quantity: parseInt(producedQty),
        location: "Magasin"
      };
      if (selectedOrderForComplete.default_variant_id) {
        payload.variant_id = selectedOrderForComplete.default_variant_id;
      }
      await api.post(`/production/orders/${selectedOrderForComplete.id}/complete/`, payload);
      setShowCompleteModal(false);
      setSelectedOrderForComplete(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Erreur lors de la validation de clôture.");
    }
  };

  // Pay Workshop
  const handleOpenPay = (order) => {
    setSelectedOrderForPay(order);
    setPayAmount(order.montant_facon_total - order.montant_facon_paye);
    setShowPayModal(true);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/production/orders/${selectedOrderForPay.id}/pay/`, {
        amount: parseFloat(payAmount),
        payment_mode: payMode,
        notes: payNotes
      });
      setShowPayModal(false);
      setSelectedOrderForPay(null);
      setPayNotes('');
      fetchData();
    } catch (err) {
      alert("Erreur lors de l'enregistrement du paiement.");
    }
  };

  // Cancel fabrication order (logical delete)
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cet ordre de production ? Les matières consommées ne seront pas réintégrées automatiquement.")) return;
    try {
      await api.patch(`/production/orders/${orderId}/`, {
        statut: 'CANCELLED'
      });
      fetchData();
    } catch (err) {
      alert("Erreur lors de l'annulation de la confection.");
    }
  };

  const handleOpenEdit = (order) => {
    setSelectedOrderForEdit(order);
    setEditFields({
      date_debut: order.date_debut,
      date_fin_prevue: order.date_fin_prevue,
      quantite_demandee: order.quantite_demandee,
      cout_facon_unitaire: order.cout_facon_unitaire
    });
    setShowEditOrderModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/production/orders/${selectedOrderForEdit.id}/`, {
        date_debut: editFields.date_debut,
        date_fin_prevue: editFields.date_fin_prevue,
        quantite_demandee: parseInt(editFields.quantite_demandee),
        cout_facon_unitaire: parseFloat(editFields.cout_facon_unitaire)
      });
      setShowEditOrderModal(false);
      setSelectedOrderForEdit(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Erreur lors de la modification de la confection.");
    }
  };

  const handleMarkInProgress = async (orderId) => {
    try {
      await api.patch(`/production/orders/${orderId}/`, {
        statut: 'IN_PROGRESS'
      });
      fetchData();
    } catch (err) {
      alert("Erreur lors du passage de la confection en cours.");
    }
  };

  // Workshop Add/Edit handlers
  const handleEditWorkshopClick = (w) => {
    setEditingWorkshop(w);
    setShopName(w.name);
    setShopResponsable(w.responsable);
    setShopTelephone(w.telephone);
    setShopAdresse(w.adresse);
    setShopVille(w.ville);
    setShopEstActif(w.est_actif);
    setShowWorkshopForm(true);
  };

  const handleCreateWorkshopClick = () => {
    setEditingWorkshop(null);
    setShopName('');
    setShopResponsable('');
    setShopTelephone('');
    setShopAdresse('');
    setShopVille('');
    setShopEstActif(true);
    setShowWorkshopForm(true);
  };

  const handleWorkshopSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: shopName,
      responsable: shopResponsable,
      telephone: shopTelephone,
      adresse: shopAdresse,
      ville: shopVille,
      est_actif: shopEstActif
    };

    try {
      if (editingWorkshop) {
        await api.patch(`/production/workshops/${editingWorkshop.id}/`, payload);
      } else {
        await api.post('/production/workshops/', payload);
      }
      setShowWorkshopForm(false);
      setEditingWorkshop(null);
      fetchData();
    } catch (err) {
      alert("Erreur lors de l'enregistrement de l'atelier.");
    }
  };

  const handleToggleWorkshopStatus = async (wId, currentStatus) => {
    try {
      await api.patch(`/production/workshops/${wId}/`, {
        est_actif: !currentStatus
      });
      fetchData();
    } catch (err) {
      alert("Erreur lors du changement de statut de l'atelier.");
    }
  };

  const formatFCFA = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('fr-FR') + ' FCFA';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'IN_PROGRESS': return 'bg-orange-500/15 text-orange-400 border border-orange-500/30';
      case 'PARTIAL': return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
      case 'PLANNED': return 'bg-sky-500/15 text-sky-400 border border-sky-500/30';
      case 'CANCELLED': return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      default: return 'bg-slate-800 text-slate-400 border border-slate-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PLANNED': return 'Planifiée';
      case 'IN_PROGRESS': return 'En cours';
      case 'PARTIAL': return 'Réception partielle';
      case 'COMPLETED': return 'Terminée';
      case 'CANCELLED': return 'Annulée';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Suivi Confection Ateliers</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gérez la confection des vêtements confiés aux ateliers de couture sous-traitants.
          </p>
        </div>
        {tab === 'orders' ? (
          <button 
            onClick={() => setShowOrderForm(!showOrderForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-white font-semibold rounded-lg shadow-lg shadow-gold-600/10 hover:shadow-gold-500/20 transition-all duration-200 text-sm"
          >
            <Plus size={18} />
            Lancer une confection
          </button>
        ) : (
          <button 
            onClick={handleCreateWorkshopClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-white font-semibold rounded-lg shadow-lg shadow-gold-600/10 hover:shadow-gold-500/20 transition-all duration-200 text-sm"
          >
            <Plus size={18} />
            Enregistrer un nouvel atelier
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button 
          onClick={() => setTab('orders')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${tab === 'orders' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Lots de Confection (OC)
        </button>
        <button 
          onClick={() => setTab('workshops')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${tab === 'workshops' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Ateliers & Couturiers
        </button>
      </div>

      {/* TAB 1: FABRICATION ORDERS */}
      {tab === 'orders' && (
        <div className="space-y-6">
          
          {/* Order creation form */}
          {showOrderForm && (
            <div className="glass-card p-6 rounded-2xl border border-gold-500/20 animate-fadeIn">
              <h2 className="text-lg font-bold text-white mb-4">Lancer une confection</h2>
              
              <form onSubmit={handleCreateOrder} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Sélectionner l'atelier</label>
                    <select 
                      value={workshopId} 
                      onChange={(e) => setWorkshopId(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                    >
                      <option value="">-- Choisissez l'atelier --</option>
                      {workshops.filter(w => w.est_actif).map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.responsable})</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-500 block mt-1">L'atelier de couture qui assemblera les vêtements.</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Catégorie de robe à confectionner</label>
                    <select 
                      value={categoryId} 
                      onChange={(e) => setCategoryId(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                    >
                      <option value="">-- Choisissez la catégorie --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          Catégorie {parseInt(c.prix).toLocaleString('fr-FR')} FCFA
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-500 block mt-1">La catégorie tarifaire de robes cousues.</span>
                  </div>                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Quantité demandée (nombre d'habits)</label>
                    <input 
                      type="number" 
                      value={quantiteDemandee}
                      onChange={(e) => setQuantiteDemandee(e.target.value)}
                      required
                      min="1"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      placeholder="Ex: 50"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">Le nombre d'habits à confectionner par l'atelier.</span>
                  </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Coût de façon unitaire (FCFA)</label>
                    <input 
                      type="number" 
                      value={coutFaconUnitaire}
                      onChange={(e) => setCoutFaconUnitaire(e.target.value)}
                      required
                      min="0"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      placeholder="Ex: 5000"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">Prix de la main d'œuvre payé à l'atelier par habit réussi.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Date de début</label>
                    <input 
                      type="date" 
                      value={dateDebut}
                      onChange={(e) => setDateDebut(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">Date d'envoi du tissu à l'atelier.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Date de livraison prévue</label>
                    <input 
                      type="date" 
                      value={dateFinPrevue}
                      onChange={(e) => setDateFinPrevue(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">Date limite de livraison par le couturier.</span>
                  </div>

                </div>

                {/* Raw materials consumed list */}
                <div className="space-y-4 border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm">Matières premières à retirer du stock</h3>
                      <p className="text-[10px] text-slate-500">Sélectionnez les tissus/boutons prélevés pour cette confection.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={handleAddMaterialItem}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-gold-400 font-semibold rounded-xl text-xs flex items-center gap-1 transition-all"
                    >
                      + Ajouter une matière
                    </button>
                  </div>

                  <div className="space-y-3">
                    {consumedItems.map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                        <div className="flex-1 w-full">
                          <select 
                            value={item.raw_material} 
                            onChange={(e) => handleMaterialItemChange(idx, 'raw_material', e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                          >
                            <option value="">-- Choisissez la matière --</option>
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.type_matiere} {m.couleur ? `(${m.couleur})` : ''} - (Dispo: {m.quantite_restante_metres}m)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-full sm:w-48">
                          <input 
                            type="number" 
                            step="0.01"
                            value={item.quantite_utilisee} 
                            onChange={(e) => handleMaterialItemChange(idx, 'quantite_utilisee', e.target.value)}
                            required
                            min="0.01"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                            placeholder="Mètres consommés"
                          />
                        </div>
                        <button 
                          type="button"
                          disabled={consumedItems.length === 1}
                          onClick={() => handleRemoveMaterialItem(idx)}
                          className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => setShowOrderForm(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-sm font-semibold"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-gold-600 hover:bg-gold-500 text-white font-semibold rounded-xl text-sm"
                  >
                    Valider et lancer la confection
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Production Orders */}
          {loading ? (
            <div className="text-center py-10 text-gold-500 animate-pulse font-semibold">Chargement des confections...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              Aucune confection en cours ou terminée.
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Réf (OC)</th>
                      <th className="px-6 py-4">Catégorie</th>
                      <th className="px-6 py-4">Atelier</th>
                      <th className="px-6 py-4 text-center">Dates</th>
                      <th className="px-6 py-4 text-center">Robes</th>
                      <th className="px-6 py-4 text-right">Détails Financiers</th>
                      <th className="px-6 py-4 text-center">Statut</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {orders.map((o) => {
                      const remaining = parseFloat(o.montant_facon_total) - parseFloat(o.montant_facon_paye);
                      return (
                        <React.Fragment key={o.id}>
                          <tr className="hover:bg-slate-800/20 transition-all text-xs group border-b border-slate-800/50">
                            <td className="px-6 py-4 font-semibold text-gold-500">
                              <button 
                                type="button"
                                onClick={() => toggleExpandOrder(o.id)}
                                className="flex items-center gap-1 text-gold-500 hover:text-gold-400 font-semibold focus:outline-none"
                              >
                                <Hammer size={14} />
                                {o.reference}
                                <Eye size={12} className="text-slate-500 group-hover:text-slate-400 ml-0.5" />
                              </button>
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-200">{o.category_name || o.model_name || 'Sans catégorie'}</td>
                            <td className="px-6 py-4 text-slate-300">{o.workshop_name || `Atelier #${o.workshop}`}</td>
                            <td className="px-6 py-4 text-center text-slate-400">
                              Du {new Date(o.date_debut).toLocaleDateString('fr-FR')} au {new Date(o.date_fin_prevue).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="space-y-1 text-center">
                                <span className="font-semibold text-slate-400 block">Demandées : {o.quantite_demandee}</span>
                                {o.quantite_produite > 0 && (
                                  <span className="text-emerald-400 font-bold block">✓ {o.quantite_produite} reçues</span>
                                )}
                                {o.statut === 'PARTIAL' && (
                                  <span className="text-blue-400 font-bold block">→ Reste : {o.quantite_demandee - o.quantite_produite}</span>
                                )}
                                {o.statut === 'COMPLETED' && o.quantite_demandee - o.quantite_produite > 0 && (
                                  <span className="text-amber-500 font-bold block">⚠ {o.quantite_demandee - o.quantite_produite} manquantes</span>
                                )}
                                {o.statut === 'CANCELLED' && o.quantite_demandee - o.quantite_produite > 0 && (
                                  <span className="text-rose-500/70 line-through block">Reliquat annulé : {o.quantite_demandee - o.quantite_produite}</span>
                                )}
                                {o.statut === 'PLANNED' && (
                                  <span className="text-sky-400 block font-semibold">Planifiée</span>
                                )}
                                {o.statut === 'IN_PROGRESS' && o.quantite_produite === 0 && (
                                  <span className="text-orange-400 block font-semibold">En cours</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="space-y-1 text-right font-sans text-slate-400 leading-tight">
                                <p>Prévu : <span className="text-slate-300 font-mono">{formatFCFA(o.quantite_demandee * o.cout_facon_unitaire)}</span></p>
                                <p>Dû : <span className="text-slate-200 font-mono font-bold">{formatFCFA(o.montant_facon_total)}</span></p>
                                <p>Payé : <span className="text-emerald-400 font-mono">{formatFCFA(o.montant_facon_paye)}</span></p>
                                <p className="font-semibold text-rose-400">Reste : <span className="font-mono">{formatFCFA(remaining)}</span></p>
                                <div className="pt-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    o.statut_paiement_facon === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                    o.statut_paiement_facon === 'PARTIALLY_PAID' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}>
                                    {o.statut_paiement_facon === 'PAID' ? 'Payé' : o.statut_paiement_facon === 'PARTIALLY_PAID' ? 'Acompte' : 'Non payé'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(o.statut)}`}>
                                {getStatusLabel(o.statut)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {o.statut !== 'CANCELLED' && (
                                  <button 
                                    onClick={() => handleOpenEdit(o)}
                                    className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold transition-all border border-slate-750"
                                  >
                                    Modifier
                                  </button>
                                )}
                                {o.statut === 'PLANNED' && (
                                  <button 
                                    onClick={() => handleMarkInProgress(o.id)}
                                    className="px-2 py-1.5 bg-amber-600/90 hover:bg-amber-500 text-white rounded-lg text-[10px] font-semibold transition-all"
                                  >
                                    Mettre en cours
                                  </button>
                                )}
                                {(o.statut === 'IN_PROGRESS' || o.statut === 'PARTIAL') && (
                                  <button 
                                    onClick={() => handleOpenComplete(o)}
                                    className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-semibold transition-all"
                                  >
                                    Réceptionner
                                  </button>
                                )}
                                {o.statut !== 'CANCELLED' && (
                                  <button 
                                    onClick={() => handleOpenPay(o)}
                                    className="px-2 py-1.5 bg-slate-800 hover:bg-gold-600 hover:text-slate-950 text-gold-400 rounded-lg text-[10px] font-semibold transition-all border border-slate-750"
                                  >
                                    Payer
                                  </button>
                                )}
                                {o.statut !== 'COMPLETED' && o.statut !== 'CANCELLED' && (
                                  <button 
                                    onClick={() => handleCancelOrder(o.id)}
                                    className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-lg transition-all"
                                    title="Annuler la confection"
                                  >
                                    Annuler
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expandedOrders[o.id] && (
                            <tr className="bg-slate-950/40">
                              <td colSpan={8} className="px-6 py-4 border-t border-b border-slate-850">
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                      <Clock size={12} />
                                      Historique des Réceptions ({o.receipts ? o.receipts.length : 0})
                                    </h4>
                                    {o.receipts && o.receipts.length > 0 ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {o.receipts.map((r) => (
                                          <div key={r.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                                            <div>
                                              <p className="font-bold text-white">+{r.quantite_recue} robes reçues</p>
                                              <p className="text-[10px] text-slate-500">Validé par : {r.created_by_name || 'Système'}</p>
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-400">
                                              {new Date(r.date_reception).toLocaleString('fr-FR', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                              })}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-500 italic">Aucune réception enregistrée pour le moment.</p>
                                    )}
                                  </div>
                                  
                                  {o.payments && o.payments.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <Landmark size={12} />
                                        Historique des Paiements de la Façon ({o.payments.length})
                                      </h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {o.payments.map((p) => (
                                          <div key={p.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                                            <div>
                                              <p className="font-bold text-emerald-400">-{formatFCFA(p.montant)}</p>
                                              <p className="text-[10px] text-slate-500">Règlement : {p.mode_paiement}</p>
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-400">
                                              {new Date(p.date_paiement).toLocaleDateString('fr-FR')}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WORKSHOPS LIST */}
      {tab === 'workshops' && (
        <div className="space-y-6">
          {showWorkshopForm && (
            <div className="glass-card p-6 rounded-2xl border border-gold-500/20 animate-fadeIn">
              <h2 className="text-lg font-bold text-white mb-4">
                {editingWorkshop ? `Modifier l'atelier: ${editingWorkshop.name}` : "Enregistrer un nouvel atelier de couture"}
              </h2>
              <form onSubmit={handleWorkshopSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Nom de l'atelier</label>
                    <input 
                      type="text" 
                      value={shopName} 
                      onChange={(e) => setShopName(e.target.value)} 
                      required
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      placeholder="Ex: Atelier Couture Royale"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Nom du responsable</label>
                    <input 
                      type="text" 
                      value={shopResponsable} 
                      onChange={(e) => setShopResponsable(e.target.value)} 
                      required
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      placeholder="Ex: Mme Diop"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Numéro de téléphone</label>
                    <input 
                      type="text" 
                      value={shopTelephone} 
                      onChange={(e) => setShopTelephone(e.target.value)} 
                      required
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      placeholder="Ex: +221 77 123 45 67"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Ville</label>
                      <input 
                        type="text" 
                        value={shopVille} 
                        onChange={(e) => setShopVille(e.target.value)} 
                        required
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                        placeholder="Dakar..."
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <input 
                        type="checkbox" 
                        id="shopEstActif"
                        checked={shopEstActif}
                        onChange={(e) => setShopEstActif(e.target.checked)}
                        className="h-4.5 w-4.5 text-gold-500 bg-slate-900 border-slate-800 rounded"
                      />
                      <label htmlFor="shopEstActif" className="text-sm text-slate-200 cursor-pointer">Actif</label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Adresse</label>
                    <textarea 
                      value={shopAdresse} 
                      onChange={(e) => setShopAdresse(e.target.value)} 
                      rows={2}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      placeholder="Adresse physique de l'atelier..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => { setShowWorkshopForm(false); setEditingWorkshop(null); }}
                      className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-sm font-semibold"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      className="px-6 py-2.5 bg-gold-600 hover:bg-gold-500 text-white font-semibold rounded-xl text-sm"
                    >
                      Enregistrer l'atelier
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {workshops.map((w) => (
              <div key={w.id} className="glass-card p-5 rounded-2xl border border-slate-800/80 space-y-4 hover:border-gold-500/20 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-100 text-md">{w.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${w.est_actif ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {w.est_actif ? 'Actif' : 'Désactivé'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1.5 font-sans leading-relaxed">
                  <p><span className="text-slate-500">Couturier responsable :</span> {w.responsable}</p>
                  <p><span className="text-slate-500">Téléphone :</span> {w.telephone}</p>
                  <p><span className="text-slate-500">Ville :</span> {w.ville}</p>
                  {w.adresse && <p><span className="text-slate-500">Adresse :</span> {w.adresse}</p>}
                </div>
                
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/40">
                  <button 
                    onClick={() => handleEditWorkshopClick(w)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-semibold transition-all"
                  >
                    <Edit2 size={10} />
                    Modifier
                  </button>
                  <button 
                    onClick={() => handleToggleWorkshopStatus(w.id, w.est_actif)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${w.est_actif ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/25' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/25'}`}
                  >
                    {w.est_actif ? 'Désactiver' : 'Activer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clôture Order Modal */}
      {showCompleteModal && selectedOrderForComplete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-400" />
              Réceptionner des pièces - {selectedOrderForComplete.reference}
            </h2>
            <p className="text-xs text-slate-400">
              Enregistrez une livraison de pièces effectuée par l'atelier. Les pièces seront injectées en stock boutique automatiquement.
            </p>
            
            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 font-bold text-gold-400">Nombre de robes reçues aujourd'hui</label>
                <input 
                  type="number"
                  value={producedQty}
                  onChange={(e) => setProducedQty(e.target.value)}
                  required
                  min="1"
                  max={selectedOrderForComplete.quantite_demandee - selectedOrderForComplete.quantite_produite}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 text-sm font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Saisissez la quantité livrée lors de cette réception.</span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-slate-550">Demandées</span>
                  <span className="font-bold text-slate-200 text-sm">{selectedOrderForComplete.quantite_demandee}</span>
                </div>
                <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-slate-550">Déjà reçues</span>
                  <span className="font-bold text-emerald-400 text-sm">{selectedOrderForComplete.quantite_produite}</span>
                </div>
                <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-slate-550">Reste attendu</span>
                  <span className="font-bold text-amber-500 text-sm">
                    {selectedOrderForComplete.quantite_demandee - selectedOrderForComplete.quantite_produite}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCompleteModal(false);
                    setSelectedOrderForComplete(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-sm font-semibold"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm"
                >
                  Valider la Réception
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && selectedOrderForPay && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard size={20} className="text-gold-400" />
              Régler la prestation - {selectedOrderForPay.reference}
            </h2>
            <p className="text-xs text-slate-400">
              Enregistrez le versement d'acompte ou de solde payé à l'atelier de couture.
            </p>
            
            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Montant versé (FCFA)</label>
                <input 
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  min="1"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Mode de règlement</label>
                <select 
                  value={payMode} 
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-sm"
                >
                  <option value="Especes">Espèces</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="Moov Money">Moov Money</option>
                  <option value="Virement bancaire">Virement bancaire</option>
                  <option value="Paiement mixte">Paiement mixte</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Notes / Remarques</label>
                <textarea 
                  value={payNotes} 
                  onChange={(e) => setPayNotes(e.target.value)} 
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                  placeholder="Ex: Acompte de démarrage, solde complet..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowPayModal(false);
                    setSelectedOrderForPay(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-sm font-semibold"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-gold-600 hover:bg-gold-500 text-white font-semibold rounded-xl text-sm"
                >
                  Enregistrer le paiement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditOrderModal && selectedOrderForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 animate-fadeIn">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit2 size={20} className="text-gold-400" />
              Modifier la confection - {selectedOrderForEdit.reference}
            </h2>
            <p className="text-xs text-slate-400">
              Modifiez les détails de la confection ci-dessous.
            </p>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Quantité demandée</label>
                <input 
                  type="number"
                  value={editFields.quantite_demandee}
                  onChange={(e) => setEditFields({ ...editFields, quantite_demandee: e.target.value })}
                  required
                  min="1"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Coût de façon unitaire (FCFA)</label>
                <input 
                  type="number"
                  value={editFields.cout_facon_unitaire}
                  onChange={(e) => setEditFields({ ...editFields, cout_facon_unitaire: e.target.value })}
                  required
                  min="0"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Date de début</label>
                <input 
                  type="date"
                  value={editFields.date_debut}
                  onChange={(e) => setEditFields({ ...editFields, date_debut: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Date de livraison prévue</label>
                <input 
                  type="date"
                  value={editFields.date_fin_prevue}
                  onChange={(e) => setEditFields({ ...editFields, date_fin_prevue: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditOrderModal(false);
                    setSelectedOrderForEdit(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-sm font-semibold"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-gold-600 hover:bg-gold-500 text-white font-semibold rounded-xl text-sm"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Production;
