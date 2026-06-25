import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { Plus, Search, Image, Edit2, Archive, CheckCircle, XCircle, Info } from 'lucide-react';

const Catalogue = () => {
  const [activeTab, setActiveTab] = useState('models'); // 'models', 'categories'
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [sortOption, setSortOption] = useState('group_category');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [photo, setPhoto] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [quantiteAffectee, setQuantiteAffectee] = useState('0');

  // Category management form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryPrice, setCategoryPrice] = useState('');
  const [categoryStockGlobal, setCategoryStockGlobal] = useState('0');
  const [selectedCatDetails, setSelectedCatDetails] = useState(null);

  const handleEditCategoryClick = (cat) => {
    setEditingCategory(cat);
    setCategoryPrice(cat.prix);
    setCategoryStockGlobal(cat.stock_global || '0');
    setShowCategoryForm(true);
  };

  const handleCreateCategoryClick = () => {
    setEditingCategory(null);
    setCategoryPrice('');
    setCategoryStockGlobal('0');
    setShowCategoryForm(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    const payload = {
      prix: parseFloat(categoryPrice)
    };
    try {
      if (editingCategory) {
        await api.patch(`/catalogue/categories/${editingCategory.id}/`, payload);
      } else {
        await api.post('/catalogue/categories/', payload);
      }
      setShowCategoryForm(false);
      setEditingCategory(null);
      setCategoryPrice('');
      setCategoryStockGlobal('0');
      fetchCategories();
      fetchModels();
    } catch (err) {
      alert("Erreur lors de l'enregistrement de la catégorie. Assurez-vous que le prix est unique.");
    }
  };

  const fetchModels = async () => {
    try {
      const response = await api.get(`/catalogue/models/?search=${search}`);
      const data = response.data.results || response.data;
      // Filter by archive status
      const filtered = data.filter(m => showArchived ? m.is_archived : !m.is_archived);
      setModels(filtered);
    } catch (err) {
      console.error("Erreur lors du chargement des modèles.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/catalogue/categories/');
      setCategories(response.data.results || response.data);
    } catch (err) {
      console.error("Erreur lors du chargement des catégories.");
    }
  };

  const processedModels = useMemo(() => {
    let result = [...models];

    // 1. Filter by category
    if (selectedCategoryFilter) {
      result = result.filter(m => m.category === parseInt(selectedCategoryFilter));
    }

    // 2. Sort by option
    if (sortOption === 'price_asc') {
      result.sort((a, b) => parseFloat(a.prix_vente_conseille) - parseFloat(b.prix_vente_conseille));
    } else if (sortOption === 'price_desc') {
      result.sort((a, b) => parseFloat(b.prix_vente_conseille) - parseFloat(a.prix_vente_conseille));
    } else if (sortOption === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    } else if (sortOption === 'name_desc') {
      result.sort((a, b) => b.name.localeCompare(a.name, 'fr'));
    }

    return result;
  }, [models, selectedCategoryFilter, sortOption]);

  const groupedModels = useMemo(() => {
    if (sortOption !== 'group_category') return null;

    // Group the models by category
    const groups = [];
    
    // Sort categories by price ascending to have a logical layout
    const sortedCats = [...categories].sort((a, b) => parseFloat(a.prix) - parseFloat(b.prix));

    sortedCats.forEach(cat => {
      const catModels = processedModels.filter(m => m.category === cat.id);
      if (catModels.length > 0) {
        groups.push({
          category: cat,
          models: catModels
        });
      }
    });

    // Also handle any models that have no category
    const noCatModels = processedModels.filter(m => !m.category);
    if (noCatModels.length > 0) {
      groups.push({
        category: { id: 'none', prix: 0, stock_global: 0 },
        models: noCatModels
      });
    }

    return groups;
  }, [processedModels, categories, sortOption]);

  useEffect(() => {
    fetchModels();
    fetchCategories();
  }, [search, showArchived]);

  const handleEditClick = (model) => {
    setEditingModel(model);
    setName(model.name);
    setDescription(model.description);
    setSuggestedPrice(model.prix_vente_conseille);
    setCategoryId(model.category || '');
    setQuantiteAffectee(model.quantite_affectee || '0');
    setIsAvailable(model.is_available);
    setShowForm(true);
  };

  const handleCreateClick = () => {
    setEditingModel(null);
    setName('');
    setDescription('');
    setSuggestedPrice('');
    setCategoryId('');
    setQuantiteAffectee('0');
    setPhoto(null);
    setIsAvailable(true);
    setShowForm(true);
  };

  const handleArchive = async (modelId, archiveStatus) => {
    try {
      await api.patch(`/catalogue/models/${modelId}/`, {
        is_archived: archiveStatus
      });
      fetchModels();
    } catch (err) {
      alert("Erreur lors du changement de statut d'archivage du modèle.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation locale de stock
    if (categoryId) {
      const selected = categories.find(c => c.id === parseInt(categoryId));
      if (selected) {
        const otherAllocated = models
          .filter(m => m.category === selected.id && m.id !== (editingModel?.id || null))
          .reduce((sum, m) => sum + (m.quantite_affectee || 0), 0);
        const maxAvail = selected.stock_global - otherAllocated;
        if (parseInt(quantiteAffectee) > maxAvail) {
          alert(`Erreur: Impossible d'affecter ${quantiteAffectee} robes. Le stock global disponible pour cette catégorie est de ${selected.stock_global}, et ${otherAllocated} robes sont déjà affectées à d'autres designs (maximum disponible: ${maxAvail}).`);
          return;
        }
      }
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    
    const cat = categories.find(c => c.id === parseInt(categoryId));
    const finalPrice = cat ? cat.prix : suggestedPrice;
    formData.append('prix_vente_conseille', finalPrice);
    
    if (categoryId) {
      formData.append('category', categoryId);
    }
    formData.append('quantite_affectee', parseInt(quantiteAffectee));
    formData.append('is_available', isAvailable);
    if (photo) {
      formData.append('photo_principale', photo);
    }

    try {
      if (editingModel) {
        await api.patch(`/catalogue/models/${editingModel.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/catalogue/models/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      // Réinitialisation
      setName('');
      setDescription('');
      setSuggestedPrice('');
      setCategoryId('');
      setQuantiteAffectee('0');
      setPhoto(null);
      setShowForm(false);
      setEditingModel(null);
      fetchModels();
      fetchCategories();
    } catch (err) {
      alert(`Erreur lors de ${editingModel ? 'la modification' : "la création"} du modèle.`);
    }
  };

  const renderModelCard = (model) => {
    return (
      <div key={model.id} className="glass-card rounded-2xl overflow-hidden border border-slate-800/80 hover:border-gold-500/30 transition-all duration-300 flex flex-col justify-between">
        
        {/* Photo & Price Tag */}
        <div className="h-52 bg-slate-950/80 relative overflow-hidden flex items-center justify-center border-b border-slate-800 p-2">
          {model.photo_principale ? (
            <div className="w-full h-full flex items-center justify-center relative">
              <img 
                src={model.photo_principale} 
                alt={model.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  const fallback = e.target.parentNode.querySelector('.img-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="img-fallback text-slate-600 flex-col items-center gap-2 hidden absolute inset-0 bg-slate-950 flex justify-center">
                <Image size={44} className="text-slate-600" />
                <span className="text-xs">Image indisponible</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-600 flex flex-col items-center gap-2">
              <Image size={44} />
              <span className="text-xs">Aucune image</span>
            </div>
          )}
          
          {/* Price tag */}
          <div className="absolute top-3 right-3 px-3 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg border border-gold-500/20 text-gold-400 text-xs font-bold font-mono">
            {(parseFloat(model.prix_vente_conseille) || 0).toLocaleString('fr-FR')} FCFA
          </div>

          {/* Status Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {model.is_available ? (
              <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/20 backdrop-blur-md rounded-lg border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <CheckCircle size={10} /> En vente
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-0.5 bg-rose-500/20 backdrop-blur-md rounded-lg border border-rose-500/30 text-rose-400 text-[10px] font-bold">
                <XCircle size={10} /> Suspendu
              </span>
            )}
            {model.is_archived && (
              <span className="px-2.5 py-0.5 bg-amber-500/20 backdrop-blur-md rounded-lg border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                Archivé
              </span>
            )}
          </div>
        </div>

        {/* Info Body */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{model.name}</h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed">
              {model.description || "Aucune description de modèle n'est disponible."}
            </p>
          </div>
          
          {/* Available, reserved, sold metrics summary */}
          <div className="grid grid-cols-3 gap-2 py-2 border-t border-slate-800/60 text-center">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Dispo</span>
              <span className="text-sm font-bold text-slate-200">{model.stock_disponible || 0}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Réservé</span>
              <span className="text-sm font-bold text-amber-400">{model.stock_reserve || 0}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Vendu</span>
              <span className="text-sm font-bold text-emerald-400">{model.stock_vendu || 0}</span>
            </div>
          </div>

          {/* Actions (Edit and Logical Archive) */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/40">
            <button 
              onClick={() => handleEditClick(model)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all"
            >
              <Edit2 size={12} />
              Modifier
            </button>

            {model.is_archived ? (
              <button 
                onClick={() => handleArchive(model.id, false)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold transition-all border border-emerald-500/25"
              >
                Désarchiver
              </button>
            ) : (
              <button 
                onClick={() => handleArchive(model.id, true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold transition-all border border-rose-500/25"
              >
                <Archive size={12} />
                Archiver
              </button>
            )}
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Catalogue de Modèles</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gérez la collection d'habits et les catégories de prix de l'atelier Brocard.
          </p>
        </div>
        {activeTab === 'models' ? (
          <button 
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-white font-semibold rounded-lg shadow-lg shadow-gold-600/10 hover:shadow-gold-500/20 transition-all duration-200 w-full sm:w-auto justify-center"
          >
            <Plus size={18} />
            Nouveau modèle d'habit
          </button>
        ) : (
          <button 
            onClick={handleCreateCategoryClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-white font-semibold rounded-lg shadow-lg shadow-gold-600/10 hover:shadow-gold-500/20 transition-all duration-200 w-full sm:w-auto justify-center"
          >
            <Plus size={18} />
            Nouvelle catégorie de robe
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 no-print">
        <button 
          onClick={() => setActiveTab('models')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${activeTab === 'models' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Modèles d'habits (Catalogue)
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${activeTab === 'categories' ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Catégories de robes (Prix)
        </button>
      </div>

      {/* TAB 1: MODELS */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          {/* Form modal/panel */}
          {showForm && (
            <div className="glass-card p-6 rounded-2xl border border-gold-500/20 animate-fadeIn">
              <h2 className="text-lg font-bold text-white mb-4">
                {editingModel ? `Modifier le modèle: ${editingModel.name}` : "Ajouter un nouveau modèle d'habit"}
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Nom du modèle d'habit</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      placeholder="Ex: Brocard Prestige"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">Le nom commercial du vêtement tel qu'il apparaîtra sur les fiches de vente.</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Catégorie de prix</label>
                    <select 
                      value={categoryId} 
                      onChange={(e) => {
                        setCategoryId(e.target.value);
                        const selected = categories.find(c => c.id === parseInt(e.target.value));
                        if (selected) {
                          setSuggestedPrice(selected.prix);
                        }
                      }}
                      required
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                    >
                      <option value="">-- Choisissez la catégorie --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          Catégorie {parseInt(c.prix).toLocaleString('fr-FR')} FCFA (Stock disponible: {c.stock_disponible} robes)
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-500 block mt-1">La catégorie tarifaire de la robe.</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Quantité affectée à ce design</label>
                    <input 
                      type="number" 
                      value={quantiteAffectee}
                      onChange={(e) => setQuantiteAffectee(e.target.value)}
                      required
                      min="0"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Nombre de robes de la catégorie globale affectées à ce design (maximum disponible : {
                        categoryId ? (
                          (categories.find(c => c.id === parseInt(categoryId))?.stock_disponible || 0) - 
                          models
                            .filter(m => m.category === parseInt(categoryId) && m.id !== (editingModel?.id || null))
                            .reduce((sum, m) => sum + (m.quantite_affectee || 0), 0)
                        ) : 0
                      }).
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Description</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows="3"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      placeholder="Détails sur la coupe, le tissu..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Photo principale</label>
                    <input 
                      type="file" 
                      onChange={(e) => setPhoto(e.target.files[0])}
                      accept="image/*"
                      required={!editingModel}
                      className="w-full text-slate-400 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-gold-400 hover:file:bg-slate-700"
                    />
                  </div>
                  <div className="flex items-center gap-3 py-2">
                    <input 
                      type="checkbox" 
                      id="isAvailable"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-800 text-gold-600 focus:ring-gold-500/50 bg-slate-900"
                    />
                    <label htmlFor="isAvailable" className="text-xs font-semibold uppercase tracking-wider text-slate-300 cursor-pointer">Disponible pour la vente directe</label>
                  </div>

                  <div className="flex justify-end gap-3 pt-6">
                    <button 
                      type="button" 
                      onClick={() => { setShowForm(false); setEditingModel(null); }}
                      className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-sm font-semibold"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      className="px-6 py-2.5 bg-gold-600 hover:bg-gold-500 text-white font-semibold rounded-xl text-sm"
                    >
                      {editingModel ? "Enregistrer les modifications" : "Créer le modèle"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Model Search and Filter Bar */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 no-print">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex-1 min-w-[200px]">
                <Search size={18} className="text-slate-500 mr-2" />
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un modèle..."
                  className="bg-transparent border-none outline-none w-full text-white placeholder-slate-500 text-sm"
                />
              </div>

              {/* Price Category Filter */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 sm:max-w-[220px] w-full">
                <span className="text-[10px] uppercase font-bold text-slate-500 px-2 select-none">Catégorie</span>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-white text-xs py-1.5 w-full cursor-pointer focus:ring-0"
                >
                  <option value="" className="bg-slate-950 text-white">Toutes les catégories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-950 text-white">
                      {parseInt(c.prix).toLocaleString('fr-FR')} FCFA
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Selection */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 sm:max-w-[220px] w-full">
                <span className="text-[10px] uppercase font-bold text-slate-500 px-2 select-none">Tri</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="bg-transparent border-none outline-none text-white text-xs py-1.5 w-full cursor-pointer focus:ring-0"
                >
                  <option value="group_category" className="bg-slate-950 text-white">Regrouper par prix</option>
                  <option value="price_asc" className="bg-slate-950 text-white">Prix croissant</option>
                  <option value="price_desc" className="bg-slate-950 text-white">Prix décroissant</option>
                  <option value="name_asc" className="bg-slate-950 text-white">Nom A → Z</option>
                  <option value="name_desc" className="bg-slate-950 text-white">Nom Z → A</option>
                </select>
              </div>
            </div>

            {/* Toggle Archived filter button */}
            <button 
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-semibold justify-center ${showArchived ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'border-slate-800 text-slate-400 hover:bg-slate-800'}`}
            >
              <Archive size={16} />
              {showArchived ? "Afficher les modèles actifs" : "Afficher les archives"}
            </button>
          </div>

          {/* Models List */}
          {loading ? (
            <div className="text-center py-10 text-gold-500 font-semibold animate-pulse">Chargement du catalogue...</div>
          ) : processedModels.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              Aucun modèle d'habit trouvé dans cette section.
            </div>
          ) : sortOption === 'group_category' ? (
            <div className="space-y-10">
              {groupedModels.map(group => (
                <div key={group.category.id} className="space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-800/80 pb-2">
                    <h2 className="text-lg font-bold text-gold-400 font-sans">
                      {group.category.id === 'none' 
                        ? "Sans catégorie de prix" 
                        : `Catégorie ${parseInt(group.category.prix).toLocaleString('fr-FR')} FCFA`}
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-800 text-slate-400 rounded-full font-mono">
                      {group.models.length} {group.models.length > 1 ? 'modèles' : 'modèle'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.models.map((model) => renderModelCard(model))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processedModels.map((model) => renderModelCard(model))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {showCategoryForm && (
            <div className="glass-card p-6 rounded-2xl border border-gold-500/20 animate-fadeIn">
              <h2 className="text-lg font-bold text-white mb-4">
                {editingCategory ? `Modifier la catégorie: ${editingCategory.prix} FCFA` : "Ajouter une nouvelle catégorie de prix"}
              </h2>
              <form onSubmit={handleCategorySubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Prix de la catégorie (FCFA)</label>
                    <input 
                      type="number" 
                      value={categoryPrice}
                      onChange={(e) => setCategoryPrice(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-gold-500/50 text-sm"
                      placeholder="Ex: 25000"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">Le prix de vente conseillé et appliqué pour ce lot de robes.</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Stock global (calculé automatiquement)</label>
                    <input 
                      type="number" 
                      value={categoryStockGlobal}
                      disabled
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-sm cursor-not-allowed"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">Incrémenté par les confections reçues et diminué par les ventes validées.</span>
                  </div>
                </div>

                <div className="flex justify-end items-end gap-3 pt-6 md:pt-0">
                  <button 
                    type="button" 
                    onClick={() => { setShowCategoryForm(false); setEditingCategory(null); }}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-sm font-semibold"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-gold-600 hover:bg-gold-500 text-white font-semibold rounded-xl text-sm"
                  >
                    {editingCategory ? "Enregistrer les modifications" : "Enregistrer la catégorie"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Categories Table */}
          {categories.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              Aucune catégorie de prix trouvée.
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Prix de la catégorie</th>
                    <th className="px-6 py-4 text-center">Stock Global</th>
                    <th className="px-6 py-4 text-center">Stock Actuel Disponible</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-800/20 transition-all">
                      <td className="px-6 py-4 font-semibold text-slate-200">
                        {parseInt(cat.prix).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-300">
                        {cat.total_fabrique} {cat.total_fabrique > 1 ? 'robes' : 'robe'}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-300">
                        {cat.stock_disponible} {cat.stock_disponible > 1 ? 'robes' : 'robe'}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedCatDetails(cat)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-all"
                          title="Détails"
                        >
                          <Info size={14} />
                        </button>
                        <button 
                          onClick={() => handleEditCategoryClick(cat)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-all"
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Category Stock Detail Modal */}
      {selectedCatDetails && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-gold-500/20 shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-white">
                Catégorie {parseInt(selectedCatDetails.prix).toLocaleString('fr-FR')} FCFA
              </h3>
              <button
                onClick={() => setSelectedCatDetails(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-slate-300">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-800/60">
                <span className="text-slate-400">Total confectionné</span>
                <span className="font-semibold text-white">
                  {selectedCatDetails.total_fabrique} {selectedCatDetails.total_fabrique > 1 ? 'robes' : 'robe'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-800/60">
                <span className="text-slate-400">Total vendu</span>
                <span className="font-semibold text-white">
                  {selectedCatDetails.total_vendu} {selectedCatDetails.total_vendu > 1 ? 'robes' : 'robe'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-800/60">
                <span className="text-slate-400">Total réservé</span>
                <span className="font-semibold text-white">
                  {selectedCatDetails.total_reserve} {selectedCatDetails.total_reserve > 1 ? 'robes' : 'robe'}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-3 bg-gold-500/10 px-4 rounded-xl border border-gold-500/20 mt-4">
                <span className="text-gold-300 font-bold uppercase tracking-wider text-xs">Stock disponible</span>
                <span className="font-extrabold text-xl text-gold-400">
                  {selectedCatDetails.stock_disponible} {selectedCatDetails.stock_disponible > 1 ? 'robes' : 'robe'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCatDetails(null)}
                className="px-6 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors"
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

export default Catalogue;
