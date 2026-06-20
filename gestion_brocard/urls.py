"""
URL configuration for gestion_brocard project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints V1
    path('api/v1/core/', include('apps.core.urls')),
    path('api/v1/users/', include('apps.users.urls')),
    path('api/v1/catalogue/', include('apps.catalogue.urls')),
    path('api/v1/achats/', include('apps.achats.urls')),
    path('api/v1/stocks/', include('apps.stocks.urls')),
    path('api/v1/production/', include('apps.production.urls')),
    path('api/v1/ventes/', include('apps.ventes.urls')),
    path('api/v1/livraisons/', include('apps.livraisons.urls')),
    path('api/v1/depenses/', include('apps.depenses.urls')),
    path('api/v1/remunerations/', include('apps.remunerations.urls')),
    path('api/v1/caisse/', include('apps.caisse.urls')),
    path('api/v1/retours/', include('apps.retours.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

