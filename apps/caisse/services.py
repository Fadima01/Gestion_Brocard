from django.db import transaction
from django.db.models import F
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from .models import CashSession
from apps.core.choices import CashSessionStatus

class CashRegisterService:
    """
    Service gérant la logique métier des fonds de caisse boutique et des sessions journalières.
    """

    @staticmethod
    @transaction.atomic
    def open_session(responsible, initial_amount, notes=""):
        """
        Ouvre une nouvelle session de caisse journalière avec un montant initial.
        """
        # Vérification s'il y a déjà une session ouverte
        active_session = CashSession.objects.filter(status=CashSessionStatus.OPEN).first()
        if active_session:
            raise ValidationError(_("Impossible d'ouvrir une nouvelle session. La caisse ID %(id)s est déjà ouverte par %(resp)s."),
                                  params={'id': active_session.id, 'resp': active_session.responsible.get_full_name()})

        if initial_amount < 0:
            raise ValidationError(_("Le montant initial (fond de caisse) ne peut pas être négatif."))

        session = CashSession.objects.create(
            responsible=responsible,
            opening_date=timezone.now(),
            initial_amount=initial_amount,
            cash_sales_collected=0,
            cash_expenses=0,
            theoretical_amount=initial_amount,
            status=CashSessionStatus.OPEN,
            notes=notes
        )
        return session

    @staticmethod
    @transaction.atomic
    def close_session(session, real_amount, notes=""):
        """
        Clôture la session de caisse en effectuant le calcul théorique et de l'écart.
        """
        if session.status == CashSessionStatus.CLOSED:
            raise ValidationError(_("Cette session de caisse est déjà fermée."))

        if real_amount < 0:
            raise ValidationError(_("Le montant réel compté ne peut pas être négatif."))

        # Calcul final
        session.closing_date = timezone.now()
        session.status = CashSessionStatus.CLOSED
        session.real_amount = real_amount
        
        # Le theoretical_amount est mis à jour : initial + sales - expenses
        session.theoretical_amount = session.initial_amount + session.cash_sales_collected - session.cash_expenses
        session.cash_discrepancy = real_amount - session.theoretical_amount
        session.notes = f"{session.notes}\nFermée le {session.closing_date} : {notes}".strip()
        
        session.save()
        return session

    @staticmethod
    @transaction.atomic
    def add_cash_sales(session, amount):
        """
        Incrémente les ventes en espèces perçues pour cette session.
        """
        if session.status == CashSessionStatus.CLOSED:
            raise ValidationError(_("Impossible d'ajouter des ventes à une session de caisse fermée."))
        
        session.cash_sales_collected = F('cash_sales_collected') + amount
        session.theoretical_amount = F('theoretical_amount') + amount
        session.save()
        session.refresh_from_db()
        return session

    @staticmethod
    @transaction.atomic
    def add_cash_expense(session, amount):
        """
        Incrémente les dépenses en espèces déboursées sur cette session.
        """
        if session.status == CashSessionStatus.CLOSED:
            raise ValidationError(_("Impossible de déduire des dépenses d'une session de caisse fermée."))

        session.cash_expenses = F('cash_expenses') + amount
        session.theoretical_amount = F('theoretical_amount') - amount
        session.save()
        session.refresh_from_db()
        return session
