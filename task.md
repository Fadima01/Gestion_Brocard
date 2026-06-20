# Liste des tâches - Implémentation Suivi Brocard

## Étape 1 : Modèles Backend & Migrations
- [x] Modifier `apps/caisse/models.py` : Ajouter le modèle `CaisseMouvement` en conservant temporairement `CashSession`.
- [x] Modifier `apps/catalogue/models.py` : Ajouter `stock_initial` (default=0) sur `ClothingModel` et adapter `save()` pour initialiser le stock de la variante par défaut avec description `"Stock initial de création du modèle"`.
- [x] Modifier `apps/livraisons/models.py` : Mettre à jour `Delivery` avec les nouveaux champs : livreur (Nom, Prénom, Téléphone), statut, observations, montant_encaisse_livreur, mode_paiement_recu, argent_remis_a_brocard, montant_remis, date_remise_argent.
- [x] **Rapports de Direction & V3 Finalisation (Points 8, Rapports V3)**
  - [x] Afficher le classement des ateliers et les statistiques financières de confection dans `Rapports.jsx`.
  - [x] Implémenter le Rapport des Ventes complet avec photo, modèle, catégorie, vendu, restant, % vendu, CA et indicateurs colorés (>10, 5-10, <5).
  - [x] Corriger l'écran noir/données manquantes du Rapport Fabrications & Ateliers (résoudre l'erreur d'import de CheckCircle2).
  - [x] Afficher le Tableau des Ateliers et le Tableau des Fabrications conformément au cahier des charges.
  - [x] Implémenter le Rapport de Rentabilité avec CA, Dépenses, Coût de fabrication, Salaires et Bénéfice estimé.
- [x] **Rapports Stocks et Alertes (Point 9, Stocks V3)**
  - [x] Afficher les détails des variantes de produits finis et les statuts d'alertes colorés.
  - [x] Ajouter la colonne PHOTO avec `object-fit: contain` et sans zoom pour les habits finis en magasin.
  - [x] Mettre à jour `FinishedGoodStockSerializer` avec les champs SKU, modèle, taille, couleur, catégorie, photo du modèle (`model_image`) et prix conseillé.
- [x] Créer et exécuter les migrations de base de données Django :
  `python manage.py makemigrations` et `python manage.py migrate`

## Étape 2 : Logique Métier & APIs Backend
- [x] Modifier `apps/caisse/signals.py` : Implémenter les signaux automatiques pour enregistrer les entrées et sorties en caisse globale depuis `CustomerPayment`, `Reservation`, `Expense`, `WorkshopPayment`, `CompensationPayment`, et `SalaryAdvance`.
- [x] Modifier `apps/caisse/views.py` & `urls.py` : Exposer `CaisseMouvementViewSet` et créer un endpoint `/api/v1/caisse/global/` retournant le solde et les cumuls de la Caisse Globale.
- [x] Modifier `apps/production/services.py` :
  - Ajuster `create_production_order` pour générer les références de type `BR001`, `BR002`...
- [x] Backend Django
  - [x] Modifier `clean()` de `ProductionOrder` dans `apps/production/models.py` (validation reçues <= demandées, calcul automatique de `pieces_defectueuses`)
  - [x] Modifier `complete_production_order` dans `apps/production/services.py` (supprimer le paramètre `defective_quantity` si nécessaire, ou ignorer sa valeur manuelle)
  - [x] Adapter Django Admin dans `apps/production/admin.py` (masquer `pieces_defectueuses`, afficher `quantite_manquante` et `quantite_reçue`)
  - [x] Adapter `DashboardAPIView` dans `apps/core/views.py` (calculer `robes_demandees`, `robes_receues`, `robes_manquantes`, `taux_realisation`) `pay_order` (éclatement en plusieurs objets `CustomerPayment`).
  - [x] Remplacer `float` par `Decimal`.
- [x] Modifier `apps/livraisons/views.py` & `serializers.py` : Exposer les nouveaux champs de livraison et, lors de la remise de l'argent à Brocard (`argent_remis_a_brocard = True`), enregistrer automatiquement le paiement sur la commande liée.
- [x] Modifier `apps/core/views.py` : Adapter l'indicateur de caisse du tableau de bord pour renvoyer le solde réel de la Caisse Globale.

## Étape 3 : Ajustements Frontend (React)
- [x] Modifier `frontend/vite.config.js` : Ajouter `/media` aux règles de redirection (proxy) de Vite vers Django.
- [x] Modifier `frontend/src/components/Sidebar.jsx` : Renommer l'onglet "Stocks" en "Achats Matières Premières".
- [x] Modifier `frontend/src/pages/Stocks.jsx` : Masquer définitivement l'onglet "Gestion des Produits Finis".
- [x] Modifier `frontend/src/pages/Dashboard.jsx` : Remplacer l'état de caisse ouverte par les statistiques de la Caisse Globale.
- [x] Modifier `frontend/src/pages/Caisse.jsx` : Supprimer la gestion de session (boutons d'ouverture/fermeture) et afficher le tableau de bord de la Caisse Globale avec l'historique complet des flux.
- [x] Modifier `frontend/src/pages/Production.jsx` : Permettre l'édition complète des fabrications et supporter le nouveau format de référence.
- [x] Modifier `frontend/src/pages/Commandes.jsx` : Ajouter les options de livraison conditionnelle à la création et adapter la popup de paiement pour supporter le paiement mixte.
- [x] Modifier `frontend/src/pages/Livraisons.jsx` : Intégrer les nouvelles options de suivi (encaissement, montant remis, mode de paiement, date de remise).

## Étape 4 : Validation & walkthrough
- [x] Lancer les tests unitaires / serveurs locaux pour valider la stabilité.
- [x] Rédiger le fichier `walkthrough.md` récapitulant les changements.
