from django.contrib import admin
from .models import DiagnosticHistory

@admin.register(DiagnosticHistory)
class DiagnosticHistoryAdmin(admin.ModelAdmin):
    list_display = ['patient_name', 'identification_number', 'diagnosis', 'risk_level', 'diagnosis_date']
    list_filter = ['diagnosis', 'diagnosis_date']
    search_fields = ['patient_name', 'identification_number']
    readonly_fields = ['diagnosis_date']