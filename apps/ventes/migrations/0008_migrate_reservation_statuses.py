# Generated manually on 2026-06-19 18:38

from django.db import migrations

def migrate_statuses(apps, schema_editor):
    Reservation = apps.get_model('ventes', 'Reservation')
    CustomerPayment = apps.get_model('ventes', 'CustomerPayment')
    
    for res in Reservation.objects.all():
        old_status = res.statut
        
        # Calculate total price
        total_price = res.quantite * res.model.prix_vente_conseille
        res.montant_restant = total_price - res.montant_verse
        
        if old_status == 'COMPLETED':
            if res.montant_restant > 0:
                if res.montant_verse == 0:
                    res.statut = 'EN_ATTENTE'
                else:
                    res.statut = 'PAIEMENT_PARTIEL'
            else:
                res.statut = 'RECUPEREE'
        elif old_status == 'PENDING' or old_status == 'CONFIRMED':
            if res.montant_verse == 0:
                res.statut = 'EN_ATTENTE'
            elif res.montant_verse > 0 and res.montant_restant > 0:
                res.statut = 'PAIEMENT_PARTIEL'
            elif res.montant_verse > 0 and res.montant_restant == 0:
                res.statut = 'PAYEE'
        elif old_status == 'CANCELLED':
            res.statut = 'ANNULEE'
        elif old_status == 'EXPIRED':
            res.statut = 'EXPIREE'
        else:
            # Fallback for already migrated or other statuses
            if res.statut not in ['RECUPEREE', 'ANNULEE', 'EXPIREE']:
                if res.montant_verse == 0:
                    res.statut = 'EN_ATTENTE'
                elif res.montant_verse > 0 and res.montant_restant > 0:
                    res.statut = 'PAIEMENT_PARTIEL'
                elif res.montant_verse > 0 and res.montant_restant == 0:
                    res.statut = 'PAYEE'
                    
        res.save()
        
        # Create payment history if it doesn't exist but montant_verse > 0
        if res.montant_verse > 0 and not res.payments.exists():
            pay_type = 'FULL' if res.montant_restant == 0 else 'DEPOSIT'
            CustomerPayment.objects.create(
                reservation=res,
                order=None,
                montant=res.montant_verse,
                type_paiement=pay_type,
                mode_paiement='Espèces',
                notes=f"Acompte de création pour la réservation {res.reference}"
            )

class Migration(migrations.Migration):

    dependencies = [
        ('ventes', '0007_alter_reservation_statut'),
    ]

    operations = [
        migrations.RunPython(migrate_statuses),
    ]
