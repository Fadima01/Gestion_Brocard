import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  TrendingUp, Wallet, Landmark, Calendar, ShoppingCart, Hammer, AlertTriangle, Store, ArrowUpRight, FileText, CheckCircle2, AlertCircle
} from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/core/dashboard/');
        setData(response.data);
      } catch (err) {
        setError("Erreur lors de la récupération des statistiques du tableau de bord.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-800 animate-pulse rounded-lg"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-900 animate-pulse rounded-xl border border-slate-850"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-lg bg-rose-950/20 border border-rose-800/30 text-rose-400">
        {error || "Une erreur inconnue s'est produite."}
      </div>
    );
  }

  const { indicators, alertes_stock_faible } = data;

  // Format currency helper
  const formatFCFA = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('fr-FR') + ' FCFA';
  };

  const cardStats = [
    { label: "Chiffre d'Affaires du Jour", val: formatFCFA(indicators.chiffre_d_affaires_jour), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: "Chiffre d'Affaires du Mois", val: formatFCFA(indicators.chiffre_d_affaires_mois), icon: Calendar, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: "Bénéfice Estimé du Mois", val: formatFCFA(indicators.benefice_estime_mois), icon: ArrowUpRight, color: 'text-amber-400', bg: 'bg-amber-500/10', subtitle: "Après déduction COGS, dépenses et salaires" },
    { label: "Dépenses du Mois", val: formatFCFA(indicators.montant_depenses_mois), icon: Wallet, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { label: "Stock réel disponible", val: `${indicators.stock_reel_disponible || 0} pièces`, icon: Store, color: 'text-gold-400', bg: 'bg-gold-500/10', subtitle: "Robes en boutique prêtes à la vente" },
    { label: "Stock faible", val: `${indicators.produits_finis_stock_faible || 0} modèles`, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', subtitle: "Quantité entre 1 et 4 pièces" },
    { label: "Rupture", val: `${indicators.produits_finis_en_rupture || 0} modèles`, icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', subtitle: "Quantité totalement épuisée" },
    { label: "Commandes en Attente", val: `${indicators.commandes_en_attente || 0} commande${indicators.commandes_en_attente === 1 ? '' : 's'}`, icon: FileText, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { label: "Nombre de Ventes (Jour)", val: `${indicators.ventes_du_jour} vente(s)`, icon: ShoppingCart, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: "Confections en Cours", val: `${indicators.production_en_cours} lot(s)`, icon: Hammer, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: "OC en Réception Partielle", val: `${indicators.production_reception_partielle || 0} lot(s)`, icon: AlertCircle, color: 'text-blue-400', bg: 'bg-blue-500/10', subtitle: "Livraisons partielles reçues" },
    { label: "Confections Terminées (Mois)", val: `${indicators.production_terminees_mois} lot(s)`, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: "Robes demandées (Mois)", val: `${indicators.robes_demandees || 0} pièces`, icon: Hammer, color: 'text-slate-350', bg: 'bg-slate-500/10', subtitle: "Robes envoyées en confection ce mois-ci" },
    { label: "Robes reçues (Mois)", val: `${indicators.robes_receues || 0} pièces`, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', subtitle: "Robes réceptionnées conformes ce mois-ci" },
    { label: "Robes manquantes (Mois)", val: `${indicators.robes_manquantes || 0} pièces`, icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', subtitle: "Pertes ou robes manquantes" },
    { label: "Taux de réalisation", val: `${indicators.taux_realisation || 0} %`, icon: TrendingUp, color: 'text-gold-400', bg: 'bg-gold-500/10', subtitle: "Pourcentage de réalisation (reçues / demandées)" },
  ];

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Tableau de Bord Direction</h1>
        <p className="text-sm text-slate-400 mt-1">
          Suivi Brocard • Tableau de bord de pilotage et indicateurs clés d'activité
        </p>
      </div>

      {/* Caisse Status and Inventory Alerts Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Cash session status card replaced by Caisse Globale */}
        <div className="p-5 rounded-xl border flex items-center justify-between bg-slate-900 border-slate-800 text-slate-400">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-gold-500/15 text-gold-400">
              <Landmark size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Caisse Globale</h3>
              <p className="text-sm font-bold text-gold-400 mt-0.5">
                {formatFCFA(indicators.solde_caisse_globale)}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-gold-500/20 text-gold-300">
            Solde Actuel
          </span>
        </div>

        {/* Raw material alerts card */}
        <div className={`p-5 rounded-xl border flex items-center justify-between ${indicators.matieres_premieres_en_alerte > 0 ? 'bg-rose-950/20 border-rose-800/40 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${indicators.matieres_premieres_en_alerte > 0 ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-800 text-slate-500'}`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Matières Premières</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {indicators.matieres_premieres_en_alerte > 0 
                  ? `${indicators.matieres_premieres_en_alerte} matière(s) sous le seuil d'alerte !`
                  : "Aucune alerte de stock matières premières."}
              </p>
            </div>
          </div>
          {indicators.matieres_premieres_en_alerte > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 animate-pulse">
              {indicators.matieres_premieres_en_alerte} ALERTE(S)
            </span>
          )}
        </div>

        {/* Finished goods alerts card */}
        <div className={`p-5 rounded-xl border flex items-center justify-between ${(indicators.produits_finis_en_rupture > 0 || indicators.produits_finis_stock_faible > 0) ? 'bg-rose-950/20 border-rose-800/40 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${(indicators.produits_finis_en_rupture > 0 || indicators.produits_finis_stock_faible > 0) ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-800 text-slate-500'}`}>
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Produits Finis</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {(indicators.produits_finis_en_rupture > 0 || indicators.produits_finis_stock_faible > 0) 
                  ? `${indicators.produits_finis_en_rupture} en rupture, ${indicators.produits_finis_stock_faible} faible(s).`
                  : "Tous les produits finis ont un stock suffisant."}
              </p>
            </div>
          </div>
          {(indicators.produits_finis_en_rupture > 0 || indicators.produits_finis_stock_faible > 0) && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300">
              {indicators.produits_finis_en_rupture + indicators.produits_finis_stock_faible} ALERTE(S)
            </span>
          )}
        </div>

      </div>

      {/* Main KPI Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-card p-6 rounded-2xl flex flex-col justify-between h-36 relative group hover:border-gold-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.label}</span>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${stat.bg} ${stat.color}`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-white tracking-tight">
                  {stat.val}
                </div>
                {stat.subtitle && (
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">{stat.subtitle}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Layout - Low Stock Warning List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Low Stock Alerts Table */}
        <div className="lg:col-span-3 glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2.5 text-amber-400 border-b border-slate-800 pb-3">
            <AlertTriangle size={20} />
            <h2 className="text-lg font-bold text-slate-100">Habits en Stock Faible ou Rupture</h2>
            <span className="text-xs text-slate-400 font-normal ml-auto">(Seuil général de vigilance &lt; 5 pièces en boutique)</span>
          </div>
          {alertes_stock_faible.length === 0 ? (
            <p className="text-sm text-slate-500">Tous les produits finis ont un niveau de stock confortable.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5">Photo</th>
                    <th>Code</th>
                    <th>Modèle d'habit</th>
                    <th>Catégorie Prix</th>
                    <th className="text-right">Quantité Disponible</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {alertes_stock_faible.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/20 transition-all">
                      <td className="py-3">
                        {item.photo ? (
                          <img 
                            src={item.photo} 
                            alt={item.name} 
                            className="w-[50px] h-[50px] object-contain rounded-md bg-slate-950/40"
                          />
                        ) : (
                          <div className="w-[50px] h-[50px] flex items-center justify-center rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-500 text-center font-medium leading-tight px-1">
                            Aucune photo
                          </div>
                        )}
                      </td>
                      <td className="font-semibold text-gold-500">{item.sku}</td>
                      <td>{item.name}</td>
                      <td>{formatFCFA(item.category_price)}</td>
                      <td className="text-right font-bold">{item.stock} pièce(s)</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.stock === 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : item.stock >= 1 && item.stock <= 4 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                          {item.stock === 0 ? 'Rupture' : item.stock >= 1 && item.stock <= 4 ? 'Stock faible' : 'En stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
