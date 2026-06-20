import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  Plus, Search, ShoppingCart, CreditCard, CheckCircle2, 
  Trash2, X, AlertTriangle, AlertCircle, HelpCircle, Eye
} from 'lucide-react';

const Commandes = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [clothingModels, setClothingModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  
  // Order Form State
  const [customerId, setCustomerId] = useState('');
  const [createCustomerInline, setCreateCustomerInline] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerCity, setNewCustomerCity] = useState('');
  const [newCustomerNeighborhood, setNewCustomerNeighborhood] = useState('');

  const [channel, setChannel] = useState('BOUTIQUE');
  const [items, setItems] = useState([{ modelId: '', quantity: 1, applied_unit_price: '' }]);
  const [livraisonADomicile, setLivraisonADomicile] = useState(false);
  const [livreurNom, setLivreurNom] = useState('');
  const [livreurTelephone, setLivreurTelephone] = useState('');
  const [statutLivraison, setStatutLivraison] = useState('PENDING');

  // Pay Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState('BALANCE');
  const [payMode, setPayMode] = useState('Especes');
  const [payCashAmount, setPayCashAmount] = useState('');
  const [payComplementaryMode, setPayComplementaryMode] = useState('Orange Money');
  const [payNotes, setPayNotes] = useState('');

  const fetchData = async () => {
    try {
      const [orderRes, custRes, modelRes] = await Promise.all([
        api.get(`/ventes/orders/?search=${search}`),
        api.get('/ventes/customers/'),
        api.get('/catalogue/models/')
      ]);
      setOrders(orderRes.data.results || orderRes.data);
      setCustomers(custRes.data.results || custRes.data);
      
      // Filter out archived models for sales selection
      const activeModels = (modelRes.data.results || modelRes.data).filter(m => !m.is_archived);
      setClothingModels(activeModels);
    } catch (err) {
      console.error("Erreur lors de la récupération des données de ventes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  // Order Line dynamic operations
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Auto fill price and look up default variant when model is selected
    if (field === 'modelId') {
      const selectedModel = clothingModels.find(m => m.id === parseInt(value));
      if (selectedModel) {
        newItems[index]['applied_unit_price'] = selectedModel.prix_vente_conseille;
      }
    }
    setItems(newItems);
  };

  const addLineItem = () => {
    setItems([...items, { modelId: '', quantity: 1, applied_unit_price: '' }]);
  };

  const removeLineItem = (index) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      // Check stock for all items
      for (const item of items) {
        if (item.modelId) {
          const modelObj = clothingModels.find(m => m.id === parseInt(item.modelId));
          const stock = modelObj ? modelObj.stock_disponible : 0;
          if ((parseInt(item.quantity) || 0) > stock) {
            throw new Error(`Stock insuffisant pour le modèle "${modelObj?.name}". Seulement ${stock} disponibles.`);
          }
        }
      }

      // Build lines using the default variant ID under the hood
      const lines = items
        .filter(item => item.modelId && item.quantity && item.applied_unit_price)
        .map(item => {
          const modelObj = clothingModels.find(m => m.id === parseInt(item.modelId));
          const defaultVariant = modelObj?.variants?.[0];
          
          if (!defaultVariant) {
            throw new Error(`Le modèle ${modelObj?.name || 'sélectionné'} n'a pas de variante par défaut générée.`);
          }

          return {
            variant: defaultVariant.id,
            quantity: parseInt(item.quantity),
            applied_unit_price: parseFloat(item.applied_unit_price)
          };
        });

      const payload = {
        canal_vente: channel,
        items: lines
      };

      if (createCustomerInline) {
        if (!newCustomerName || !newCustomerPhone) {
          throw new Error("Le nom complet et le téléphone du nouveau client sont requis.");
        }
        payload.customer_data = {
          nom: newCustomerName,
          telephone: newCustomerPhone,
          ville: newCustomerCity,
          quartier: newCustomerNeighborhood
        };
      } else {
        if (!customerId) {
          throw new Error("Veuillez sélectionner un client.");
        }
        payload.customer = parseInt(customerId);
      }

      if (livraisonADomicile) {
        payload.livraison_a_domicile = true;
        const destQuartier = createCustomerInline 
          ? newCustomerNeighborhood 
          : (customers.find(c => c.id === parseInt(customerId))?.quartier || '');
        payload.adresse_livraison = destQuartier;
        payload.livreur_nom = livreurNom;
        payload.livreur_telephone = livreurTelephone;
        payload.statut_livraison = statutLivraison;
      }

      await api.post('/ventes/orders/', payload);

      // Clear Form
      setCustomerId('');
      setCreateCustomerInline(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerCity('');
      setNewCustomerNeighborhood('');
      setChannel('BOUTIQUE');
      setItems([{ modelId: '', quantity: 1, applied_unit_price: '' }]);
      setLivraisonADomicile(false);
      setLivreurNom('');
      setLivreurTelephone('');
      setStatutLivraison('PENDING');
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert("Erreur lors de la création de la commande : " + err.message);
    }
  };

  // Payment registration
  const handleOpenPay = (order) => {
    setSelectedOrder(order);
    setPayAmount(order.reste_a_payer);
    setPayType(parseFloat(order.acompte_verse) === 0 ? 'DEPOSIT' : 'BALANCE');
    setPayMode('Especes');
    setPayCashAmount(order.reste_a_payer);
    setPayComplementaryMode('Orange Money');
    setShowPayModal(true);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    try {
      if (payMode === 'Paiement mixte') {
        const cashAmt = parseFloat(payCashAmount) || 0;
        const otherAmt = parseFloat(payAmount) - cashAmt;
        
        if (cashAmt <= 0 || otherAmt <= 0) {
          alert("Pour un paiement mixte, les deux montants doivent être supérieurs à 0.");
          return;
        }

        await api.post(`/ventes/orders/${selectedOrder.id}/pay/`, {
          payment_mode: 'Mixte',
          payment_type: payType,
          notes: payNotes,
          payment_splits: [
            { mode: 'Especes', amount: cashAmt },
            { mode: payComplementaryMode, amount: otherAmt }
          ]
        });
      } else {
        await api.post(`/ventes/orders/${selectedOrder.id}/pay/`, {
          amount: parseFloat(payAmount),
          payment_type: payType,
          payment_mode: payMode,
          notes: payNotes
        });
      }
      setShowPayModal(false);
      setSelectedOrder(null);
      setPayAmount('');
      setPayNotes('');
      fetchData();
    } catch (err) {
      alert("Erreur lors de l'encaissement : " + (err.response?.data?.error || err.message));
    }
  };

  // Logical cancellation
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette commande ? Cette opération libérera les stocks réservés.")) return;
    try {
      await api.patch(`/ventes/orders/${orderId}/`, {
        statut_commande: 'CANCELLED'
      });
      fetchData();
    } catch (err) {
      alert("Erreur lors de l'annulation de la vente.");
    }
  };

  const formatFCFA = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('fr-FR') + ' FCFA';
  };

  const getOrderStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'VALIDATED': return 'bg-sky-500/15 text-sky-400 border border-sky-500/30';
      case 'SHIPPING': return 'bg-orange-500/15 text-orange-400 border border-orange-500/30';
      case 'DRAFT': return 'bg-slate-800 text-slate-400 border border-slate-700';
      case 'CANCELLED': return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      case 'RETURNED': return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
      default: return 'bg-slate-800 text-slate-300';
    }
  };

  const getOrderStatusLabel = (status) => {
    switch (status) {
      case 'DRAFT': return 'Brouillon';
      case 'VALIDATED': return 'Validée';
      case 'SHIPPING': return 'En livraison';
      case 'DELIVERED': return 'Livrée';
      case 'CANCELLED': return 'Annulée';
      case 'RETURNED': return 'Retournée';
      default: return status;
    }
  };

  const hasAnyStockError = items.some(item => {
    if (!item.modelId) return false;
    const modelObj = clothingModels.find(m => m.id === parseInt(item.modelId));
    const stock = modelObj ? modelObj.stock_disponible : 0;
    return (parseInt(item.quantity) || 0) > stock;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Suivi Brocard • Ventes</h1>
          <p className="text-sm text-slate-400 mt-1">Facturation boutique client, acomptes de commande et règlements</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-white font-semibold rounded-lg shadow-lg shadow-gold-600/10 hover:shadow-gold-500/20 transition-all duration-200 text-sm"
        >
          <Plus size={18} />
          Saisir une vente / commande
        </button>
      </div>

      {/* New Order Form */}
      {showForm && (
        <div className="glass-card p-6 rounded-2xl border border-gold-500/20 space-y-4 animate-fadeIn">
          <h2 className="text-lg font-bold text-white">Saisir une nouvelle commande</h2>
          
          <form onSubmit={handleCreateOrder} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="sm:col-span-2 glass-card p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Client de la vente</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="createCustomerInline"
                      checked={createCustomerInline}
                      onChange={(e) => setCreateCustomerInline(e.target.checked)}
                      className="h-4 w-4 text-gold-500 bg-slate-900 border-slate-800 rounded"
                    />
                    <label htmlFor="createCustomerInline" className="text-xs font-semibold text-slate-300 cursor-pointer">
                      Nouveau client ? (Saisie directe)
                    </label>
                  </div>
                </div>

                {!createCustomerInline ? (
                  <div>
                    <select 
                      value={customerId} 
                      onChange={(e) => setCustomerId(e.target.value)}
                      required={!createCustomerInline}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                    >
                      <option value="">-- Choisissez le client --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.telephone}) {c.quartier ? `[${c.quartier}]` : ''}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Nom complet du client</label>
                      <input 
                        type="text" 
                        required={createCustomerInline}
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder="Ex: Fatou Diop"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Téléphone</label>
                      <input 
                        type="text" 
                        required={createCustomerInline}
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        placeholder="Ex: +221771234567"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Ville</label>
                      <input 
                        type="text" 
                        value={newCustomerCity}
                        onChange={(e) => setNewCustomerCity(e.target.value)}
                        placeholder="Ex: Dakar"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Quartier</label>
                      <input 
                        type="text" 
                        value={newCustomerNeighborhood}
                        onChange={(e) => setNewCustomerNeighborhood(e.target.value)}
                        placeholder="Ex: Plateau"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Canal de vente</label>
                <select 
                  value={channel} 
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                >
                  <option value="BOUTIQUE">Achat en Boutique</option>
                  <option value="TIKTOK_LIVE">TikTok Live</option>
                  <option value="TIKTOK">Message TikTok</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="TELEPHONE">Téléphone / Famille</option>
                </select>
                <span className="text-[10px] text-slate-500 block mt-1">Canal utilisé par le client pour passer sa commande.</span>
              </div>

            </div>

            {/* Delivery Option Toggle */}
            <div className="border-t border-slate-800/80 pt-4 space-y-4">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="livraisonADomicile"
                  checked={livraisonADomicile}
                  onChange={(e) => setLivraisonADomicile(e.target.checked)}
                  className="h-4.5 w-4.5 text-gold-500 bg-slate-900 border-slate-800 rounded"
                />
                <label htmlFor="livraisonADomicile" className="text-sm font-semibold text-slate-200 cursor-pointer">
                  Livraison à domicile ?
                </label>
              </div>

              {livraisonADomicile && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn p-4 bg-slate-950/40 border border-slate-850 rounded-2xl">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Quartier du client</label>
                    <input 
                      type="text" 
                      readOnly
                      value={createCustomerInline ? newCustomerNeighborhood : (customers.find(c => c.id === parseInt(customerId))?.quartier || '')}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-400 focus:outline-none text-xs cursor-not-allowed"
                      placeholder="Quartier automatique..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Nom du livreur</label>
                    <input 
                      type="text" 
                      value={livreurNom} 
                      onChange={(e) => setLivreurNom(e.target.value)} 
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-xs"
                      placeholder="Ex: Mamadou"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Téléphone livreur</label>
                    <input 
                      type="text" 
                      value={livreurTelephone} 
                      onChange={(e) => setLivreurTelephone(e.target.value)} 
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-xs"
                      placeholder="Ex: +22177..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Statut livraison</label>
                    <select 
                      value={statutLivraison} 
                      onChange={(e) => setStatutLivraison(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-xs"
                    >
                      <option value="PENDING">En attente</option>
                      <option value="SHIPPING">En cours</option>
                      <option value="DELIVERED">Livrée</option>
                      <option value="DELIVERED_COLLECTED">Livrée et argent remis</option>
                      <option value="RETURNED">Retournée</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Lines */}
            <div className="space-y-4 border-t border-slate-800/80 pt-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Habits achetés</h3>
              
              {items.map((item, idx) => {
                const modelObj = clothingModels.find(m => m.id === parseInt(item.modelId));
                const stock = modelObj ? modelObj.stock_disponible : 0;
                const hasStockError = modelObj && (parseInt(item.quantity) || 0) > stock;
                
                return (
                  <div key={idx} className="space-y-2 p-3 bg-slate-950/20 rounded-xl border border-slate-850">
                    <div className="flex flex-col sm:flex-row gap-4 items-end animate-fadeIn">
                      
                      <div className="flex-1 w-full min-w-0">
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Modèle d'habit</label>
                        <select 
                          value={item.modelId}
                          onChange={(e) => handleItemChange(idx, 'modelId', e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                        >
                          <option value="">-- Sélectionnez le modèle --</option>
                          {clothingModels.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} - ({formatFCFA(m.prix_vente_conseille)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-24">
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Quantité</label>
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none text-xs text-center font-bold"
                        />
                      </div>

                      <div className="w-full sm:w-36">
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Prix unitaire (FCFA)</label>
                        <input 
                          type="number" 
                          value={item.applied_unit_price}
                          onChange={(e) => handleItemChange(idx, 'applied_unit_price', e.target.value)}
                          required
                          min="0"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none text-xs text-right animate-pulseAndHold"
                        />
                      </div>

                      <div className="w-full sm:w-28 text-right font-mono text-slate-400 text-xs pb-2.5">
                        <span className="block text-[9px] uppercase tracking-wider text-slate-500 mb-1">Total Ligne</span>
                        {formatFCFA(item.quantity * (parseFloat(item.applied_unit_price) || 0))}
                      </div>

                      <button 
                        type="button" 
                        disabled={items.length === 1}
                        onClick={() => removeLineItem(idx)}
                        className="h-8 px-3 border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 rounded-xl text-xs disabled:opacity-50"
                      >
                        Retirer
                      </button>

                    </div>
                    
                    {/* Status Info & Error Messages below the line */}
                    {modelObj && (
                      <div className="flex flex-col sm:flex-row justify-between text-xs px-1 pt-1">
                        <span className="text-slate-400 font-medium">
                          Stock disponible : <span className="font-bold text-slate-200">{stock}</span>
                        </span>
                        
                        {hasStockError && (
                          <span className="text-rose-400 font-bold flex items-center gap-1.5 animate-fadeIn">
                            <AlertCircle size={14} /> Stock insuffisant : seulement {stock} disponibles.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <button 
                type="button" 
                onClick={addLineItem}
                className="text-xs font-semibold text-gold-400 hover:text-gold-300 flex items-center gap-1.5 mt-2"
              >
                + Ajouter un autre habit
              </button>

              <div className="flex justify-between items-center bg-slate-950/40 p-4 border border-slate-850 rounded-2xl mt-4 animate-scaleUp">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Grand Total de la commande</span>
                <span className="font-mono font-bold text-lg text-gold-400">
                  {formatFCFA(
                    items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0) * (parseFloat(item.applied_unit_price) || 0), 0)
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-800">
              {hasAnyStockError && (
                <span className="text-xs text-rose-400 font-bold flex items-center gap-1.5">
                  <AlertCircle size={14} /> Impossible de valider : stock insuffisant sur certains articles.
                </span>
              )}
              <div className="flex justify-end gap-3 w-full sm:w-auto ml-auto">
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-sm font-semibold"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={hasAnyStockError}
                  className="px-6 py-2.5 bg-gold-600 hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition"
                >
                  Valider et Enregistrer la commande
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard size={20} className="text-gold-400" />
              Enregistrer un règlement - {selectedOrder.reference}
            </h2>
            <div className="p-3 bg-slate-950 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Total facturé :</span> <span className="font-semibold text-slate-200">{formatFCFA(selectedOrder.montant_total)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Déjà versé :</span> <span className="font-semibold text-emerald-400">{formatFCFA(selectedOrder.acompte_verse)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Reste dû :</span> <span className="font-bold text-rose-400">{formatFCFA(selectedOrder.reste_a_payer)}</span></div>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Montant à encaisser (FCFA)</label>
                <input 
                  type="number"
                  max={selectedOrder.reste_a_payer}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  min="1"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Type de paiement</label>
                  <select 
                    value={payType} 
                    onChange={(e) => setPayType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  >
                    <option value="DEPOSIT">Acompte / Réservation</option>
<option value="BALANCE">Solde de Commande</option>
<option value="FULL">Paiement Initial Complet</option>
</select>
</div>

<div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Moyen de paiement</label>
                  <select 
                    value={payMode} 
                    onChange={(e) => setPayMode(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  >
                    <option value="Especes">Espèces</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Moov Money">Moov Money</option>
                    <option value="Virement bancaire">Virement bancaire</option>
                    <option value="Paiement mixte">Paiement mixte (Split)</option>
                  </select>
                </div>
              </div>

              {payMode === 'Paiement mixte' && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Espèces (FCFA)</label>
                      <input 
                        type="number"
                        max={payAmount}
                        value={payCashAmount}
                        onChange={(e) => setPayCashAmount(e.target.value)}
                        required
                        min="1"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Moyen complémentaire</label>
                      <select 
                        value={payComplementaryMode} 
                        onChange={(e) => setPayComplementaryMode(e.target.value)}
                        className="w-full px-2 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none text-xs"
                      >
                        <option value="Orange Money">Orange Money</option>
                        <option value="Moov Money">Moov Money</option>
                        <option value="Virement bancaire">Virement bancaire</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-900">
                    <span>Complémentaire ({payComplementaryMode}) :</span>
                    <span className="font-bold text-gold-400">
                      {formatFCFA(parseFloat(payAmount) - (parseFloat(payCashAmount) || 0))}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Notes complémentaires</label>
                <textarea 
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  placeholder="Notes sur la transaction (ex: Wave reçu sur numéro boutique)..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowPayModal(false);
                    setSelectedOrder(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-850 text-slate-400 hover:bg-slate-800 text-sm font-semibold"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-gold-600 hover:bg-gold-500 text-white font-semibold rounded-xl text-sm"
                >
                  Enregistrer l'encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and search bar */}
      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 w-full max-w-md">
        <Search size={18} className="text-slate-500 mr-2" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par référence ou client..."
          className="bg-transparent border-none outline-none w-full text-white placeholder-slate-500 text-sm"
        />
      </div>

      {/* Orders List Table */}
      {loading ? (
        <div className="text-center py-10 text-gold-500 animate-pulse font-semibold">Chargement des transactions...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
          Aucune commande enregistrée correspondante.
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Commande</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Canal</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4 text-right">Acompte</th>
                  <th className="px-6 py-4 text-right">Reste dû</th>
                  <th className="px-6 py-4 text-center">Paiement</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/20 transition-all text-xs">
                    <td className="px-6 py-4 font-semibold text-gold-500">{o.reference}</td>
                    <td className="px-6 py-4 text-slate-200">{o.customer_detail?.nom || `Client #${o.customer}`}</td>
                    <td className="px-6 py-4 text-slate-400 font-medium">
                      {o.canal_vente === 'BOUTIQUE' ? 'Boutique' : o.canal_vente}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(o.date_commande).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getOrderStatusBadge(o.statut_commande)}`}>
                        {getOrderStatusLabel(o.statut_commande)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-200">{formatFCFA(o.montant_total)}</td>
                    <td className="px-6 py-4 text-right text-slate-400">{formatFCFA(o.acompte_verse)}</td>
                    <td className="px-6 py-4 text-right font-bold text-rose-400">{formatFCFA(o.reste_a_payer)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        o.statut_paiement === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        o.statut_paiement === 'PARTIALLY_PAID' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {o.statut_paiement === 'PAID' ? 'Réglé' : o.statut_paiement === 'PARTIALLY_PAID' ? 'Acompte' : 'Non payé'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {parseFloat(o.reste_a_payer) > 0 && o.statut_commande !== 'CANCELLED' && (
                          <button 
                            onClick={() => handleOpenPay(o)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-gold-600 hover:text-white rounded-lg font-semibold text-gold-400 border border-slate-700 transition-all"
                          >
                            <CreditCard size={12} />
                            Encaisser
                          </button>
                        )}
                        {o.statut_commande !== 'CANCELLED' && (
                          <button 
                            onClick={() => handleCancelOrder(o.id)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-lg transition-all"
                            title="Annuler la vente"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Commandes;
