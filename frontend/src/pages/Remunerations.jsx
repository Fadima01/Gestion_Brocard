import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { formatFullName } from '../store/authContext';
import { Users, CreditCard, DollarSign, Calendar, FileText, CheckCircle, XCircle, Plus, AlertCircle, Award } from 'lucide-react';

const ADVANCE_STATUS_COLORS = {
  PENDING: 'bg-amber-950 text-amber-400 border border-amber-900/50',
  APPROVED: 'bg-emerald-950 text-emerald-400 border border-emerald-900/50',
  DEDUCTED: 'bg-blue-950 text-blue-400 border border-blue-900/50',
  REJECTED: 'bg-rose-950/40 text-rose-400 border border-rose-900/50'
};

const ADVANCE_STATUS_LABELS = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  DEDUCTED: 'Déduite',
  REJECTED: 'Rejetée'
};

const PAYMENT_STATUS_COLORS = {
  UNPAID: 'bg-rose-950/40 text-rose-400 border border-rose-900/50',
  PARTIALLY_PAID: 'bg-amber-950 text-amber-400 border border-amber-900/50',
  PAID: 'bg-emerald-950 text-emerald-400 border border-emerald-900/50',
  REFUNDED: 'bg-slate-900 text-slate-400 border border-slate-800'
};

const PAYMENT_STATUS_LABELS = {
  UNPAID: 'Non payé',
  PARTIALLY_PAID: 'Partiel',
  PAID: 'Payé',
  REFUNDED: 'Remboursé'
};

const cleanFullName = (fullName, fallback) => {
  if (!fullName) return fallback;
  const clean = fullName.replace(/(null|undefined)/gi, '').trim();
  return clean || fallback;
};

const Remunerations = () => {
  const [tab, setTab] = useState('members'); // 'members', 'payrolls', 'advances'
  const [members, setMembers] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals & States
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  // Inputs
  const [memberInput, setMemberInput] = useState({
    first_name: '',
    last_name: '',
    role: '',
    telephone: '',
    remuneration_mensuelle_standard: '',
    date_embauche: new Date().toISOString().split('T')[0],
    est_actif: true
  });

  const [payrollInput, setPayrollInput] = useState({
    member_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const [advanceInput, setAdvanceInput] = useState({
    member: '',
    amount: '',
    notes: ''
  });

  const [payInput, setPayInput] = useState({
    amount: '',
    payment_mode: 'Espèces',
    transaction_reference: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (tab === 'members') {
        const res = await api.get('/remunerations/members/');
        setMembers(res.data.results || res.data);
      } else if (tab === 'payrolls') {
        const [payRes, memRes] = await Promise.all([
          api.get('/remunerations/payrolls/'),
          api.get('/remunerations/members/?est_actif=True')
        ]);
        setPayrolls(payRes.data.results || payRes.data);
        setMembers(memRes.data.results || memRes.data);
      } else if (tab === 'advances') {
        const [advRes, memRes] = await Promise.all([
          api.get('/remunerations/advances/'),
          api.get('/remunerations/members/?est_actif=True')
        ]);
        setAdvances(advRes.data.results || advRes.data);
        setMembers(memRes.data.results || memRes.data);
      }
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la récupération des données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tab]);

  // Create member
  const handleCreateMember = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await api.post('/remunerations/members/', memberInput);
      setMemberInput({
        first_name: '',
        last_name: '',
        role: '',
        telephone: '',
        remuneration_mensuelle_standard: '',
        date_embauche: new Date().toISOString().split('T')[0],
        est_actif: true
      });
      setShowMemberForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Erreur de validation.");
    }
  };

  // Generate payroll
  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await api.post('/remunerations/payrolls/generate/', {
        member_id: parseInt(payrollInput.member_id),
        month: parseInt(payrollInput.month),
        year: parseInt(payrollInput.year)
      });
      setShowPayrollForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.detail || "Erreur lors de la génération.");
    }
  };

  // Create advance
  const handleCreateAdvance = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await api.post('/remunerations/advances/', {
        member: parseInt(advanceInput.member),
        amount: parseFloat(advanceInput.amount),
        notes: advanceInput.notes
      });
      setAdvanceInput({ member: '', amount: '', notes: '' });
      setShowAdvanceForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Erreur de validation.");
    }
  };

  // Approve advance
  const handleApproveAdvance = async (id) => {
    try {
      setError(null);
      await api.post(`/remunerations/advances/${id}/approve/`);
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'approbation.");
    }
  };

  // Register payout
  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await api.post(`/remunerations/payrolls/${selectedPayroll.id}/pay/`, {
        amount: parseFloat(payInput.amount),
        payment_mode: payInput.payment_mode,
        transaction_reference: payInput.transaction_reference,
        notes: payInput.notes
      });
      setShowPayModal(false);
      setSelectedPayroll(null);
      setPayInput({ amount: '', payment_mode: 'Espèces', transaction_reference: '', notes: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Erreur de paiement.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Rémunérations & Paie</h1>
          <p className="text-sm text-slate-400 mt-1">Gestion des collaborateurs, fiches de paie mensuelles et avances sur salaires</p>
        </div>
        
        {/* Quick actions depending on tab */}
        <div className="flex items-center gap-2">
          {tab === 'members' && (
            <button
              onClick={() => setShowMemberForm(!showMemberForm)}
              className="bg-gold-600 hover:bg-gold-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition"
            >
              <Plus size={16} /> Enregistrer un membre
            </button>
          )}
          {tab === 'payrolls' && (
            <button
              onClick={() => setShowPayrollForm(!showPayrollForm)}
              className="bg-gold-600 hover:bg-gold-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition"
            >
              <Calendar size={16} /> Générer une fiche
            </button>
          )}
          {tab === 'advances' && (
            <button
              onClick={() => setShowAdvanceForm(!showAdvanceForm)}
              className="bg-gold-600 hover:bg-gold-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition"
            >
              <Plus size={16} /> Demander une avance
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setTab('members')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${tab === 'members' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Users size={16} /> Collaborateurs
        </button>
        <button
          onClick={() => setTab('payrolls')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${tab === 'payrolls' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <CreditCard size={16} /> Bulletins de paie
        </button>
        <button
          onClick={() => setTab('advances')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${tab === 'advances' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <DollarSign size={16} /> Avances sur salaire
        </button>
      </div>

      {/* Forms Drawer/Collapsible */}
      {showMemberForm && tab === 'members' && (
        <div className="glass-card rounded-2xl border border-slate-800 p-6 max-w-xl bg-slate-900/40">
          <h3 className="text-white font-semibold text-base mb-4">Embaucher un nouveau collaborateur</h3>
          <form onSubmit={handleCreateMember} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Prénom</label>
              <input
                type="text"
                required
                value={memberInput.first_name}
                onChange={(e) => setMemberInput({...memberInput, first_name: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nom</label>
              <input
                type="text"
                required
                value={memberInput.last_name}
                onChange={(e) => setMemberInput({...memberInput, last_name: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Poste / Rôle</label>
              <input
                type="text"
                required
                placeholder="Ex: Couturier, Vendeur..."
                value={memberInput.role}
                onChange={(e) => setMemberInput({...memberInput, role: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Téléphone</label>
              <input
                type="text"
                required
                placeholder="+22890909090"
                value={memberInput.telephone}
                onChange={(e) => setMemberInput({...memberInput, telephone: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Salaire Mensuel Standard</label>
              <input
                type="number"
                required
                placeholder="FCFA"
                value={memberInput.remuneration_mensuelle_standard}
                onChange={(e) => setMemberInput({...memberInput, remuneration_mensuelle_standard: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Date d'embauche</label>
              <input
                type="date"
                required
                value={memberInput.date_embauche}
                onChange={(e) => setMemberInput({...memberInput, date_embauche: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowMemberForm(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="bg-gold-600 hover:bg-gold-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs"
              >
                Valider l'embauche
              </button>
            </div>
          </form>
        </div>
      )}

      {showPayrollForm && tab === 'payrolls' && (
        <div className="glass-card rounded-2xl border border-slate-800 p-6 max-w-md bg-slate-900/40">
          <h3 className="text-white font-semibold text-base mb-4">Générer la fiche de paie</h3>
          <form onSubmit={handleGeneratePayroll} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Collaborateur</label>
              <select
                required
                value={payrollInput.member_id}
                onChange={(e) => setPayrollInput({...payrollInput, member_id: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-gold-500 outline-none"
              >
                <option value="">Sélectionner...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{formatFullName(m.first_name, m.last_name, '')} ({m.role})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Mois (1-12)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="12"
                  value={payrollInput.month}
                  onChange={(e) => setPayrollInput({...payrollInput, month: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Année</label>
                <input
                  type="number"
                  required
                  value={payrollInput.year}
                  onChange={(e) => setPayrollInput({...payrollInput, year: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowPayrollForm(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="bg-gold-600 hover:bg-gold-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs"
              >
                Générer & déduire les avances
              </button>
            </div>
          </form>
        </div>
      )}

      {showAdvanceForm && tab === 'advances' && (
        <div className="glass-card rounded-2xl border border-slate-800 p-6 max-w-md bg-slate-900/40">
          <h3 className="text-white font-semibold text-base mb-4">Faire une demande d'acompte</h3>
          <form onSubmit={handleCreateAdvance} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Collaborateur</label>
              <select
                required
                value={advanceInput.member}
                onChange={(e) => setAdvanceInput({...advanceInput, member: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-gold-500 outline-none"
              >
                <option value="">Sélectionner...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{formatFullName(m.first_name, m.last_name, '')} ({m.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Montant demandé</label>
              <input
                type="number"
                required
                placeholder="FCFA"
                value={advanceInput.amount}
                onChange={(e) => setAdvanceInput({...advanceInput, amount: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Explication / Notes</label>
              <textarea
                value={advanceInput.notes}
                onChange={(e) => setAdvanceInput({...advanceInput, notes: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
                rows="2"
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowAdvanceForm(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="bg-gold-600 hover:bg-gold-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs"
              >
                Soumettre la demande
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Content Areas */}
      {loading ? (
        <div className="text-center py-12 text-gold-500">Chargement des données de rémunération...</div>
      ) : (
        <>
          {/* Members tab view */}
          {tab === 'members' && (
            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Nom</th>
                    <th className="px-6 py-4">Poste</th>
                    <th className="px-6 py-4">Téléphone</th>
                    <th className="px-6 py-4">Salaire standard</th>
                    <th className="px-6 py-4">Embauche</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {members.map(member => (
                    <tr key={member.id} className="hover:bg-slate-800/20 transition">
                      <td className="px-6 py-4 font-semibold text-slate-100">
                        {formatFullName(member.first_name, member.last_name, '')}
                      </td>
                      <td className="px-6 py-4 text-gold-500 font-medium">{member.role}</td>
                      <td className="px-6 py-4 text-slate-400">{member.telephone}</td>
                      <td className="px-6 py-4 text-slate-200 font-bold">
                        {parseFloat(member.remuneration_mensuelle_standard).toLocaleString()} FCFA
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(member.date_embauche).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${member.est_actif ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50' : 'bg-rose-950/40 text-rose-400 border border-rose-900/50'}`}>
                          {member.est_actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payroll tab view */}
          {tab === 'payrolls' && (
            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Mois/Année</th>
                    <th className="px-6 py-4">Collaborateur</th>
                    <th className="px-6 py-4 text-right">Brut dû</th>
                    <th className="px-6 py-4 text-right">Acomptes déduits</th>
                    <th className="px-6 py-4 text-right">Net à payer</th>
                    <th className="px-6 py-4 text-right">Montant Réglé</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {payrolls.map(pr => (
                    <tr key={pr.id} className="hover:bg-slate-800/20 transition">
                      <td className="px-6 py-4 font-semibold text-slate-400">
                        {String(pr.mois).padStart(2, '0')}/{pr.annee}
                      </td>
                      <td className="px-6 py-4 text-slate-200">
                        {cleanFullName(pr.member_name, `Collaborateur #${pr.member}`)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400">
                        {parseFloat(pr.montant_du).toLocaleString()} FCFA
                      </td>
                      <td className="px-6 py-4 text-right text-rose-400">
                        -{parseFloat(pr.avances_deduites).toLocaleString()} FCFA
                      </td>
                      <td className="px-6 py-4 text-right text-gold-500 font-bold">
                        {parseFloat(pr.net_amount_payable).toLocaleString()} FCFA
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-400">
                        {parseFloat(pr.paid_amount).toLocaleString()} FCFA
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${PAYMENT_STATUS_COLORS[pr.payment_status]}`}>
                          {PAYMENT_STATUS_LABELS[pr.payment_status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {pr.payment_status !== 'PAID' && (
                          <button
                            onClick={() => {
                              setSelectedPayroll(pr);
                              setPayInput({ ...payInput, amount: pr.amount_remaining });
                              setShowPayModal(true);
                            }}
                            className="bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-900 px-3 py-1 rounded-lg text-xs font-bold transition"
                          >
                            Payer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Advances tab view */}
          {tab === 'advances' && (
            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Date octroi</th>
                    <th className="px-6 py-4">Collaborateur</th>
                    <th className="px-6 py-4 text-right">Montant</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {advances.map(adv => (
                    <tr key={adv.id} className="hover:bg-slate-800/20 transition">
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(adv.grant_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-slate-200">
                        {cleanFullName(adv.member_name, `Collaborateur #${adv.member}`)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white">
                        {parseFloat(adv.amount).toLocaleString()} FCFA
                      </td>
                      <td className="px-6 py-4 text-slate-400 max-w-xs truncate" title={adv.notes}>
                        {adv.notes || "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${ADVANCE_STATUS_COLORS[adv.status]}`}>
                          {ADVANCE_STATUS_LABELS[adv.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {adv.status === 'PENDING' && (
                          <button
                            onClick={() => handleApproveAdvance(adv.id)}
                            className="bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-900 px-3 py-1 rounded-lg text-xs font-bold transition"
                          >
                            Approuver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Pay Modal */}
      {showPayModal && selectedPayroll && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full border border-slate-800 bg-slate-950 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-bold text-lg border-b border-slate-800 pb-2">
              Enregistrer un paiement de rémunération
            </h3>
            <p className="text-xs text-slate-400">
              Versement à <strong>{cleanFullName(selectedPayroll.member_name, `Collaborateur #${selectedPayroll.member}`)}</strong> pour la fiche {String(selectedPayroll.mois).padStart(2, '0')}/{selectedPayroll.annee}. Reste dû: {parseFloat(selectedPayroll.amount_remaining).toLocaleString()} FCFA.
            </p>
            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Montant versé (FCFA)</label>
                <input
                  type="number"
                  required
                  value={payInput.amount}
                  onChange={(e) => setPayInput({ ...payInput, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Mode de règlement</label>
                <select
                  required
                  value={payInput.payment_mode}
                  onChange={(e) => setPayInput({ ...payInput, payment_mode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-gold-500 outline-none"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="Moov Money">Moov Money</option>
                  <option value="Virement bancaire">Virement bancaire</option>
                  <option value="Paiement mixte">Paiement mixte</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Référence transaction (Optionnel)</label>
                <input
                  type="text"
                  placeholder="N° chèque, ID transaction..."
                  value={payInput.transaction_reference}
                  onChange={(e) => setPayInput({ ...payInput, transaction_reference: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes / Observations</label>
                <textarea
                  value={payInput.notes}
                  onChange={(e) => setPayInput({ ...payInput, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:border-gold-500 outline-none"
                  rows="2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowPayModal(false);
                    setSelectedPayroll(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs transition"
                >
                  Confirmer le règlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Remunerations;
