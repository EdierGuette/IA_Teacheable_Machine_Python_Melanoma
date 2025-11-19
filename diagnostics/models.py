import uuid
from django.db import models
from users.models import User

class DiagnosticHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    patient_name = models.CharField(max_length=200)
    identification_number = models.CharField(max_length=50)
    diagnosis_date = models.DateTimeField(auto_now_add=True)
    diagnosis = models.CharField(max_length=100)
    risk_level = models.DecimalField(max_digits=5, decimal_places=2)
    probabilities = models.JSONField()
    image_data = models.TextField(blank=True, null=True)  # Base64 de la imagen
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Diagnóstico {self.id} - {self.patient_name}"
    
    class Meta:
        db_table = 'diagnostics_diagnostichistory'
        ordering = ['-diagnosis_date']