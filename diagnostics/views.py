import io
import json
import os
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

# imports para modelo
from PIL import Image, ImageOps
import numpy as np
from keras.models import load_model

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# carga del modelo al iniciar el servidor (solo una vez)
MODEL_PATH = os.path.join(BASE_DIR, 'keras_model.h5')
LABELS_PATH = os.path.join(BASE_DIR, 'labels.txt')

# Cargar modelo y etiquetas
model = None
class_names = []
try:
    model = load_model(MODEL_PATH, compile=False)
except Exception as e:
    print("Error cargando modelo:", e)

try:
    with open(LABELS_PATH, 'r', encoding='utf-8') as f:
        class_names = [line.strip() for line in f.readlines()]
except Exception as e:
    print("Error cargando labels:", e)

def index(request):
    return render(request, 'diagnostics/index.html', context={})

def get_confidence_display(confidence_percentage):
    """Convierte porcentaje a nivel de semáforo y rango aproximado"""
    # Redondea al múltiplo de 5 más cercano
    rounded_confidence = round(confidence_percentage / 5) * 5
    
    if confidence_percentage >= 80:
        return "🟢 Bajo riesgo", f"≈ {rounded_confidence}%"
    elif confidence_percentage >= 50:
        return "🟡 Riesgo intermedio", f"≈ {rounded_confidence}%"
    else:
        return "🔴 Alto riesgo", f"≈ {rounded_confidence}%"

def get_user_friendly_class_name(full_class_name):
    """Convierte nombres técnicos a nombres comprensibles para el usuario"""
    if "Maligno" in full_class_name:
        return "Maligno (sospecha de melanoma)"
    elif "Benigno" in full_class_name:
        return "Benigno (no peligroso)"
    elif "Indeterminado" in full_class_name or "Desconocido" in full_class_name:
        return "Indeterminado (evaluación médica recomendada)"
    else:
        return full_class_name

def get_simplified_class_name(full_class_name):
    """Extrae solo la parte principal del nombre de la clase para gráficos"""
    if "Maligno" in full_class_name:
        return "Maligno"
    elif "Benigno" in full_class_name:
        return "Benigno"
    elif "Indeterminado" in full_class_name or "Desconocido" in full_class_name:
        return "Indeterminado"
    else:
        return full_class_name

@csrf_exempt
def api_predict(request):
    """
    Endpoint: POST /api/predict/
    Form data: file field named 'image'
    Response JSON:
    {
      "probabilities": [0.1, 0.9, ...],
      "predicted_index": 1,
      "predicted_class": "Benigno (no peligroso)",
      "simplified_class": "Benigno",
      "confidence": 87.2,
      "confidence_level": "🟢 Bajo riesgo",
      "confidence_range": "≈ 85%"
    }
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    if model is None:
        return JsonResponse({'error': 'Modelo no cargado en el servidor'}, status=500)

    # obtener archivo
    image_file = request.FILES.get('image')
    if image_file is None:
        return JsonResponse({'error': 'No file provided'}, status=400)

    try:
        # Leer imagen en PIL
        image = Image.open(image_file).convert('RGB')

        # Preprocessing idéntico al que usaste
        size = (224, 224)
        image = ImageOps.fit(image, size, Image.Resampling.LANCZOS)
        image_array = np.asarray(image)
        normalized_image_array = (image_array.astype(np.float32) / 127.5) - 1
        data = np.ndarray(shape=(1, 224, 224, 3), dtype=np.float32)
        data[0] = normalized_image_array

        # Predecir
        prediction = model.predict(data)
        probs = prediction[0].tolist()
        index = int(np.argmax(prediction[0]))
        
        # Obtener nombre original y convertirlo a formato amigable
        original_class_name = class_names[index] if index < len(class_names) else f"Clase {index}"
        user_friendly_class = get_user_friendly_class_name(original_class_name)
        simplified_class = get_simplified_class_name(original_class_name)
        
        confidence = float(prediction[0][index]) * 100.0  # porcentaje 0-100
        
        # Calcular nivel de confianza y rango
        confidence_level, confidence_range = get_confidence_display(confidence)

        return JsonResponse({
            'probabilities': probs,
            'predicted_index': index,
            'predicted_class': user_friendly_class,
            'simplified_class': simplified_class,
            'confidence': round(confidence, 2),
            'confidence_level': confidence_level,
            'confidence_range': confidence_range
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)