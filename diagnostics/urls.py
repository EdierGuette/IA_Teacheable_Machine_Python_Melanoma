from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('predict/', views.api_predict, name='api_predict'),  # ✅ CORRECTO
    path('diagnostics/', views.diagnostic_history, name='diagnostic_history'),  # ✅ CORRECTO
    path('diagnostics/<uuid:diagnostic_id>/', views.diagnostic_detail, name='diagnostic_detail'),  # ✅ CORRECTO
]