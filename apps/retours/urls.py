from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerReturnViewSet, ReturnLineViewSet

router = DefaultRouter()
router.register(r'returns', CustomerReturnViewSet, basename='customerreturn')
router.register(r'lines', ReturnLineViewSet, basename='returnline')

urlpatterns = [
    path('', include(router.urls)),
]
