from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyMemberViewSet, MonthlyCompensationViewSet, SalaryAdvanceViewSet, CompensationPaymentViewSet

router = DefaultRouter()
router.register(r'members', CompanyMemberViewSet, basename='companymember')
router.register(r'payrolls', MonthlyCompensationViewSet, basename='monthlycompensation')
router.register(r'advances', SalaryAdvanceViewSet, basename='salaryadvance')
router.register(r'payments', CompensationPaymentViewSet, basename='compensationpayment')

urlpatterns = [
    path('', include(router.urls)),
]
