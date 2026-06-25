import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  FileSpreadsheet, Printer, BarChart3, TrendingUp, Calendar, AlertCircle, RefreshCw, ShoppingBag, Hammer, Receipt, Package, DollarSign, CheckCircle
} from 'lucide-react';

const Rapports = () => {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'production', 'expenses', 'stocks', 'profitability'
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to first day of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Raw Data States
  const [salesLines, setSalesLines] = useState([]);
  const [prodOrders, setProdOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finishedStocks, setFinishedStocks] = useState([]);
  const [payrolls, setPayrolls] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all reports resources without pagination
      const [salesRes, prodRes, expRes, matRes, stockRes, payRes] = await Promise.all([
        api.get('/ventes/lines/?no_pagination=true'),
        api.get('/production/orders/?no_pagination=true'),
        api.get('/depenses/?no_pagination=true'),
        api.get('/achats/materials/?no_pagination=true'),
        api.get('/stocks/inventories/?no_pagination=true'),
        api.get('/remunerations/payrolls/?no_pagination=true')
      ]);

      setSalesLines(salesRes.data.results || salesRes.data);
      setProdOrders(prodRes.data.results || prodRes.data);
      setExpenses(expRes.data.results || expRes.data);
      setRawMaterials(matRes.data.results || matRes.data);
      setFinishedStocks(stockRes.data.results || stockRes.data);
      setPayrolls(payRes.data.results || payRes.data);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la récupération des rapports de direction.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatFCFA = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('fr-FR') + ' FCFA';
  };

  // Date Filtering helpers
  const filterByDate = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    date.setHours(0,0,0,0);
    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    const end = new Date(endDate);
    end.setHours(23,59,59,999);
    return date >= start && date <= end;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch (e) {
      return dateStr;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PLANNED':
      case 'PLANIFIEE':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'IN_PROGRESS':
      case 'EN_COURS':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'PARTIAL':
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
      case 'CANCELLED':
      case 'ANNULEE':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PLANNED':
      case 'PLANIFIEE': return 'Planifiée';
      case 'IN_PROGRESS':
      case 'EN_COURS': return 'En cours';
      case 'PARTIAL': return 'Réception partielle';
      case 'COMPLETED': return 'Terminée';
      case 'CANCELLED':
      case 'ANNULEE': return 'Annulée';
      default: return status;
    }
  };

  // 1. SALES CALCULATIONS
  const filteredSalesLines = salesLines.filter(line => {
    if (line.order_status === 'CANCELLED') return false;
    return filterByDate(line.order_date);
  });

  // Group finished stock by model to initialize all models for sales reporting
  const stockByModel = {};
  finishedStocks.forEach(item => {
    const modelName = item.model_name || "Inconnu";
    if (!stockByModel[modelName]) {
      stockByModel[modelName] = {
        name: modelName,
        image: item.model_image,
        category: item.category_name || (item.prix_vente_conseille ? `Catégorie ${parseInt(item.prix_vente_conseille)} FCFA` : "Sans catégorie"),
        remaining: 0,
      };
    }
    const disponibleVal = item.disponible !== undefined ? item.disponible : (item.quantite_reel - item.quantite_reservee);
    stockByModel[modelName].remaining += Math.max(0, disponibleVal);
  });

  // Merge sales data with stock by model
  const salesByModelMap = {};
  
  // First, initialize with stock data
  Object.keys(stockByModel).forEach(modelName => {
    salesByModelMap[modelName] = {
      name: modelName,
      image: stockByModel[modelName].image,
      category: stockByModel[modelName].category,
      sold: 0,
      remaining: stockByModel[modelName].remaining,
      revenue: 0
    };
  });

  // Second, add sales data
  filteredSalesLines.forEach(line => {
    const modelName = line.variant_name || "Inconnu";
    const image = line.variant_image;
    
    if (!salesByModelMap[modelName]) {
      salesByModelMap[modelName] = {
        name: modelName,
        image: image,
        category: line.prix_unitaire_applique ? `Catégorie ${parseInt(line.prix_unitaire_applique)} FCFA` : "Sans catégorie",
        sold: 0,
        remaining: 0,
        revenue: 0
      };
    }
    
    if (!salesByModelMap[modelName].image && image) {
      salesByModelMap[modelName].image = image;
    }
    
    salesByModelMap[modelName].sold += line.quantite;
    salesByModelMap[modelName].revenue += line.quantite * parseFloat(line.prix_unitaire_applique);
  });

  const salesReportData = Object.values(salesByModelMap).map(item => {
    const total = item.sold + item.remaining;
    const percentSold = total > 0 ? (item.sold / total) * 100 : 0;
    return {
      ...item,
      percentSold
    };
  }).sort((a, b) => b.revenue - a.revenue || b.sold - a.sold);

  const totalSalesRevenue = salesReportData.reduce((sum, item) => sum + item.revenue, 0);
  const totalItemsSold = salesReportData.reduce((sum, item) => sum + item.sold, 0);

  const getStockStatusClass = (stock) => {
    if (stock > 10) return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
    if (stock >= 5) return "bg-amber-500/10 text-amber-400 border border-amber-500/25";
    return "bg-rose-500/10 text-rose-400 border border-rose-500/25 font-bold";
  };

  // 2. PRODUCTION CALCULATIONS
  const filteredProdOrders = prodOrders.filter(order => {
    return filterByDate(order.date_debut);
  });

  const totalProdOrders = filteredProdOrders.length;
  const totalQuantityRequested = filteredProdOrders.reduce((sum, o) => sum + o.quantite_demandee, 0);
  const totalQuantityProduced = filteredProdOrders.reduce((sum, o) => sum + o.quantite_produite, 0);
  const totalDefectives = filteredProdOrders.reduce((sum, o) => sum + o.pieces_defectueuses, 0);
  const totalFaconCost = filteredProdOrders.reduce((sum, o) => sum + parseFloat(o.montant_facon_total), 0);

  // Group by workshop and calculate metrics for ranking and workshops table
  const workshopStats = {};
  filteredProdOrders.forEach(o => {
    const name = o.workshop_name || 'Inconnu';
    if (!workshopStats[name]) {
      workshopStats[name] = {
        name,
        ordersCount: 0,
        qtyRequested: 0,
        qtyProduced: 0,
        defects: 0,
        totalCost: 0,
        totalPaid: 0,
      };
    }
    workshopStats[name].ordersCount += 1;
    workshopStats[name].qtyRequested += parseInt(o.quantite_demandee) || 0;
    workshopStats[name].qtyProduced += parseInt(o.quantite_produite) || 0;
    workshopStats[name].defects += parseInt(o.pieces_defectueuses) || 0;
    workshopStats[name].totalCost += parseFloat(o.montant_facon_total) || 0;
    workshopStats[name].totalPaid += parseFloat(o.montant_facon_paye) || 0;
  });

  const workshopStatsList = Object.values(workshopStats).map(w => {
    const rate = w.qtyRequested > 0 ? (w.qtyProduced / w.qtyRequested) * 100 : 0;
    return {
      ...w,
      realisationRate: rate
    };
  });

  const rankedWorkshops = [...workshopStatsList].sort((a, b) => {
    if (b.qtyProduced !== a.qtyProduced) {
      return b.qtyProduced - a.qtyProduced;
    }
    return b.realisationRate - a.realisationRate;
  });

  // 3. EXPENSES CALCULATIONS
  const filteredExpenses = expenses.filter(exp => {
    return filterByDate(exp.date_depense);
  });

  const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.montant), 0);
  
  // Group expenses by category
  const expensesByCategoryMap = {};
  filteredExpenses.forEach(exp => {
    const cat = exp.categorie;
    if (!expensesByCategoryMap[cat]) {
      expensesByCategoryMap[cat] = {
        category: cat,
        amount: 0
      };
    }
    expensesByCategoryMap[cat].amount += parseFloat(exp.montant);
  });
  const expensesReportData = Object.values(expensesByCategoryMap).sort((a, b) => b.amount - a.amount);

  const getExpenseLabel = (cat) => {
    const labels = {
      TRANSPORT: 'Transport',
      FOOD: 'Nourriture',
      DRINKS: 'Eau / Boisson',
      FUEL: 'Carburant',
      COMMUNICATION: 'Communication',
      COMPENSATION: 'Rémunérations',
      RAW_MAT: 'Achat Matières Premières',
      OTHER: 'Autre'
    };
    return labels[cat] || cat;
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

  // 4. STOCKS DATA & ALERTS HELPERS
  const getRawMaterialStatus = (qty, threshold) => {
    const q = parseFloat(qty) || 0;
    const t = parseFloat(threshold) || 0;
    if (q === 0) {
      return {
        text: "Réapprovisionnement urgent",
        class: "bg-rose-500/10 text-rose-400 border border-rose-500/25 font-bold"
      };
    }
    if (q < t) {
      return {
        text: "Attention",
        class: "bg-amber-500/10 text-amber-400 border border-amber-500/25"
      };
    }
    return {
      text: "Stock normal",
      class: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
    };
  };

  const getFinishedGoodStatus = (disponible) => {
    const qty = parseInt(disponible) || 0;
    if (qty === 0) {
      return {
        text: "Rupture",
        class: "bg-rose-500/10 text-rose-400 border border-rose-500/25 font-bold"
      };
    }
    if (qty < 5) {
      return {
        text: "Stock faible",
        class: "bg-amber-500/10 text-amber-400 border border-amber-500/25"
      };
    }
    return {
      text: "En stock",
      class: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
    };
  };

  const rawAlerts = rawMaterials.filter(m => !m.is_archived && parseFloat(m.quantite_restante_metres) < parseFloat(m.seuil_alerte));
  const finishedAlerts = finishedStocks.filter(f => {
    const disponible = f.disponible !== undefined ? f.disponible : (f.quantite_reel - f.quantite_reservee);
    return disponible < 5;
  });

  // 5. PROFITABILITY CALCULATIONS
  const filteredPayrolls = payrolls.filter(p => {
    const payDate = new Date(p.annee, p.mois - 1, 15);
    return filterByDate(payDate);
  });
  const totalSalariesDue = filteredPayrolls.reduce((sum, p) => sum + parseFloat(p.net_amount_payable), 0);

  const grossProfit = totalSalesRevenue - totalFaconCost;
  const netProfit = totalSalesRevenue - totalExpensesAmount - totalFaconCost - totalSalariesDue;

  // EXPORTS
  const exportCSV = () => {
    let headers = [];
    let rows = [];
    let filename = `rapport_${activeTab}`;

    if (activeTab === 'sales') {
      headers = ["Photo", "Nom du Modèle", "Catégorie", "Quantité Vendue", "Quantité Restante", "% Vendu", "Chiffre d'Affaires"];
      rows = salesReportData.map(item => [item.image || '', item.name, item.category, item.sold, item.remaining, `${item.percentSold.toFixed(1)}%`, item.revenue]);
    } else if (activeTab === 'production') {
      headers = ["Référence", "Catégorie de robe", "Atelier", "Quantité demandée", "Quantité reçue", "Quantité manquante", "Date début", "Date prévue", "Statut"];
      rows = filteredProdOrders.map(o => [
        o.reference, 
        o.category_name || o.model_name || 'Sans catégorie', 
        o.workshop_name,
        o.quantite_demandee, 
        o.quantite_produite, 
        o.quantite_manquante, 
        o.date_debut, 
        o.date_fin_prevue, 
        o.statut
      ]);
    } else if (activeTab === 'expenses') {
      headers = ["Catégorie", "Montant total dépensé"];
      rows = expensesReportData.map(item => [getExpenseLabel(item.category), item.amount]);
    } else if (activeTab === 'stocks') {
      headers = ["Nom matière", "Catégorie", "Couleur", "Quantité Disponible", "Unité", "Seuil d'alerte"];
      rows = rawMaterials.map(m => [m.type_matiere, getCategoryLabel(m.categorie), m.couleur || '', m.quantite_restante_metres, m.unite_mesure, m.seuil_alerte]);
    } else if (activeTab === 'profitability') {
      headers = ["Indicateur financier", "Montant"];
      rows = [
        ["Chiffre d'affaires", totalSalesRevenue],
        ["Dépenses", -totalExpensesAmount],
        ["Coût de confection", -totalFaconCost],
        ["Salaires", -totalSalariesDue],
        ["Bénéfice estimé", netProfit]
      ];
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_brocard_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Styles print-friendly to hide layout */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          aside, nav, header, button, .tabs-container, .filters-container {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .print-full-width {
            width: 100% !important;
            border: none !important;
            background: none !important;
            box-shadow: none !important;
          }
          .print-title {
            display: block !important;
            font-size: 22px !important;
            font-weight: bold !important;
            color: black !important;
            margin-bottom: 20px !important;
            text-align: center !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #ddd !important;
            color: black !important;
            padding: 8px !important;
          }
          th {
            background-color: #f2f2f2 !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Rapports d'Activité & Direction</h1>
          <p className="text-sm text-slate-400 mt-1">Analyses financières, stocks en alerte, bénéfices bruts et nets</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold transition-all text-sm shadow-md"
          >
            <FileSpreadsheet size={16} className="text-emerald-500" />
            Exporter CSV
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-gold-600 hover:bg-gold-500 text-white font-semibold rounded-lg shadow-lg shadow-gold-600/10 hover:shadow-gold-500/20 transition-all text-sm"
          >
            <Printer size={16} />
            Imprimer / PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-400 text-sm flex items-center gap-2 no-print">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Date Filters Container */}
      <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-center gap-4 filters-container no-print">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
          <Calendar size={14} className="text-gold-400" /> Période d'analyse :
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500">Du</span>
          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-gold-500/40"
          />
          <span className="text-xs text-slate-500">au</span>
          <input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-gold-500/40"
          />
        </div>
        <button 
          onClick={fetchData} 
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 ml-auto sm:ml-0"
          title="Rafraîchir"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Tabs Container */}
      <div className="flex border-b border-slate-800 overflow-x-auto gap-2 tabs-container no-print">
        <button 
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2.5 font-semibold text-xs uppercase tracking-wider border-b-2 whitespace-nowrap transition ${activeTab === 'sales' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Ventes & Modèles
        </button>
        <button 
          onClick={() => setActiveTab('production')}
          className={`px-4 py-2.5 font-semibold text-xs uppercase tracking-wider border-b-2 whitespace-nowrap transition ${activeTab === 'production' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Confection & Ateliers
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2.5 font-semibold text-xs uppercase tracking-wider border-b-2 whitespace-nowrap transition ${activeTab === 'expenses' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Dépenses & Charges
        </button>
        <button 
          onClick={() => setActiveTab('stocks')}
          className={`px-4 py-2.5 font-semibold text-xs uppercase tracking-wider border-b-2 whitespace-nowrap transition ${activeTab === 'stocks' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Stocks & Alertes
        </button>
        <button 
          onClick={() => setActiveTab('profitability')}
          className={`px-4 py-2.5 font-semibold text-xs uppercase tracking-wider border-b-2 whitespace-nowrap transition ${activeTab === 'profitability' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Bénéfice & Rentabilité
        </button>
      </div>

      {/* Content for Printing / Screen */}
      <div className="print-full-width">
        
        {/* Print Only Title */}
        <div className="hidden print-title">
          Rapport d'Activité Suivi Brocard<br/>
          Période : Du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gold-500 font-medium no-print">Agrégation des données en cours...</div>
        ) : (
          <>
            {/* 1. SALES REPORT VIEW */}
            {activeTab === 'sales' && (
              <div className="space-y-6">
                
                {/* Sales Indicators Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 no-print">
                  <div className="glass-card bg-slate-900/50 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-slate-950 text-gold-400 border border-slate-800 rounded-xl"><ShoppingBag size={20} /></div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Chiffre d'Affaires</span>
                      <div className="text-lg font-bold text-white mt-0.5">{formatFCFA(totalSalesRevenue)}</div>
                    </div>
                  </div>
                  <div className="glass-card bg-slate-900/50 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl"><TrendingUp size={20} /></div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Articles Vendus</span>
                      <div className="text-lg font-bold text-white mt-0.5">{totalItemsSold} pièces</div>
                    </div>
                  </div>
                </div>

                <div className="glass-card bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-4 bg-slate-900/60 border-b border-slate-800 no-print">
                    <h3 className="text-sm font-semibold text-slate-200">Volume de vente détaillé par modèle d'habit</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4">Photo</th>
                          <th className="px-6 py-4">Modèle</th>
                          <th className="px-6 py-4">Catégorie</th>
                          <th className="px-6 py-4 text-center">Vendu</th>
                          <th className="px-6 py-4 text-center">Restant</th>
                          <th className="px-6 py-4 text-center">% Vendu</th>
                          <th className="px-6 py-4 text-right">CA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {salesReportData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/10 transition text-xs">
                            <td className="px-6 py-4">
                              {item.image ? (
                                <div className="w-12 h-12 relative flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
                                  <img 
                                    src={item.image} 
                                    alt={item.name} 
                                    className="w-full h-full object-contain"
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
                                <div className="w-12 h-12 bg-slate-950 flex items-center justify-center rounded-lg border border-slate-800 text-slate-600 text-[10px]">
                                  Pas d'image
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-200">
                              {item.name}
                            </td>
                            <td className="px-6 py-4 text-slate-400">
                              {item.category}
                            </td>
                            <td className="px-6 py-4 text-center font-semibold text-slate-300">
                              {item.sold} pcs
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2.5 py-1 rounded text-xs font-semibold ${getStockStatusClass(item.remaining)}`}>
                                {item.remaining} pcs
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center font-semibold text-slate-300">
                              {item.percentSold.toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-white font-mono">
                              {formatFCFA(item.revenue)}
                            </td>
                          </tr>
                        ))}
                        {salesReportData.length === 0 && (
                          <tr>
                            <td colSpan="7" className="px-6 py-10 text-center text-slate-500">Aucune vente ou stock disponible sur cette période.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PRODUCTION REPORT VIEW */}
            {activeTab === 'production' && (
              <div className="space-y-6">
                
                {/* Production Indicators Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 no-print">
                  <div className="glass-card bg-slate-900/50 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-slate-950 text-gold-400 border border-slate-800 rounded-xl"><Hammer size={16} /></div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Confections Lancées</span>
                      <div className="text-md font-bold text-white mt-0.5">{totalProdOrders} lots</div>
                    </div>
                  </div>
                  <div className="glass-card bg-slate-900/50 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-slate-955 text-emerald-400 border border-slate-800 rounded-xl"><CheckCircle size={16} /></div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Robes reçues</span>
                      <div className="text-md font-bold text-white mt-0.5">{totalQuantityProduced} / {totalQuantityRequested}</div>
                    </div>
                  </div>
                  <div className="glass-card bg-slate-900/50 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-slate-950 text-rose-400 border border-slate-800 rounded-xl"><AlertCircle size={16} /></div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Taux Rebut / Défauts</span>
                      <div className="text-md font-bold text-white mt-0.5">
                        {totalQuantityProduced ? ((totalDefectives / (totalQuantityProduced + totalDefectives)) * 100).toFixed(1) : 0}% ({totalDefectives} pcs)
                      </div>
                    </div>
                  </div>
                  <div className="glass-card bg-slate-900/50 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-slate-950 text-sky-400 border border-slate-800 rounded-xl"><DollarSign size={16} /></div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Coûts Façon Total</span>
                      <div className="text-md font-bold text-white mt-0.5">{formatFCFA(totalFaconCost)}</div>
                    </div>
                  </div>
                </div>

                {/* Tableau Ateliers */}
                <div className="glass-card bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden mt-6">
                  <div className="p-4 bg-slate-900/60 border-b border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-200">Tableau des Ateliers</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4">Nom atelier</th>
                          <th className="px-6 py-4 text-center">Nombre de confections</th>
                          <th className="px-6 py-4 text-center">Robes demandées</th>
                          <th className="px-6 py-4 text-center">Robes reçues</th>
                          <th className="px-6 py-4 text-center">Robes manquantes</th>
                          <th className="px-6 py-4 text-center">Taux de réalisation</th>
                          <th className="px-6 py-4 text-right">Coût façon total</th>
                          <th className="px-6 py-4 text-right">Montant payé</th>
                          <th className="px-6 py-4 text-right">Reste à payer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {workshopStatsList.map((w, idx) => {
                          const missing = Math.max(0, w.qtyRequested - w.qtyProduced);
                          const remaining = Math.max(0, w.totalCost - w.totalPaid);
                          return (
                            <tr key={idx} className="hover:bg-slate-800/10 transition text-xs">
                              <td className="px-6 py-4 font-semibold text-slate-200">{w.name}</td>
                              <td className="px-6 py-4 text-center text-slate-300 font-mono">{w.ordersCount}</td>
                              <td className="px-6 py-4 text-center text-slate-400 font-mono">{w.qtyRequested} pcs</td>
                              <td className="px-6 py-4 text-center font-bold text-emerald-400 font-mono">{w.qtyProduced} pcs</td>
                              <td className="px-6 py-4 text-center text-rose-400 font-semibold font-mono">{missing} pcs</td>
                              <td className="px-6 py-4 text-center font-bold text-gold-400 font-mono">{w.realisationRate.toFixed(1)}%</td>
                              <td className="px-6 py-4 text-right text-white font-semibold font-mono">{formatFCFA(w.totalCost)}</td>
                              <td className="px-6 py-4 text-right text-emerald-400 font-semibold font-mono">{formatFCFA(w.totalPaid)}</td>
                              <td className="px-6 py-4 text-right text-rose-400 font-bold font-mono">{formatFCFA(remaining)}</td>
                            </tr>
                          );
                        })}
                        {workshopStatsList.length === 0 && (
                          <tr>
                            <td colSpan="9" className="px-6 py-10 text-center text-slate-500">Aucun atelier enregistré sur cette période.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Classement des ateliers */}
                <div className="glass-card bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden mt-6">
                  <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-200">Classement des ateliers</h3>
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">Du plus performant au moins performant</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4">Rang</th>
                          <th className="px-6 py-4">Atelier</th>
                          <th className="px-6 py-4 text-center">Nombre de confections</th>
                          <th className="px-6 py-4 text-center">Robes reçues</th>
                          <th className="px-6 py-4 text-center">Taux de réalisation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {rankedWorkshops.map((w, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/10 transition text-xs">
                            <td className="px-6 py-4 font-bold text-gold-500 font-mono">#{idx + 1}</td>
                            <td className="px-6 py-4 font-semibold text-slate-200">{w.name}</td>
                            <td className="px-6 py-4 text-center text-slate-300 font-mono">{w.ordersCount}</td>
                            <td className="px-6 py-4 text-center font-bold text-emerald-400 font-mono">{w.qtyProduced} pcs</td>
                            <td className="px-6 py-4 text-center font-bold text-gold-400 font-mono">{w.realisationRate.toFixed(1)}%</td>
                          </tr>
                        ))}
                        {rankedWorkshops.length === 0 && (
                          <tr>
                            <td colSpan="5" className="px-6 py-10 text-center text-slate-500">Aucun classement disponible.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tableau Confections */}
                <div className="glass-card bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden mt-6">
                  <div className="p-4 bg-slate-900/60 border-b border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-200">Tableau des Confections</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4">Référence</th>
                          <th className="px-6 py-4">Catégorie de robe</th>
                          <th className="px-6 py-4">Atelier</th>
                          <th className="px-6 py-4 text-center">Quantité demandée</th>
                          <th className="px-6 py-4 text-center">Quantité reçue</th>
                          <th className="px-6 py-4 text-center">Quantité manquante</th>
                          <th className="px-6 py-4 text-center">Date début</th>
                          <th className="px-6 py-4 text-center">Date prévue</th>
                          <th className="px-6 py-4 text-center">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {filteredProdOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-slate-800/10 transition text-xs">
                            <td className="px-6 py-4 font-semibold text-gold-500">{o.reference}</td>
                            <td className="px-6 py-4 text-slate-300">{o.category_name || o.model_name || 'Sans catégorie'}</td>
                            <td className="px-6 py-4 text-slate-200">{o.workshop_name}</td>
                            <td className="px-6 py-4 text-center text-slate-400 font-mono">{o.quantite_demandee} pcs</td>
                            <td className="px-6 py-4 text-center font-bold text-emerald-400 font-mono">{o.quantite_produite} pcs</td>
                            <td className="px-6 py-4 text-center font-semibold text-rose-400 font-mono">{o.quantite_manquante} pcs</td>
                            <td className="px-6 py-4 text-center text-slate-400 font-mono">{formatDate(o.date_debut)}</td>
                            <td className="px-6 py-4 text-center text-slate-400 font-mono">{formatDate(o.date_fin_prevue)}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2.5 py-1 rounded text-xs font-semibold ${getStatusBadgeClass(o.statut)}`}>
                                {getStatusLabel(o.statut)}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {filteredProdOrders.length === 0 && (
                          <tr>
                            <td colSpan="9" className="px-6 py-10 text-center text-slate-500">Aucune confection enregistrée sur cette période.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. EXPENSES REPORT VIEW */}
            {activeTab === 'expenses' && (
              <div className="space-y-6">
                
                {/* Expenses Indicator */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 no-print">
                  <div className="glass-card bg-slate-900/50 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-slate-950 text-rose-400 border border-slate-800 rounded-xl"><Receipt size={20} /></div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Charges Annexes cumulées</span>
                      <div className="text-lg font-bold text-white mt-0.5">{formatFCFA(totalExpensesAmount)}</div>
                    </div>
                  </div>
                </div>

                <div className="glass-card bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-4 bg-slate-900/60 border-b border-slate-800 no-print">
                    <h3 className="text-sm font-semibold text-slate-200">Charges d'exploitation réparties par catégories</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4">Catégorie de charge</th>
                          <th className="px-6 py-4 text-right">Montant total dépensé</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {expensesReportData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/10 transition text-xs">
                            <td className="px-6 py-4 font-semibold text-slate-200">{getExpenseLabel(item.category)}</td>
                            <td className="px-6 py-4 text-right font-bold text-white font-mono">{formatFCFA(item.amount)}</td>
                          </tr>
                        ))}
                        {expensesReportData.length === 0 && (
                          <tr>
                            <td colSpan="2" className="px-6 py-10 text-center text-slate-500">Aucune dépense enregistrée sur cette période.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 4. STOCKS REPORT VIEW */}
            {activeTab === 'stocks' && (
              <div className="space-y-6">
                
                {/* Alert Warning Box */}
                {(rawAlerts.length > 0 || finishedAlerts.length > 0) && (
                  <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-xs space-y-2 animate-fadeIn no-print">
                    <div className="font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <AlertCircle size={14} /> Attention : Ruptures ou stocks critiques détectés
                    </div>
                    <ul className="list-disc pl-4 text-slate-300 space-y-1">
                      {rawAlerts.map(m => {
                        const statusObj = getRawMaterialStatus(m.quantite_restante_metres, m.seuil_alerte);
                        return (
                          <li key={m.id}>
                            La matière première <strong>{m.type_matiere} {m.couleur ? `(${m.couleur})` : ''}</strong> nécessite votre attention : {statusObj.text} ({parseFloat(m.quantite_restante_metres).toLocaleString('fr-FR')} {m.unite_mesure} en stock, seuil : {m.seuil_alerte} {m.unite_mesure}).
                          </li>
                        );
                      })}
                      {finishedAlerts.map(f => {
                        const disponible = f.disponible !== undefined ? f.disponible : (f.quantite_reel - f.quantite_reservee);
                        const statusObj = getFinishedGoodStatus(disponible);
                        return (
                          <li key={f.id}>
                            Le vêtement fini <strong>{f.model_name || `Variante #${f.variant}`} ({f.sku})</strong> nécessite votre attention : {statusObj.text} ({disponible} pcs en magasin).
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Raw materials stocks */}
                  <div className="glass-card bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-slate-900/60 border-b border-slate-800">
                      <h3 className="text-sm font-semibold text-slate-200">Matières Premières</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                          <tr>
                            <th className="px-6 py-4">Nom matière</th>
                            <th className="px-6 py-4">Catégorie</th>
                            <th className="px-6 py-4">Couleur</th>
                            <th className="px-6 py-4 text-center">Quantité disponible</th>
                            <th className="px-6 py-4 text-center">Unité de mesure</th>
                            <th className="px-6 py-4 text-center">Seuil d'alerte</th>
                            <th className="px-6 py-4 text-center">Statut visuel</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {rawMaterials.map((m) => {
                            const statusObj = getRawMaterialStatus(m.quantite_restante_metres, m.seuil_alerte);
                            return (
                              <tr key={m.id} className="hover:bg-slate-800/10 transition text-xs">
                                <td className="px-6 py-4 font-semibold text-slate-200">
                                  {m.type_matiere}
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                  {getCategoryLabel(m.categorie) || m.categorie}
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                  {m.couleur || "-"}
                                </td>
                                <td className="px-6 py-4 text-center font-bold font-mono text-slate-300">
                                  {parseFloat(m.quantite_restante_metres).toLocaleString('fr-FR')}
                                </td>
                                <td className="px-6 py-4 text-center text-slate-400">
                                  {m.unite_mesure}
                                </td>
                                <td className="px-6 py-4 text-center text-slate-500 font-mono">
                                  {m.seuil_alerte}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-2.5 py-1 rounded text-xs font-semibold ${statusObj.class}`}>
                                    {statusObj.text}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {rawMaterials.length === 0 && (
                            <tr>
                              <td colSpan="7" className="px-6 py-10 text-center text-slate-500">Aucune matière première en base.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Finished Goods variant stocks */}
                  <div className="glass-card bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-slate-900/60 border-b border-slate-800">
                      <h3 className="text-sm font-semibold text-slate-200">Habits Finis en Magasin</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                          <tr>
                            <th className="px-6 py-4">Photo</th>
                            <th className="px-6 py-4">Modèle</th>
                            <th className="px-6 py-4">Catégorie</th>
                            <th className="px-6 py-4 text-center">Disponible</th>
                            <th className="px-6 py-4 text-center">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {finishedStocks.map((f) => {
                            const disponible = f.disponible !== undefined ? f.disponible : (f.quantite_reel - f.quantite_reservee);
                            const statusObj = getFinishedGoodStatus(disponible);
                            const categoryText = f.prix_vente_conseille ? formatFCFA(f.prix_vente_conseille) : (f.category_name || "Sans catégorie");

                            return (
                              <tr key={f.id} className="hover:bg-slate-800/10 transition text-xs">
                                <td className="px-6 py-4">
                                  {f.model_image ? (
                                    <div className="w-12 h-12 relative flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
                                      <img 
                                        src={f.model_image} 
                                        alt={f.model_name} 
                                        className="w-full h-full object-contain"
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
                                    <div className="w-12 h-12 bg-slate-950 flex items-center justify-center rounded-lg border border-slate-800 text-slate-600 text-[10px]">
                                      Pas d'image
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-slate-200">{f.model_name || `Variante #${f.variant}`}</div>
                                  <div className="text-slate-500 text-[10px] font-mono">{f.sku} (T: {f.taille} • C: {f.couleur})</div>
                                </td>
                                <td className="px-6 py-4 text-slate-400 font-semibold">
                                  {categoryText}
                                </td>
                                <td className="px-6 py-4 text-center font-bold font-mono text-slate-300">
                                  {disponible} {disponible > 1 ? "pièces" : "pièce"}
                                </td>
                                <td className="px-6 py-4 text-center font-semibold">
                                  <span className={`px-2.5 py-1 rounded text-xs font-semibold ${statusObj.class}`}>
                                    {statusObj.text}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {finishedStocks.length === 0 && (
                            <tr>
                              <td colSpan="5" className="px-6 py-10 text-center text-slate-500">Aucun produit fini en magasin.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* 5. PROFITABILITY REPORT VIEW */}
            {activeTab === 'profitability' && (
              <div className="space-y-6">
                
                {/* Financial Summary Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <BarChart3 className="text-gold-400" size={22} />
                      Bénéfice & Performance d'Exploitation Estimés
                    </h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-850">Calculé en temps réel</span>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Revenue */}
                    <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-800/40">
                      <span className="text-slate-400">Chiffre d'affaires (+)</span>
                      <span className="font-bold text-emerald-400 font-mono">+{formatFCFA(totalSalesRevenue)}</span>
                    </div>

                    {/* General expenses */}
                    <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-800/40">
                      <span className="text-slate-400">Dépenses (-)</span>
                      <span className="font-bold text-rose-400 font-mono">-{formatFCFA(totalExpensesAmount)}</span>
                    </div>

                    {/* Facon cost */}
                    <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-800/40">
                      <span className="text-slate-400">Coût de confection (-)</span>
                      <span className="font-bold text-rose-400 font-mono">-{formatFCFA(totalFaconCost)}</span>
                    </div>

                    {/* Salary costs */}
                    <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-800/40">
                      <span className="text-slate-400">Salaires (-)</span>
                      <span className="font-bold text-rose-400 font-mono">-{formatFCFA(totalSalariesDue)}</span>
                    </div>

                    {/* Net profit */}
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-850 text-center flex flex-col justify-center items-center">
                      <span className="text-xs uppercase tracking-widest font-extrabold text-gold-400">Bénéfice estimé</span>
                      <div className={`text-3xl font-extrabold font-mono mt-2 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatFCFA(netProfit)}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">
                        Calcul : Chiffre d'affaires - Dépenses - Coût de confection - Salaires.
                      </p>
                    </div>

                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};

export default Rapports;
