import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, History, Filter, Calendar, User, Info, FileSpreadsheet } from 'lucide-react';

const JournalActivite = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [error, setError] = useState(null);

  const ACTIONS = [
    { value: 'création de vente', label: 'Création de vente' },
    { value: 'annulation de vente', label: 'Annulation de vente' },
    { value: 'création de réservation', label: 'Création de réservation' },
    { value: 'annulation de réservation', label: 'Annulation de réservation' },
    { value: 'modification de prix', label: 'Modification de prix' },
    { value: 'archivage de produit', label: 'Archivage de produit' },
    { value: 'ouverture de caisse', label: 'Ouverture de caisse' },
    { value: 'fermeture de caisse', label: 'Fermeture de caisse' },
    { value: 'création de fabrication', label: 'Création de confection' },
    { value: 'annulation de fabrication', label: 'Annulation de confection' }
  ];

  const getActionLabel = (action) => {
    const act = ACTIONS.find(a => a.value === action);
    return act ? act.label : action;
  };

  const cleanFullName = (fullName, username) => {
    if (!fullName) return username || 'Système';
    const clean = fullName.replace(/(null|undefined)/gi, '').trim();
    return clean || username || 'Système';
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = '/core/activity-logs/';
      const params = [];
      if (search) params.push(`search=${search}`);
      if (actionFilter) params.push(`action=${actionFilter}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await api.get(url);
      setLogs(res.data.results || res.data);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la récupération du journal d'activité.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, actionFilter]);

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('fr-FR');
  };

  const getActionBadgeClass = (action) => {
    switch (action) {
      case 'création de vente':
      case 'création de réservation':
      case 'création de fabrication':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'annulation de vente':
      case 'annulation de réservation':
      case 'annulation de fabrication':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'modification de prix':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'ouverture de caisse':
      case 'fermeture de caisse':
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'archivage de produit':
        return 'bg-slate-500/10 text-slate-400 border border-slate-550/20';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) return;
    
    // Headers
    const headers = ["ID", "Utilisateur", "Rôle/Identifiant", "Date & Heure", "Action", "Détails"];
    
    // Format rows
    const rows = logs.map(log => [
      log.id,
      cleanFullName(log.user_fullname, log.username),
      log.username || "-",
      formatDateTime(log.timestamp),
      getActionLabel(log.action),
      log.details.replace(/"/g, '""')
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `journal_activite_brocard_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Journal d'Activité Global</h1>
          <p className="text-sm text-slate-400 mt-1">Audit de sécurité et traçabilité des opérations critiques de l'ERP Suivi Brocard</p>
        </div>
        <button 
          onClick={exportCSV}
          disabled={logs.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold transition-all text-sm disabled:opacity-50 shadow-md"
        >
          <FileSpreadsheet size={16} className="text-emerald-500" />
          Exporter en Excel / CSV
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-3 text-slate-500" />
          <input 
            type="text"
            placeholder="Rechercher dans les détails des opérations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-850 rounded-lg text-white focus:outline-none focus:border-gold-500/40 text-sm"
          />
        </div>
        <div className="w-full sm:w-64">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-white focus:outline-none text-sm"
          >
            <option value="">-- Filtrer par action --</option>
            {ACTIONS.map(act => (
              <option key={act.value} value={act.value}>{act.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs View */}
      {loading ? (
        <div className="text-center py-12 text-gold-500 font-medium">Chargement du journal d'activité...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border border-slate-850 rounded-2xl bg-slate-900/10">
          Aucun log d'activité enregistré pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div 
              key={log.id} 
              className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:border-slate-700/80 transition-all duration-200"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-slate-950 text-gold-400 border border-slate-800 mt-1 md:mt-0 flex-shrink-0">
                  <History size={16} />
                </div>
                
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getActionBadgeClass(log.action)}`}>
                      {getActionLabel(log.action)}
                    </span>
                    <span className="text-slate-500 text-xs flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDateTime(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed break-words font-medium">
                    {log.details}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-850 max-w-xs self-end md:self-auto flex-shrink-0">
                <User size={12} className="text-slate-500" />
                <span className="text-slate-400 text-xs font-semibold truncate" title={cleanFullName(log.user_fullname, log.username)}>
                  {cleanFullName(log.user_fullname, log.username)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default JournalActivite;
