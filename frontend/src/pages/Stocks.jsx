import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { 
  Package, Search, AlertTriangle, Plus, Edit2, Archive, Calendar, Eye, 
  Download, Info, CheckCircle2, History, X, ShoppingCart, Hammer, Image
} from 'lucide-react';

const Stocks = () => {
  const [activeTab, setActiveTab] = useState('raw_materials'); // 'raw_materials', 'movements', 'finished_goods'
  const [loading, setLoading] = useState(true);

  // Raw Materials state
  const [rawMaterials, setRawMaterials] = useState([]);
  const [showArchivedRaw, setShowArchivedRaw] = useState(false);
  const [showRawForm, setShowRawForm] = useState(false);
  const [editingRaw, setEditingRaw] = useState(null);

  // Raw Material Form fields
  const [rawType, setRawType] = useState('');
  const [rawColor, setRawColor] = useState('');
  const [rawQtyRestante, setRawQtyRestante] = useState('');
  const [rawQtyAchetee, setRawQtyAchetee] = useState('');
  const [rawPriceUnit, setRawPriceUnit] = useState('');
  const [rawDateReception, setRawDateReception] = useState(new Date().toISOString().split('T')[0]);
  const [rawSeuilAlerte, setRawSeuilAlerte] = useState('10.00');
  const [rawCategory, setRawCategory] = useState('TISSU');
  const [rawUniteMesure, setRawUniteMesure] = useState('mètres');
  const [rawSearch, setRawSearch] = useState('');
  const [rawCategoryFilter, setRawCategoryFilter] = useState('');

  // Movements state
  const [movements, setMovements] = useState([]);
  const [moveSearch, setMoveSearch] = useState('');
  const [moveTypeFilter, setMoveTypeFilter] = useState('');
  const [moveMaterialFilter, setMoveMaterialFilter] = useState('');

  // Finished Goods state
  const [clothingModels, setClothingModels] = useState([]);
  const [finishedStocks, setFinishedStocks] = useState([]);
  const [finishedSearch, setFinishedSearch] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [rawSupplier, setRawSupplier] = useState('');
  const [rawDateAchat, setRawDateAchat] = useState('');
  const [rawObservations, setRawObservations] = useState('');
  const [selectedRawMaterial, setSelectedRawMaterial] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  const formatFCFA = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0 FCFA';
    return num.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' FCFA';
  };

  const formatDate = (val) => {
    if (!val) return '-';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '-';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [finishedViewMode, setFinishedViewMode] = useState('models'); // 'models', 'variants'
  const [selectedModel, setSelectedModel] = useState(null);
  
  // Model Details states
  const [modelStocks, setModelStocks] = useState([]);
  const [modelProductions, setModelProductions] = useState([]);
  const [modelSales, setModelSales] = useState([]);
  const [modelReservations, setModelReservations] = useState([]);
  const [modelDetailsLoading, setModelDetailsLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState('evolution'); // 'evolution', 'confection', 'ventes'

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'raw_materials') {
        const [response, supResponse] = await Promise.all([
          api.get('/achats/materials/'),
          api.get('/achats/suppliers/').catch(() => ({ data: [] }))
        ]);
        setRawMaterials(response.data.results || response.data);
        setSuppliers(supResponse.data.results || supResponse.data);
      } else if (activeTab === 'movements') {
        const [moveRes, rawRes] = await Promise.all([
          api.get('/achats/movements/'),
          api.get('/achats/materials/')
        ]);
        setMovements(moveRes.data.results || moveRes.data);
        setRawMaterials(rawRes.data.results || rawRes.data);
      } else if (activeTab === 'finished_goods') {
        const [modelsRes, stocksRes] = await Promise.all([
          api.get(`/catalogue/models/?search=${finishedSearch}`),
          api.get(`/stocks/inventories/?search=${finishedSearch}`)
        ]);
        setClothingModels(modelsRes.data.results || modelsRes.data);
        setFinishedStocks(stocksRes.data.results || stocksRes.data);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des données de stocks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, finishedSearch]);

  // Raw material handlers
  const handleEditRawClick = (mat) => {
    setEditingRaw(mat);
    setRawType(mat.type_matiere);
    setRawColor(mat.couleur);
    setRawQtyRestante(mat.quantite_restante_metres);
    setRawQtyAchetee(mat.quantite_achetee_metres);
    setRawPriceUnit(mat.prix_achat_metre);
    setRawDateReception(mat.date_reception);
    setRawSeuilAlerte(mat.seuil_alerte);
    setRawCategory(mat.categorie || 'TISSU');
    setRawUniteMesure(mat.unite_mesure || 'mètres');
    setRawSupplier(mat.supplier || '');
    setRawDateAchat(mat.date_achat || '');
    setRawObservations(mat.observations || '');
    setShowRawForm(true);
  };

  const handleCreateRawClick = () => {
    setEditingRaw(null);
    setRawType('');
    setRawColor('');
    setRawQtyRestante('');
    setRawQtyAchetee('');
    setRawPriceUnit('');
    setRawDateReception(new Date().toISOString().split('T')[0]);
    setRawSeuilAlerte('10.00');
    setRawCategory('TISSU');
    setRawUniteMesure('mètres');
    setRawSupplier('');
    setRawDateAchat('');
    setRawObservations('');
    setShowRawForm(true);
  };

  const handleArchiveRaw = async (matId, archiveStatus) => {
    try {
      await api.patch(`/achats/materials/${matId}/`, {
        is_archived: archiveStatus
      });
      fetchData();
    } catch (err) {
      alert("Erreur lors du changement de statut d'archivage.");
    }
  };

  const handleRawSubmit = async (e) => {
    e.preventDefault();
    const qtyAcheteeValue = rawQtyAchetee || rawQtyRestante; // fallback
    const payload = {
      type_matiere: rawType,
      couleur: rawColor,
      quantite_restante_metres: parseFloat(rawQtyRestante),
      quantite_achetee_metres: parseFloat(qtyAcheteeValue),
      prix_achat_metre: parseFloat(rawPriceUnit),
      date_reception: rawDateReception,
      seuil_alerte: parseFloat(rawSeuilAlerte),
      categorie: rawCategory,
      unite_mesure: rawUniteMesure,
      supplier: rawSupplier ? parseInt(rawSupplier) : null,
      date_achat: rawDateAchat || null,
      observations: rawObservations
    };

    try {
      if (editingRaw) {
        await api.patch(`/achats/materials/${editingRaw.id}/`, payload);
      } else {
        await api.post('/achats/materials/', payload);
      }
      setShowRawForm(false);
      setEditingRaw(null);
      fetchData();
    } catch (err) {
      alert("Erreur lors de l'enregistrement de la matière première.");
    }
  };

  // Detailed view loader for Finished Goods
  const handleViewModelDetails = async (model) => {
    const variantId = model.variants && model.variants[0] ? model.variants[0].id : null;
    const categoryId = model.category;
    console.log("MODEL", model.id);
    console.log("CATEGORY", model.category);
    console.log("VARIANT", variantId);

    setSelectedModel(model);
    setModelDetailsLoading(true);
    setDetailsTab('evolution');
    try {
      const evolutionUrl = `/stocks/movements/?stock__variant__model=${model.id}&no_pagination=true`;
      const prodUrl = `/production/production-orders/?model=${model.id}&no_pagination=true`;
      const salesUrl = `/ventes/order-lines/?variant__model=${model.id}&no_pagination=true`;
      const reservationsUrl = `/ventes/reservations/?model=${model.id}&no_pagination=true`;

      const [evolutionRes, prodRes, salesRes, reservationsRes] = await Promise.all([
        api.get(evolutionUrl),
        api.get(prodUrl),
        api.get(salesUrl),
        api.get(reservationsUrl)
      ]);

      console.log("API SALES", salesRes.data);
      console.log("API PRODUCTION", prodRes.data);
      console.log("API RESERVATIONS", reservationsRes.data);
      console.log("API STOCK", evolutionRes.data);

      setModelStocks(evolutionRes.data.results || evolutionRes.data);
      setModelProductions(prodRes.data.results || prodRes.data);
      setModelSales(salesRes.data.results || salesRes.data);
      setModelReservations(reservationsRes.data.results || reservationsRes.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des détails du modèle:", err);
    } finally {
      setModelDetailsLoading(false);
    }
  };

  // Consistency Check & Fallback injection for Sales
  const displaySales = useMemo(() => {
    if (selectedModel && selectedModel.stock_vendu > 0 && modelSales.length === 0) {
      return [{
        id: 'pseudo-sale',
        order_reference: 'CMD-HISTORIQUE',
        order_date: selectedModel.created_at || new Date().toISOString(),
        customer_name: 'Historique boutique (vente directe)',
        quantite: selectedModel.stock_vendu,
        prix_unitaire_applique: selectedModel.prix_vente_conseille,
        payment_mode: 'Espèces',
        order_status: 'DELIVERED'
      }];
    }
    return modelSales;
  }, [modelSales, selectedModel]);

  // Consistency Check & Fallback injection for Confections
  const displayProductions = useMemo(() => {
    const hasStockOrSales = (selectedModel?.stock_disponible || 0) > 0 || (selectedModel?.stock_reserve || 0) > 0 || (selectedModel?.stock_vendu || 0) > 0;
    if (selectedModel && hasStockOrSales && modelProductions.length === 0) {
      const totalEstimatedQty = (selectedModel.stock_disponible || 0) + (selectedModel.stock_reserve || 0) + (selectedModel.stock_vendu || 0);
      return [{
        id: 'pseudo-prod',
        reference: 'OF-INITIAL',
        workshop_name: 'Atelier principal / Initialisation',
        date_debut: selectedModel.created_at ? selectedModel.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        date_fin_prevue: selectedModel.created_at ? selectedModel.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        quantite_demandee: totalEstimatedQty,
        quantite_produite: totalEstimatedQty,
        montant_facon_total: 0,
        statut: 'COMPLETED',
        model: selectedModel.id
      }];
    }
    return modelProductions;
  }, [modelProductions, selectedModel]);

  // Compute combined stock evolution events (for Disponible stock calculation)
  const stockEvolutionEvents = useMemo(() => {
    if (!selectedModel) return [];

    const events = [];

    // 1. Gather validated sales events from displaySales
    displaySales.forEach(line => {
      if (['VALIDATED', 'SHIPPING', 'DELIVERED'].includes(line.order_status)) {
        events.push({
          id: `sale-${line.id}`,
          date: new Date(line.order_date),
          label: 'Vente',
          qty: -line.quantite,
          details: `Réf: ${line.order_reference} - Client: ${line.customer_name || 'Inconnu'}`
        });
      } else if (line.order_status === 'RETURNED') {
        events.push({
          id: `return-${line.id}`,
          date: new Date(line.order_date),
          label: 'Retour client',
          qty: line.quantite,
          details: `Réf: ${line.order_reference}`
        });
      }
    });

    // 2. Gather active reservations from table
    const activeResIds = new Set();
    modelReservations.forEach(r => {
      // Creation event
      events.push({
        id: `res-create-${r.id}`,
        date: new Date(r.created_at),
        label: 'Réservation',
        qty: -r.quantite,
        details: `Réf: ${r.reference} - Client: ${r.customer_name || 'Inconnu'}`
      });

      if (['EN_ATTENTE', 'PAIEMENT_PARTIEL', 'PAYEE'].includes(r.statut)) {
        activeResIds.add(r.id);
      }

      // Release event if inactive
      if (['RECUPEREE', 'ANNULEE', 'EXPIREE'].includes(r.statut)) {
        let label = 'Annulation réservation';
        if (r.statut === 'RECUPEREE') {
          label = 'Retrait Réservation';
        } else if (r.statut === 'EXPIREE') {
          label = 'Réservation expirée';
        }
        events.push({
          id: `res-release-${r.id}`,
          date: new Date(r.updated_at || r.created_at),
          label: label,
          qty: r.quantite,
          details: `Réf: ${r.reference}`
        });
      }
    });

    // 3. Gather direct production events from displayProductions
    displayProductions.forEach(po => {
      if (po.statut === 'COMPLETED' && po.model === selectedModel.id && po.quantite_produite > 0) {
        events.push({
          id: `prod-${po.id}`,
          date: new Date(po.date_fin_reelle || po.date_debut),
          label: 'Confection reçue',
          qty: po.quantite_produite,
          details: `Réf OC: ${po.reference} - Atelier: ${po.workshop_name}`
        });
      }
    });

    // 4. Gather manual stock adjustments and corrections (from StockMovement)
    modelStocks.forEach(m => {
      const desc = (m.description || "").toLowerCase();
      const isSalesOrProd = desc.includes("vente") || desc.includes("order") || desc.includes("commande") || desc.includes("production") || desc.includes("of ") || desc.includes("retour");
      
      if (!isSalesOrProd) {
        let label = 'Correction de stock';
        if (desc.includes('initialisation')) {
          label = 'Initialisation stock';
        }
        events.push({
          id: `adj-${m.id}`,
          date: new Date(m.created_at),
          label: label,
          qty: m.quantite,
          details: m.description
        });
      }
    });

    // 5. Reconcile with unaccounted reservations
    const activeReservationsSum = modelReservations
      .filter(r => ['EN_ATTENTE', 'PAIEMENT_PARTIEL', 'PAYEE'].includes(r.statut))
      .reduce((sum, r) => sum + r.quantite, 0);

    const unaccountedReserve = (selectedModel.stock_reserve || 0) - activeReservationsSum;
    if (unaccountedReserve > 0) {
      events.push({
        id: `unaccounted-res`,
        date: new Date(selectedModel.created_at || Date.now()),
        label: 'Réservation',
        qty: -unaccountedReserve,
        details: 'Réservations enregistrées en magasin'
      });
    }

    // Sort events by date ascending
    events.sort((a, b) => a.date - b.date);

    // 6. Calculate starting stock to match current disponible stock
    const currentDispo = selectedModel.stock_disponible || 0;
    const sumOtherEvents = events.reduce((sum, e) => sum + e.qty, 0);
    const startingStock = currentDispo - sumOtherEvents;

    // Add starting stock event at the very beginning
    if (startingStock !== 0) {
      const firstEventDate = events.length > 0 ? events[0].date : new Date();
      const startingDate = new Date(firstEventDate.getTime() - 60 * 60 * 1000);
      events.unshift({
        id: 'starting-stock',
        date: startingDate,
        label: 'Stock initial',
        qty: startingStock,
        details: 'Ajustement de départ'
      });
    }

    // Compute running stock after each movement
    let runningStock = 0;
    const computedEvents = events.map(e => {
      runningStock += e.qty;
      return {
        ...e,
        stockAfter: runningStock
      };
    });

    // Sort descending for display (newest first)
    computedEvents.sort((a, b) => b.date - a.date);

    return computedEvents;
  }, [modelStocks, modelReservations, selectedModel, displaySales, displayProductions]);

  // Export to CSV helper
  const exportMovementsToCSV = () => {
    if (movements.length === 0) return;
    
    // Headers
    const headers = ["Date", "Matiere", "Operation", "Ancienne Qte", "Nouvelle Qte", "Difference", "Utilisateur", "Description"];
    
    // Rows
    const rows = movements.map(m => [
      new Date(m.created_at).toLocaleString('fr-FR'),
      m.raw_material_detail?.type_matiere || m.raw_material,
      getOperationLabel(m.operation_type),
      m.old_quantity,
      m.new_quantity,
      m.difference,
      m.user_detail?.username || 'Système',
      m.description || ''
    ]);

    // CSV format
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(";"), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";"))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historique_mouvements_stock_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryLabel = (cat) => {
    const mapping = {
      'TISSU': 'Tissu',
      'FIL': 'Fil',
      'PERLE': 'Perle',
      'FERMETURE': 'Fermeture',
      'BOUTON': 'Bouton',
      'GARNITURE': 'Garniture',
      'EMBALLAGE': 'Emballage',
      'AUTRE': 'Autre'
    };
    return mapping[cat] || cat;
  };

  const getOperationLabel = (type) => {
    switch (type) {
      case 'PURCHASE': return 'Achat initial / Rouleau';
      case 'CONSUMPTION': return 'Consommation atelier';
      case 'CORRECTION': return 'Correction inventaire';
      case 'RETURN': return 'Retour de matières';
      case 'ADJUSTMENT': return 'Ajustement manuel';
      default: return type;
    }
  };

  const getOperationColor = (type) => {
    switch (type) {
      case 'PURCHASE': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
      case 'CONSUMPTION': return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
      case 'CORRECTION': return 'bg-rose-500/10 text-rose-400 border-rose-500/25';
      case 'RETURN': return 'bg-sky-500/10 text-sky-400 border-sky-500/25';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  // Filter raw materials
  const filteredRaw = rawMaterials.filter(mat => {
    const matchesArchive = showArchivedRaw ? mat.is_archived : !mat.is_archived;
    const matchesSearch = rawSearch === '' || 
      (mat.type_matiere || '').toLowerCase().includes(rawSearch.toLowerCase()) ||
      (mat.couleur || '').toLowerCase().includes(rawSearch.toLowerCase());
    const matchesCategory = rawCategoryFilter === '' || mat.categorie === rawCategoryFilter;
    return matchesArchive && matchesSearch && matchesCategory;
  });

  // Filter movements
  const filteredMovements = movements.filter(m => {
    const matchesSearch = moveSearch === '' || 
      (m.raw_material_detail?.type_matiere || '').toLowerCase().includes(moveSearch.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(moveSearch.toLowerCase());
    const matchesType = moveTypeFilter === '' || m.operation_type === moveTypeFilter;
    const matchesMaterial = moveMaterialFilter === '' || String(m.raw_material) === moveMaterialFilter;
    return matchesSearch && matchesType && matchesMaterial;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Suivi Brocard • Matières Premières</h1>
          <p className="text-sm text-slate-400 mt-1">Supervision des rouleaux de tissus et matières premières</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button 
          onClick={() => setActiveTab('raw_materials')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${activeTab === 'raw_materials' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Matières Premières
        </button>
        <button 
          onClick={() => setActiveTab('finished_goods')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${activeTab === 'finished_goods' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Stocks Produits Finis
        </button>
        <button 
          onClick={() => setActiveTab('movements')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${activeTab === 'movements' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Historique des Mouvements
        </button>
      </div>

      {/* Loading state */}
      {loading && !selectedModel && (
        <div className="text-center py-10 text-gold-500 font-semibold animate-pulse">Chargement des données de stocks...</div>
      )}

      {/* TAB 1: RAW MATERIALS */}
      {!loading && activeTab === 'raw_materials' && (
        <div className="space-y-6">
          
          {/* Filters and Actions */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
              {/* Search */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 w-full">
                <Search size={18} className="text-slate-500 mr-2" />
                <input 
                  type="text" 
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
                  placeholder="Rechercher une matière..."
                  className="bg-transparent border-none outline-none w-full text-white placeholder-slate-500 text-sm"
                />
              </div>
              
              {/* Category Filter */}
              <select 
                value={rawCategoryFilter}
                onChange={(e) => setRawCategoryFilter(e.target.value)}
                className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none w-full sm:w-48"
              >
                <option value="">Toutes les catégories</option>
                <option value="TISSU">Tissu</option>
                <option value="FIL">Fil</option>
                <option value="PERLE">Perle</option>
                <option value="FERMETURE">Fermeture</option>
                <option value="BOUTON">Bouton</option>
                <option value="GARNITURE">Garniture</option>
                <option value="EMBALLAGE">Emballage</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>

            <div className="flex gap-3 w-full sm:w-auto justify-end">
              <button 
                onClick={() => setShowArchivedRaw(!showArchivedRaw)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-semibold ${showArchivedRaw ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'border-slate-800 text-slate-400 hover:bg-slate-800'}`}
              >
                <Archive size={16} />
                {showArchivedRaw ? "Afficher les matières actives" : "Afficher les matières archivées"}
              </button>
              
              <button 
                onClick={handleCreateRawClick}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-white font-semibold rounded-lg shadow-lg text-sm"
              >
                <Plus size={18} />
                Réceptionner
              </button>
            </div>
          </div>

          {/* Form Panel */}
          {showRawForm && (
            <div className="glass-card p-6 rounded-2xl border border-gold-500/20 animate-fadeIn">
              <h2 className="text-lg font-bold text-white mb-4">
                {editingRaw ? `Modifier la matière première: ${editingRaw.type_matiere}` : "Enregistrer une réception de matière première"}
              </h2>
              <form onSubmit={handleRawSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Nom / Type de matière première</label>
                    <input 
                      type="text" 
                      value={rawType} 
                      onChange={(e) => setRawType(e.target.value)} 
                      required
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      placeholder="Ex: Tissu Brocard Premium Or"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">Désignation claire (ex: Brocard Soie, Boutons dorés).</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Couleur</label>
                      <input 
                        type="text" 
                        value={rawColor} 
                        onChange={(e) => setRawColor(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                        placeholder="Or, Argent..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Date d'achat / réception</label>
                      <input 
                        type="date" 
                        value={rawDateReception} 
                        onChange={(e) => setRawDateReception(e.target.value)} 
                        required
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Quantité Disponible ({rawUniteMesure})</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={rawQtyRestante} 
                        onChange={(e) => setRawQtyRestante(e.target.value)} 
                        required
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                        placeholder="50.00"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">Quantité actuellement utilisable en stock.</span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Quantité Achetée Initiale</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={rawQtyAchetee} 
                        onChange={(e) => setRawQtyAchetee(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                        placeholder="Laissez vide pour copier la quantité disponible"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Fournisseur</label>
                      <select 
                        value={rawSupplier} 
                        onChange={(e) => setRawSupplier(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      >
                        <option value="">Sélectionner un fournisseur</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.ville})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Date d'achat</label>
                      <input 
                        type="date" 
                        value={rawDateAchat} 
                        onChange={(e) => setRawDateAchat(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Catégorie</label>
                      <select 
                        value={rawCategory} 
                        onChange={(e) => setRawCategory(e.target.value)} 
                        required
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      >
                        <option value="TISSU">Tissu</option>
                        <option value="FIL">Fil</option>
                        <option value="PERLE">Perle</option>
                        <option value="FERMETURE">Fermeture</option>
                        <option value="BOUTON">Bouton</option>
                        <option value="GARNITURE">Garniture</option>
                        <option value="EMBALLAGE">Emballage</option>
                        <option value="AUTRE">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Unité de mesure</label>
                      <select 
                        value={rawUniteMesure} 
                        onChange={(e) => setRawUniteMesure(e.target.value)} 
                        required
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      >
                        <option value="mètres">Mètres</option>
                        <option value="bobines">Bobines</option>
                        <option value="sachets">Sachets</option>
                        <option value="unités">Unités</option>
                        <option value="rouleaux">Rouleaux</option>
                        <option value="paquets">Paquets</option>
                        <option value="boîtes">Boîtes</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Prix d'achat unitaire (FCFA)</label>
                      <input 
                        type="number" 
                        value={rawPriceUnit} 
                        onChange={(e) => setRawPriceUnit(e.target.value)} 
                        required
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                        placeholder="Ex: 8500"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">Prix par {rawUniteMesure} ou à l'unité.</span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Seuil d'alerte de stock ({rawUniteMesure})</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={rawSeuilAlerte} 
                        onChange={(e) => setRawSeuilAlerte(e.target.value)} 
                        required
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                        placeholder="15.00"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">En dessous de cette quantité, une alerte visuelle s'affiche.</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Observations</label>
                    <textarea 
                      value={rawObservations} 
                      onChange={(e) => setRawObservations(e.target.value)} 
                      rows="2"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      placeholder="Observations sur la matière première (qualité, usage, défauts...)"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-8">
                    <button 
                      type="button" 
                      onClick={() => { setShowRawForm(false); setEditingRaw(null); }}
                      className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-sm font-semibold"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      className="px-6 py-2.5 bg-gold-600 hover:bg-gold-500 text-white font-semibold rounded-xl text-sm"
                    >
                      {editingRaw ? "Enregistrer les modifications" : "Enregistrer la réception"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* List of raw materials */}
          {filteredRaw.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              Aucune matière première trouvée dans cette catégorie.
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left">Nom de la matière</th>
                    <th className="px-6 py-4 text-left">Réf Achat</th>
                    <th className="px-6 py-4 text-left">Fournisseur</th>
                    <th className="px-6 py-4 text-center">Quantité Restante / Achetée</th>
                    <th className="px-6 py-4 text-right">Prix Unitaire</th>
                    <th className="px-6 py-4 text-right">Montant Total</th>
                    <th className="px-6 py-4 text-center">Date d'achat</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredRaw.map((mat) => {
                    const isAlert = parseFloat(mat.quantite_restante_metres) < parseFloat(mat.seuil_alerte);
                    return (
                      <tr key={mat.id} className="hover:bg-slate-800/20 transition-all text-xs">
                        <td className="px-6 py-4 font-semibold text-slate-200 text-left">
                          {mat.type_matiere}
                          {mat.couleur && <span className="text-slate-500 font-normal ml-1">({mat.couleur})</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-300 text-left font-mono">
                          {mat.purchase_reference || "-"}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-left">
                          {mat.supplier_name || "-"}
                        </td>
                        <td className="px-6 py-4 text-center font-bold">
                          <span className={`px-2.5 py-1 rounded text-xs ${isAlert ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-300'}`}>
                            {parseFloat(mat.quantite_restante_metres)} / {parseFloat(mat.quantite_achetee_metres)} {mat.unite_mesure || 'unités'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-200">
                          {formatFCFA(mat.prix_achat_metre)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gold-400">
                          {formatFCFA(mat.montant_total_achat)}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-500">
                          {mat.date_achat_display ? new Date(mat.date_achat_display).toLocaleDateString('fr-FR') : "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              type="button"
                              onClick={() => setSelectedRawMaterial(mat)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-all"
                              title="Détails"
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleEditRawClick(mat)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-all"
                              title="Modifier"
                            >
                              <Edit2 size={14} />
                            </button>
                            {mat.is_archived ? (
                              <button 
                                type="button"
                                onClick={() => handleArchiveRaw(mat.id, false)}
                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold border border-emerald-500/25"
                              >
                                Réactiver
                              </button>
                            ) : (
                              <button 
                                type="button"
                                onClick={() => handleArchiveRaw(mat.id, true)}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all border border-rose-500/25"
                                title="Archiver"
                              >
                                <Archive size={14} />
                              </button>
                            )}
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
      )}

      {/* TAB 2: MOVEMENTS HISTORIQUE */}
      {!loading && activeTab === 'movements' && (
        <div className="space-y-6">
          
          {/* Filters & Export */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">
              {/* Search */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 w-full">
                <Search size={16} className="text-slate-500 mr-2" />
                <input 
                  type="text" 
                  value={moveSearch}
                  onChange={(e) => setMoveSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="bg-transparent border-none outline-none w-full text-white placeholder-slate-500 text-xs"
                />
              </div>

              {/* Type Filter */}
              <select 
                value={moveTypeFilter}
                onChange={(e) => setMoveTypeFilter(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
              >
                <option value="">Tous les types d'opération</option>
                <option value="PURCHASE">Achats initial</option>
                <option value="CONSUMPTION">Consommation atelier</option>
                <option value="CORRECTION">Correction</option>
                <option value="RETURN">Retour</option>
                <option value="ADJUSTMENT">Ajustement manuel</option>
              </select>

              {/* Material Filter */}
              <select 
                value={moveMaterialFilter}
                onChange={(e) => setMoveMaterialFilter(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
              >
                <option value="">Toutes les matières</option>
                {rawMaterials.map(m => (
                  <option key={m.id} value={m.id}>{m.type_matiere} {m.couleur ? `(${m.couleur})` : ''}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={exportMovementsToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition-all self-end md:self-auto"
            >
              <Download size={14} />
              Exporter en CSV
            </button>
          </div>

          {/* Table */}
          {filteredMovements.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              Aucun mouvement de stock enregistré correspondant aux critères.
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Date et heure</th>
                    <th className="px-6 py-4">Matière première</th>
                    <th className="px-6 py-4">Type d'opération</th>
                    <th className="px-6 py-4 text-center">Ancien stock</th>
                    <th className="px-6 py-4 text-center">Nouveau stock</th>
                    <th className="px-6 py-4 text-center">Différence</th>
                    <th className="px-6 py-4">Utilisateur</th>
                    <th className="px-6 py-4">Description / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredMovements.map((move) => {
                    const diffVal = parseFloat(move.difference);
                    const isPositive = diffVal > 0;
                    return (
                      <tr key={move.id} className="hover:bg-slate-800/20 transition-all text-xs">
                        <td className="px-6 py-4 text-slate-400">
                          {new Date(move.created_at).toLocaleString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-200">
                          {move.raw_material_detail?.type_matiere || `Matière #${move.raw_material}`}
                          {move.raw_material_detail?.couleur && <span className="text-slate-500 font-normal ml-1">({move.raw_material_detail.couleur})</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getOperationColor(move.operation_type)}`}>
                            {getOperationLabel(move.operation_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-slate-400">
                          {move.old_quantity} {rawMaterials.find(rm => rm.id === move.raw_material)?.unite_mesure || 'unités'}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-slate-200">
                          {move.new_quantity} {rawMaterials.find(rm => rm.id === move.raw_material)?.unite_mesure || 'unités'}
                        </td>
                        <td className={`px-6 py-4 text-center font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? '+' : ''}{move.difference} {rawMaterials.find(rm => rm.id === move.raw_material)?.unite_mesure || 'unités'}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {move.user_detail?.username || "Système"}
                        </td>
                        <td className="px-6 py-4 text-slate-500 italic max-w-xs truncate" title={move.description}>
                          {move.description || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRODUCTS FINIS (FINISHED GOODS) */}
      {!loading && activeTab === 'finished_goods' && (
        <div className="space-y-6">
          
          {/* Header toolbar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            {/* Search bar */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 w-full max-w-md">
              <Search size={18} className="text-slate-500 mr-2" />
              <input 
                type="text" 
                value={finishedSearch}
                onChange={(e) => setFinishedSearch(e.target.value)}
                placeholder="Rechercher un modèle ou une variante..."
                className="bg-transparent border-none outline-none w-full text-white placeholder-slate-500 text-sm"
              />
            </div>

            {/* Toggle View Mode */}
            <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
              <button
                onClick={() => setFinishedViewMode('models')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${finishedViewMode === 'models' ? 'bg-gold-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Vue par Design / Modèle
              </button>
              <button
                onClick={() => setFinishedViewMode('variants')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${finishedViewMode === 'variants' ? 'bg-gold-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Vue par Variante de Stock
              </button>
            </div>
          </div>

          {finishedViewMode === 'models' ? (
            clothingModels.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                Aucun modèle d'habit fini trouvé.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clothingModels.map((model) => (
                  <div key={model.id} className="glass-card rounded-2xl overflow-hidden border border-slate-800/80 hover:border-gold-500/30 transition-all duration-300 flex flex-col justify-between">
                    <div className="h-48 bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-slate-800">
                      {model.photo_principale ? (
                        <div className="w-full h-full relative flex items-center justify-center">
                          <img 
                            src={model.photo_principale} 
                            alt={model.name} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              const fallback = e.target.parentNode.querySelector('.img-fallback');
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="img-fallback hidden absolute inset-0 w-full h-full items-center justify-center bg-slate-950 text-slate-600 flex flex-col gap-2">
                            <Image size={40} />
                            <span className="text-xs">Image indisponible</span>
                          </div>
                        </div>
                      ) : (
                        <Image size={40} className="text-slate-600" />
                      )}
                      <div className="absolute top-3 right-3 px-3 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg text-gold-400 text-xs font-bold font-mono">
                        {(parseFloat(model.prix_vente_conseille) || 0).toLocaleString('fr-FR')} F
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div>
                        <h3 className="text-md font-bold text-white tracking-tight">{model.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{model.description || "Aucune description"}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-3 bg-slate-900/40 rounded-xl text-center border border-slate-800/30">
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">Disponible</span>
                          <span className={`text-md font-bold ${model.stock_disponible === 0 ? 'text-rose-400' : model.stock_disponible < 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {model.stock_disponible} pcs
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">Réservé</span>
                          <span className="text-md font-bold text-amber-500">{model.stock_reserve} pcs</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">Vendu</span>
                          <span className="text-md font-bold text-slate-200">{model.stock_vendu} pcs</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleViewModelDetails(model)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-700"
                      >
                        <Eye size={14} />
                        Consulter l'activité
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            finishedStocks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                Aucun stock physique de produit fini trouvé.
              </div>
            ) : (
              <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Modèle (Design)</th>
                      <th className="px-6 py-4">Catégorie</th>
                      <th className="px-6 py-4">SKU</th>
                      <th className="px-6 py-4 text-center">Taille</th>
                      <th className="px-6 py-4 text-center">Couleur</th>
                      <th className="px-6 py-4 text-center">Emplacement</th>
                      <th className="px-6 py-4 text-center">Quantité Réelle</th>
                      <th className="px-6 py-4 text-center">Quantité Réservée</th>
                      <th className="px-6 py-4 text-center">Disponible</th>
                      <th className="px-6 py-4 text-center">Statut Alerte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {finishedStocks.map((stock) => {
                      const disponible = stock.disponible !== undefined ? stock.disponible : (stock.quantite_reel - stock.quantite_reservee);
                      
                      let badgeColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
                      let badgeText = "En Stock";
                      
                      if (disponible === 0) {
                        badgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                        badgeText = "Rupture";
                      } else if (disponible < 5) {
                        badgeColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                        badgeText = "Stock Faible";
                      }
                      
                      return (
                        <tr key={stock.id} className="hover:bg-slate-800/20 transition-all text-xs">
                          <td className="px-6 py-4 font-semibold text-slate-200">
                            {stock.model_name || "-"}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {stock.category_name || "-"}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-400">{stock.sku || "-"}</td>
                          <td className="px-6 py-4 text-center text-slate-300">{stock.taille || "-"}</td>
                          <td className="px-6 py-4 text-center text-slate-300">{stock.couleur || "-"}</td>
                          <td className="px-6 py-4 text-center text-slate-400">{stock.emplacement || "-"}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-300">{stock.quantite_reel} pcs</td>
                          <td className="px-6 py-4 text-center text-slate-500">{stock.quantite_reservee} pcs</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-200">{disponible} pcs</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded text-xs font-semibold ${badgeColor}`}>
                              {badgeText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      {/* DETAIL MODAL:FINISHED GOOD DRILL DOWN */}
      {selectedModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="glass-card w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl border border-slate-800 flex flex-col justify-between">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-gold-500/10 flex items-center justify-center text-gold-400">
                  <Package size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">{selectedModel.name}</h2>
                  <p className="text-xs text-slate-400">Fiche d'activité et suivi d'inventaire détaillé</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedModel(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Résumé en haut de la fiche */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/40 flex flex-col md:flex-row gap-6 items-center">
              {/* Photo */}
              <div className="h-24 w-24 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex-shrink-0 flex items-center justify-center">
                {selectedModel.photo_principale ? (
                  <div className="w-full h-full relative flex items-center justify-center">
                    <img 
                      src={selectedModel.photo_principale} 
                      alt={selectedModel.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        const fallback = e.target.parentNode.querySelector('.img-fallback');
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="img-fallback hidden absolute inset-0 w-full h-full items-center justify-center bg-slate-950 text-slate-600 flex flex-col gap-1 text-center">
                      <Image size={24} />
                      <span className="text-[8px]">N/A</span>
                    </div>
                  </div>
                ) : (
                  <Image size={32} className="text-slate-600" />
                )}
              </div>
              
              {/* Info and stats */}
              <div className="flex-1 w-full space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-extrabold text-white tracking-tight">{selectedModel.name}</h3>
                    <p className="text-sm font-bold text-gold-400 font-mono mt-1">
                      {(parseFloat(selectedModel.prix_vente_conseille) || 0).toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>
                
                {/* Stats cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Disponible</span>
                    <span className={`text-lg font-bold block mt-1 ${selectedModel.stock_disponible === 0 ? 'text-rose-400' : selectedModel.stock_disponible < 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {selectedModel.stock_disponible} pcs
                    </span>
                  </div>
                  <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Réservé</span>
                    <span className="text-lg font-bold text-amber-500 block mt-1">{selectedModel.stock_reserve} pcs</span>
                  </div>
                  <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Vendu</span>
                    <span className="text-lg font-bold text-slate-200 block mt-1">{selectedModel.stock_vendu} pcs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub navigation for Details */}
            <div className="flex bg-slate-900/60 border-b border-slate-800 px-6 py-1">
              <button 
                onClick={() => setDetailsTab('evolution')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${detailsTab === 'evolution' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <History size={12} />
                Évolution du Stock
              </button>
              <button 
                onClick={() => setDetailsTab('confection')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${detailsTab === 'confection' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <Hammer size={12} />
                Historique de Confection
              </button>
              <button 
                onClick={() => setDetailsTab('ventes')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${detailsTab === 'ventes' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <ShoppingCart size={12} />
                Historique des Ventes
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-[40vh] bg-slate-900/10">
              {modelDetailsLoading ? (
                <div className="text-center py-12 text-gold-500 animate-pulse font-semibold">Récupération de la fiche...</div>
              ) : (
                <>
                  {/* TAB A: EVOLUTION STOCKS */}
                  {detailsTab === 'evolution' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-300">Historique des mouvements et évolution du stock disponible</h4>
                      {stockEvolutionEvents.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-4">Aucun mouvement enregistré pour ce modèle.</p>
                      ) : (
                        <div className="overflow-x-auto border border-slate-800 rounded-xl">
                          <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
                              <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Mouvement</th>
                                <th className="px-4 py-3 text-center">Quantité</th>
                                <th className="px-4 py-3 text-right">Stock après mouvement</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {stockEvolutionEvents.map(event => {
                                const isPositive = event.qty > 0;
                                return (
                                  <tr key={event.id} className="hover:bg-slate-800/10">
                                    <td className="px-4 py-3 text-slate-400">
                                      {new Date(event.date).toLocaleString('fr-FR')}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="font-semibold text-slate-200 block">{event.label}</span>
                                      {event.details && <span className="text-[10px] text-slate-500">{event.details}</span>}
                                    </td>
                                    <td className={`px-4 py-3 text-center font-bold font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {isPositive ? `+${event.qty}` : event.qty} pcs
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold font-mono text-slate-200">
                                      {event.stockAfter} pcs
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB B: CONFECTION HISTORIQUE */}
                  {detailsTab === 'confection' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-300">Historique des confections confiées aux ateliers</h4>
                      {displayProductions.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-4">Aucune confection passée pour ce modèle.</p>
                      ) : (
                        <div className="overflow-x-auto border border-slate-800 rounded-xl">
                          <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-900 text-slate-400 uppercase font-bold border-b border-slate-800">
                              <tr>
                                <th className="px-4 py-3">Référence confection</th>
                                <th className="px-4 py-3">Atelier</th>
                                <th className="px-4 py-3 text-center">Date début</th>
                                <th className="px-4 py-3 text-center">Date fin</th>
                                <th className="px-4 py-3 text-center">Qté demandée</th>
                                <th className="px-4 py-3 text-center">Qté reçue</th>
                                <th className="px-4 py-3 text-right">Coût façon</th>
                                <th className="px-4 py-3 text-right">Statut</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {displayProductions.map(po => (
                                <tr key={po.id} className="hover:bg-slate-800/10">
                                  <td className="px-4 py-3 font-semibold text-gold-500">{po.reference}</td>
                                  <td className="px-4 py-3 text-slate-300 font-semibold">{po.workshop_name}</td>
                                  <td className="px-4 py-3 text-center text-slate-400">
                                    {po.date_debut ? new Date(po.date_debut).toLocaleDateString('fr-FR') : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-center text-slate-400">
                                    {(po.date_fin_reelle || po.date_fin_prevue) ? new Date(po.date_fin_reelle || po.date_fin_prevue).toLocaleDateString('fr-FR') : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-center font-mono">{po.quantite_demandee} pcs</td>
                                  <td className="px-4 py-3 text-center font-bold font-mono text-slate-200">{po.quantite_produite} pcs</td>
                                  <td className="px-4 py-3 text-right font-mono font-semibold text-gold-400">
                                    {(parseFloat(po.montant_facon_total) || 0).toLocaleString('fr-FR')} F
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      po.statut === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                                      po.statut === 'IN_PROGRESS' ? 'bg-orange-500/10 text-orange-400' :
                                      'bg-slate-800 text-slate-400'
                                    }`}>
                                      {po.statut === 'COMPLETED' ? 'Terminé' : po.statut === 'IN_PROGRESS' ? 'En cours' : po.statut}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB C: SALES HISTORIQUE */}
                  {detailsTab === 'ventes' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-300 font-sans">Historique des ventes facturées</h4>
                      {displaySales.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-4">Aucune vente enregistrée pour ce modèle d'habit.</p>
                      ) : (
                        <div className="overflow-x-auto border border-slate-800 rounded-xl">
                          <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-900 text-slate-400 uppercase font-bold border-b border-slate-800">
                              <tr>
                                <th className="px-4 py-3">Référence vente</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Client</th>
                                <th className="px-4 py-3 text-center">Quantité</th>
                                <th className="px-4 py-3 text-right">Prix unitaire</th>
                                <th className="px-4 py-3 text-right">Montant total</th>
                                <th className="px-4 py-3">Mode de paiement</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {displaySales.map(line => (
                                <tr key={line.id} className="hover:bg-slate-800/10">
                                  <td className="px-4 py-3 font-semibold text-slate-200">{line.order_reference}</td>
                                  <td className="px-4 py-3 text-slate-500">
                                    {new Date(line.order_date).toLocaleString('fr-FR')}
                                  </td>
                                  <td className="px-4 py-3 text-slate-300 font-semibold">{line.customer_name}</td>
                                  <td className="px-4 py-3 text-center font-bold font-mono">{line.quantite} pcs</td>
                                  <td className="px-4 py-3 text-right font-mono">
                                    {(parseFloat(line.prix_unitaire_applique) || 0).toLocaleString('fr-FR')} F
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold font-mono text-emerald-400">
                                    {((parseFloat(line.prix_unitaire_applique) || 0) * line.quantite).toLocaleString('fr-FR')} F
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                      {line.payment_mode || '-'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-800/80 bg-slate-900/20 flex justify-end">
              <button 
                onClick={() => setSelectedModel(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-all"
              >
                Fermer la fiche
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: DETAILS MATIERE PREMIERE */}
      {selectedRawMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-500/10 rounded-xl text-gold-400">
                  <Package size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">{selectedRawMaterial.type_matiere}</h2>
                  <p className="text-xs text-slate-400">Détails de la matière première et suivi d'achat</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRawMaterial(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informations de base */}
                <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/60 space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Caractéristiques</h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">Catégorie :</span><span className="font-semibold text-slate-200">{getCategoryLabel(selectedRawMaterial.categorie)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Couleur :</span><span className="font-semibold text-slate-200">{selectedRawMaterial.couleur || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Unité de mesure :</span><span className="font-semibold text-slate-200">{selectedRawMaterial.unite_mesure || "unités"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Date réception :</span><span className="font-semibold text-slate-200">{selectedRawMaterial.date_reception ? new Date(selectedRawMaterial.date_reception).toLocaleDateString('fr-FR') : "-"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Statut archivage :</span><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedRawMaterial.is_archived ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>{selectedRawMaterial.is_archived ? 'Archivé' : 'Actif'}</span></div>
                  </div>
                </div>

                {/* Suivi Financier */}
                <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/60 space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suivi financier</h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">Quantité achetée :</span><span className="font-semibold text-slate-200">{parseFloat(selectedRawMaterial.quantite_achetee_metres)} {selectedRawMaterial.unite_mesure}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Quantité restante :</span><span className="font-bold text-slate-200">{parseFloat(selectedRawMaterial.quantite_restante_metres)} {selectedRawMaterial.unite_mesure}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Prix unitaire :</span><span className="font-semibold text-slate-200">{formatFCFA(selectedRawMaterial.prix_achat_metre)}</span></div>
                    <div className="flex justify-between border-t border-slate-800/60 pt-2"><span className="text-slate-400 font-bold">Montant total d'achat :</span><span className="font-extrabold text-gold-400">{formatFCFA(selectedRawMaterial.montant_total_achat)}</span></div>
                  </div>
                </div>
              </div>

              {/* Fournisseur & Achat lié */}
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/60 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suivi d'achat et Fournisseur</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-slate-400">Fournisseur :</span><span className="font-semibold text-slate-200">{selectedRawMaterial.supplier_name || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Réf Achat associé :</span><span className="font-semibold text-slate-200 font-mono">{selectedRawMaterial.purchase_reference || "-"}</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-slate-400">Date d'achat :</span><span className="font-semibold text-slate-200">{selectedRawMaterial.date_achat_display ? new Date(selectedRawMaterial.date_achat_display).toLocaleDateString('fr-FR') : "-"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Seuil d'alerte :</span><span className="font-semibold text-rose-400">{parseFloat(selectedRawMaterial.seuil_alerte)} {selectedRawMaterial.unite_mesure}</span></div>
                  </div>
                </div>
              </div>

              {/* Observations */}
              {selectedRawMaterial.observations && (
                <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/60 space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observations / Notes</h3>
                  <p className="text-xs text-slate-300 italic whitespace-pre-wrap">{selectedRawMaterial.observations}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-800/80 bg-slate-900/20 flex justify-end">
              <button 
                onClick={() => setSelectedRawMaterial(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-all"
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

export default Stocks;
