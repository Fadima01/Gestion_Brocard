from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, TokenObtainView

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    path('token/', TokenObtainView.as_view(), name='token_obtain'),
    path('', include(router.urls)),
]
