import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { ArrowLeftRight, Plus, Trash2, Calendar, FileText, CheckCircle, AlertCircle, ShoppingBag, Eye } from 'lucide-react';

const REASONS = [
  { value: 'WRONG_SIZE', label: 'Taille incorrecte' },
  { value: 'WRONG_COLOR', label: 'Couleur incorrecte' },
  { value: 'DEFECTIVE', label: 'Défaut produit' },
  { value: 'REFUSED_DELIVERY', label: 'Refus de livraison' }
];

const REASON_LABELS = {
  WRONG_SIZE: 'Taille incorrecte',
  WRONG_COLOR: 'Couleur incorrecte',
  DEFECTIVE: 'Défaut produit',
  REFUSED_DELIVERY: 'Refus de livraison'
};

const STATUS_LABELS = {
  RECEIVED: 'Reçu',
  INSPECTED: 'Inspecté',
  CLOSED: 'Clôturé'
};

const STATUS_COLORS = {
  RECEIVED: 'bg-blue-950 text-blue-400 border border-blue-900/50',
  INSPECTED: 'bg-amber-950 text-amber-400 border border-amber-900/50',
  CLOSED: 'bg-emerald-950 text-emerald-400 border border-emerald-900/50'
};

const Retours = () => {
  const [returns, setReturns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Modal Detail View
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Form State
  const [orderId, setOrderId] = useState('');
  const [statutRetour, setStatutRetour] = useState('RECEIVED');
  const [montantRembourse, setMontantRembourse] = useState('0');
  const [accrediteAvoir, setAccrediteAvoir] = useState('0');
  
  // Return Lines Form State
  const [formLines, setFormLines] = useState([
    { variant: '', quantite: '1', motif: 'WRONG_SIZE', reintegre_stock: true, notes: '' }
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [retRes, orderRes, varRes] = await Promise.all([
        api.get('/retours/returns/'),
        api.get('/ventes/orders/'),
        api.get('/catalogue/variants/')
      ]);
      setReturns(retRes.data.results || retRes.data);
      setOrders(orderRes.data.results || orderRes.data);
      setVariants(varRes.data.results || varRes.data);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la récupération des données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddLine = () => {
    setFormLines([
      ...formLines,
      { variant: '', quantite: '1', motif: 'WRONG_SIZE', reintegre_stock: true, notes: '' }
    ]);
  };

  const handleRemoveLine = (index) => {
    setFormLines(formLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formLines];
    newLines[index][field] = value;
    setFormLines(newLines);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderId) {
      setError("Veuillez sélectionner la commande d'origine.");
      return;
    }
    if (formLines.some(line => !line.variant)) {
      setError("Veuillez sélectionner la variante pour toutes les lignes.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      // 1. Create CustomerReturn
      const returnPayload = {
        order: parseInt(orderId),
        statut_retour: statutRetour,
        montant_rembourse: parseFloat(montantRembourse || 0),
        accredite_avoir: parseFloat(accrediteAvoir || 0)
      };

      const retResponse = await api.post('/retours/returns/', returnPayload);
      const newReturnId = retResponse.data.id;

      // 2. Create each line
      for (const line of formLines) {
        await api.post('/retours/lines/', {
          customer_return: newReturnId,
          variant: parseInt(line.variant),
          quantite: parseInt(line.quantite),
          motif: line.motif,
          reintegre_stock: line.reintegre_stock,
          notes: line.notes
        });
      }

      setSuccess(true);
      setOrderId('');
      setStatutRetour('RECEIVED');
      setMontantRembourse('0');
      setAccrediteAvoir('0');
      setFormLines([{ variant: '', quantite: '1', motif: 'WRONG_SIZE', reintegre_stock: true, notes: '' }]);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Erreur lors de la création du retour.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Retours Marchandises</h1>
        <p className="text-sm text-slate-400 mt-1">Saisie des retours clients, gestion des remboursements/avoirs et réintégration de stock</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle size={16} />
          <span>Retour client enregistré et stock mis à jour.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Create Return Form */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl border border-slate-800 p-6 bg-slate-900/50 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <ArrowLeftRight className="text-gold-500" size={20} />
              Enregistrer un retour
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Select Order */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Commande d'origine
                </label>
                <select
                  required
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-gold-500 outline-none"
                >
                  <option value="">Sélectionner...</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      Ref: {o.reference} (Client: {o.customer_name || o.customer})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status & Refunds */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Statut du retour</label>
                  <select
                    value={statutRetour}
                    onChange={(e) => setStatutRetour(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-gold-500 outline-none"
                  >
                    <option value="RECEIVED">Reçu</option>
                    <option value="INSPECTED">Inspecté</option>
                    <option value="CLOSED">Clôturé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Remboursement Espèces</label>
                  <input
                    type="number"
                    value={montantRembourse}
                    onChange={(e) => setMontantRembourse(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Crédit Avoir</label>
                  <input
                    type="number"
                    value={accrediteAvoir}
                    onChange={(e) => setAccrediteAvoir(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Lines subform */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Articles retournés</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-gold-500 hover:text-gold-400 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus size={14} /> Ajouter
                  </button>
                </div>

                {formLines.map((line, index) => (
                  <div key={index} className="bg-slate-950/50 border border-slate-850 p-3 rounded-xl space-y-2 relative">
                    {formLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(index)}
                        className="absolute right-2 top-2 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    {/* Select Variant */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Variante d'habit</label>
                      <select
                        required
                        value={line.variant}
                        onChange={(e) => handleLineChange(index, 'variant', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="">Sélectionner...</option>
                        {variants.map(v => (
                          <option key={v.id} value={v.id}>{v.sku} ({v.color} - {v.size})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Quantité</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={line.quantite}
                          onChange={(e) => handleLineChange(index, 'quantite', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Motif</label>
                        <select
                          value={line.motif}
                          onChange={(e) => handleLineChange(index, 'motif', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                        >
                          {REASONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Reintegrate stock */}
                    <div className="flex items-center gap-2 pt-1.5">
                      <input
                        type="checkbox"
                        id={`reintegre-${index}`}
                        checked={line.reintegre_stock}
                        onChange={(e) => handleLineChange(index, 'reintegre_stock', e.target.checked)}
                        className="rounded border-slate-800 bg-slate-900 text-gold-500 focus:ring-gold-500 h-3.5 w-3.5"
                      />
                      <label htmlFor={`reintegre-${index}`} className="text-[10px] text-slate-400 cursor-pointer">
                        Réintégrer au stock commercialisable
                      </label>
                    </div>

                    {/* Notes */}
                    <div>
                      <input
                        type="text"
                        placeholder="Notes de contrôle..."
                        value={line.notes}
                        onChange={(e) => handleLineChange(index, 'notes', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-400 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Return */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition duration-200 text-center flex items-center justify-center gap-2 text-sm"
              >
                {submitting ? 'Validation...' : 'Enregistrer le Retour'}
              </button>
            </form>
          </div>
        </div>

        {/* List of Returns */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
            <div className="p-4 bg-slate-900/60 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200">Journal des retours clients</h3>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gold-500 font-medium">Chargement des retours...</div>
            ) : returns.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">Aucun retour enregistré.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Commande</th>
                      <th className="px-6 py-4 text-center">Nbre Lignes</th>
                      <th className="px-6 py-4 text-right">Remboursement</th>
                      <th className="px-6 py-4 text-right">Crédit d'avoir</th>
                      <th className="px-6 py-4 text-center">Statut</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {returns.map((ret) => {
                      const lineCount = ret.lines ? ret.lines.length : 0;
                      return (
                        <tr key={ret.id} className="hover:bg-slate-800/10 transition">
                          <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                            {new Date(ret.date_retour).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-200">
                            Commande #{ret.order}
                          </td>
                          <td className="px-6 py-4 text-center text-slate-400">{lineCount}</td>
                          <td className="px-6 py-4 text-right text-rose-400 font-bold font-mono">
                            {parseFloat(ret.montant_rembourse).toLocaleString()} F
                          </td>
                          <td className="px-6 py-4 text-right text-blue-400 font-bold font-mono">
                            {parseFloat(ret.accredite_avoir).toLocaleString()} F
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase ${STATUS_COLORS[ret.statut_retour]}`}>
                              {STATUS_LABELS[ret.statut_retour] || ret.statut_retour}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setSelectedReturn(ret)}
                              className="text-slate-500 hover:text-gold-500 p-1.5 rounded-lg hover:bg-slate-800/60 transition"
                              title="Voir les détails"
                            >
                              <Eye size={16} />
                            </button>
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

      {/* Return detail Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-xl w-full border border-slate-800 bg-slate-950 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-white font-bold text-lg">
                Détails du retour client #{selectedReturn.id}
              </h3>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[selectedReturn.statut_retour]}`}>
                {STATUS_LABELS[selectedReturn.statut_retour]}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs text-slate-300 bg-slate-900/30 p-3 rounded-xl border border-slate-850">
              <div>
                <strong>Commande d'origine:</strong> Commande #{selectedReturn.order}
              </div>
              <div>
                <strong>Date du retour:</strong> {new Date(selectedReturn.date_retour).toLocaleString('fr-FR')}
              </div>
              <div>
                <strong>Montant Remboursé:</strong> {parseFloat(selectedReturn.montant_rembourse).toLocaleString()} FCFA (Espèces)
              </div>
              <div>
                <strong>Crédit Avoir accordé:</strong> {parseFloat(selectedReturn.accredite_avoir).toLocaleString()} FCFA
              </div>
            </div>

            {/* Lines list */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Articles retournés</h4>
              {selectedReturn.lines && selectedReturn.lines.length > 0 ? (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-500 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-2">Variante SKU / ID</th>
                        <th className="px-4 py-2 text-center">Quantité</th>
                        <th className="px-4 py-2">Motif</th>
                        <th className="px-4 py-2 text-center">Stock</th>
                        <th className="px-4 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {selectedReturn.lines.map((line) => (
                        <tr key={line.id}>
                          <td className="px-4 py-2.5 font-mono text-gold-500">
                            Variante #{line.variant}
                          </td>
                          <td className="px-4 py-2.5 text-center text-slate-200 font-bold">{line.quantite} pcs</td>
                          <td className="px-4 py-2.5 text-slate-300">{REASON_LABELS[line.motif] || line.motif}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${line.reintegre_stock ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                              {line.reintegre_stock ? 'Réintégré' : 'Quarantaine'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 italic text-[10px]">{line.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Aucun détail d'article enregistré.</p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedReturn(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition"
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

export default Retours;
