# Generated manually for Brocard ERP pre-production references migration

from django.db import migrations
from django.utils import timezone

def backfill_all_references(apps, schema_editor):
    FabricPurchase = apps.get_model('achats', 'FabricPurchase')
    CustomerReturn = apps.get_model('retours', 'CustomerReturn')
    MonthlyCompensation = apps.get_model('remunerations', 'MonthlyCompensation')
    CaisseMouvement = apps.get_model('caisse', 'CaisseMouvement')
    ProductionOrder = apps.get_model('production', 'ProductionOrder')
    Reservation = apps.get_model('ventes', 'Reservation')
    Order = apps.get_model('ventes', 'Order')
    Delivery = apps.get_model('livraisons', 'Delivery')
    Expense = apps.get_model('depenses', 'Expense')
    WorkshopPayment = apps.get_model('production', 'WorkshopPayment')
    CustomerPayment = apps.get_model('ventes', 'CustomerPayment')
    SalaryAdvance = apps.get_model('remunerations', 'SalaryAdvance')
    CompensationPayment = apps.get_model('remunerations', 'CompensationPayment')

    # Helper helper to generate sequentially per year
    def migrate_model_references(model_class, prefix, date_field_or_func, reference_field='reference'):
        objs = list(model_class.objects.all().order_by('id'))
        
        # We need to track sequence numbers per year for this model
        year_sequences = {}
        
        for obj in objs:
            # Determine the year
            if callable(date_field_or_func):
                year = date_field_or_func(obj)
            else:
                date_val = getattr(obj, date_field_or_func, None)
                if not date_val:
                    date_val = timezone.now()
                year = date_val.year
            
            # Start sequence at 1 for each year if not present
            if year not in year_sequences:
                year_sequences[year] = 1
            
            seq = year_sequences[year]
            new_ref = f"{prefix}-{year}-{seq:04d}"
            
            # Update the object
            setattr(obj, reference_field, new_ref)
            obj.save(update_fields=[reference_field])
            
            # Increment sequence for this year
            year_sequences[year] += 1

    # Apply to each model
    migrate_model_references(FabricPurchase, 'ACH', 'date_achat')
    migrate_model_references(CustomerReturn, 'RET', 'date_retour')
    migrate_model_references(MonthlyCompensation, 'REM', lambda obj: obj.annee)
    migrate_model_references(CaisseMouvement, 'CAI', 'date_mouvement')
    migrate_model_references(ProductionOrder, 'CONF', 'date_debut')
    migrate_model_references(Reservation, 'RES', lambda obj: obj.created_at.year if obj.created_at else (obj.date_limite.year if obj.date_limite else timezone.now().year))
    migrate_model_references(Order, 'VTE', 'date_commande')
    migrate_model_references(Delivery, 'LIV', lambda obj: obj.created_at.year if obj.created_at else timezone.now().year)
    migrate_model_references(Expense, 'DEP', 'date_depense')
    migrate_model_references(WorkshopPayment, 'PAY', 'date_paiement')
    migrate_model_references(CustomerPayment, 'PAY', 'date_paiement')
    migrate_model_references(SalaryAdvance, 'SAL', 'grant_date')
    migrate_model_references(CompensationPayment, 'SAL', 'payment_date')

def rollback_all_references(apps, schema_editor):
    pass  # Rolback not needed for references backfill

class Migration(migrations.Migration):

    dependencies = [
        ('ventes', '0009_alter_order_reference'),
        ('achats', '0005_fabricpurchase_reference_rawmaterial_date_achat_and_more'),
        ('caisse', '0003_caissemouvement_reference'),
        ('remunerations', '0004_monthlycompensation_reference'),
        ('retours', '0002_customerreturn_reference'),
        ('production', '0007_workshoppayment_reference'),
    ]

    operations = [
        migrations.RunPython(backfill_all_references, rollback_all_references),
    ]
