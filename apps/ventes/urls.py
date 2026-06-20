from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, OrderViewSet, OrderLineViewSet, CustomerPaymentViewSet, ReservationViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'lines', OrderLineViewSet, basename='orderline')
router.register(r'payments', CustomerPaymentViewSet, basename='customerpayment')
router.register(r'reservations', ReservationViewSet, basename='reservation')

urlpatterns = [
    path('', include(router.urls)),
]
