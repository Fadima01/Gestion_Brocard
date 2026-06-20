from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from .models import CompanyMember, MonthlyCompensation, SalaryAdvance, CompensationPayment
from apps.core.choices import PaymentStatus, AdvanceStatus

class PayrollService:
    """
    Service gérant la paie des collaborateurs, les avances sur salaires et les règlements associés.
    """

    @staticmethod
    @transaction.atomic
    def request_salary_advance(member, amount, notes=""):
        """
        Enregistre une nouvelle demande d'avance sur salaire.
        """
        if amount <= 0:
            raise ValidationError(_("Le montant de l'avance doit être positif."))

        advance = SalaryAdvance.objects.create(
            member=member,
            amount=amount,
            status=AdvanceStatus.PENDING,
            notes=notes
        )
        return advance

    @staticmethod
    @transaction.atomic
    def approve_salary_advance(advance):
        """
        Approuve une demande d'avance sur salaire en attente.
        """
        if advance.status != AdvanceStatus.PENDING:
            raise ValidationError(_("Cette avance ne peut pas être approuvée car elle est dans le statut : %(status)s."),
                                  params={'status': advance.get_status_display()})

        advance.status = AdvanceStatus.APPROVED
        advance.save()
        return advance

    @staticmethod
    @transaction.atomic
    def reject_salary_advance(advance):
        """
        Rejette une demande d'avance sur salaire en attente.
        """
        if advance.status != AdvanceStatus.PENDING:
            raise ValidationError(_("Cette avance ne peut pas être rejetée car elle est dans le statut : %(status)s."),
                                  params={'status': advance.get_status_display()})

        advance.status = AdvanceStatus.REJECTED
        advance.save()
        return advance

    @staticmethod
    @transaction.atomic
    def generate_monthly_payroll(member, month, year):
        """
        Calcule la fiche de rémunération mensuelle d'un membre et impute ses avances approuvées.
        """
        # Vérification si la paie existe déjà pour ce cycle
        existing = MonthlyCompensation.objects.filter(member=member, mois=month, annee=year).first()
        if existing:
            raise ValidationError(_("Une fiche de paie existe déjà pour ce collaborateur au mois de %(month)s/%(year)s."),
                                  params={'month': month, 'year': year})

        # Salaire de base contractuel
        base_salary = member.remuneration_mensuelle_standard

        # Recherche de toutes les avances approuvées et non encore déduites
        advances = SalaryAdvance.objects.filter(
            member=member,
            status=AdvanceStatus.APPROVED
        )

        total_advances = sum(adv.amount for adv in advances)

        # Si les avances dépassent le salaire brut du mois, on plafonne la déduction au salaire du mois
        # et on garde le reste à déduire pour les mois suivants
        deduction = min(total_advances, base_salary)

        # Création de la fiche mensuelle
        payroll = MonthlyCompensation.objects.create(
            member=member,
            mois=month,
            annee=year,
            montant_du=base_salary,
            avances_deduites=deduction,
            net_amount_payable=base_salary - deduction,
            paid_amount=0,
            amount_remaining=base_salary - deduction,
            payment_status=PaymentStatus.UNPAID
        )

        # Mise à jour des fiches d'avances qui ont été imputées
        remaining_deduction = deduction
        for adv in advances:
            if remaining_deduction <= 0:
                break
            if adv.amount <= remaining_deduction:
                # L'avance est entièrement compensée
                remaining_deduction -= adv.amount
                adv.status = AdvanceStatus.DEDUCTED
                adv.save()
            else:
                # L'avance est partiellement déduite. On réduit son montant et on la laisse active,
                # ou on crée une nouvelle avance résiduelle. Pour simplifier, on déduit l'avance complète et on 
                # crée une avance résiduelle en attente/approuvée pour le reste.
                residual_amount = adv.amount - remaining_deduction
                adv.status = AdvanceStatus.DEDUCTED
                adv.save()
                
                # Création de l'avance résiduelle approuvée
                SalaryAdvance.objects.create(
                    member=member,
                    grant_date=adv.grant_date,
                    amount=residual_amount,
                    status=AdvanceStatus.APPROVED,
                    notes=_("Reste de l'avance d'origine ID %s après déduction partielle.") % adv.id
                )
                remaining_deduction = 0

        return payroll

    @staticmethod
    @transaction.atomic
    def pay_monthly_compensation(payroll, amount, payment_mode, transaction_reference="", notes=""):
        """
        Règle tout ou partie de la rémunération mensuelle d'un membre.
        """
        if amount <= 0:
            raise ValidationError(_("Le montant du versement doit être positif."))

        if amount > payroll.amount_remaining:
            raise ValidationError(_("Le montant de %(amount)s dépasse le reste à payer de %(due)s pour cette paie."),
                                  params={'amount': amount, 'due': payroll.amount_remaining})

        payment = CompensationPayment.objects.create(
            monthly_compensation=payroll,
            amount=amount,
            payment_mode=payment_mode,
            transaction_reference=transaction_reference,
            notes=notes
        )

        payroll.paid_amount += amount
        payroll.amount_remaining = payroll.net_amount_payable - payroll.paid_amount

        if payroll.amount_remaining <= 0:
            payroll.payment_status = PaymentStatus.PAID
        else:
            payroll.payment_status = PaymentStatus.PARTIALLY_PAID

        payroll.save()
        return payment
