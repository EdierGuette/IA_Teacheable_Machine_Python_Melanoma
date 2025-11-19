from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/', include('diagnostics.urls')),
    
    # Ruta para el dashboard (requiere autenticación)
    path('dashboard/', TemplateView.as_view(template_name='diagnostics/index.html'), name='dashboard'),
    
    # Ruta para login (pública)
    path('', TemplateView.as_view(template_name='diagnostics/login.html'), name='login'),
]

# Servir archivos estáticos en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)