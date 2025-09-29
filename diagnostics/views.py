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

@csrf_exempt
def api_predict(request):
    """
    Endpoint: POST /api/predict/
    Form data: file field named 'image'
    Response JSON:
    {
      "probabilities": [0.1, 0.9, ...],
      "predicted_index": 1,
      "predicted_class": "Benigno",
      "confidence": 87.2
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
        # class_names may include numbering; return raw string
        predicted_class = class_names[index] if index < len(class_names) else f"Clase {index}"
        confidence = float(prediction[0][index]) * 100.0  # porcentaje 0-100

        return JsonResponse({
            'probabilities': probs,
            'predicted_index': index,
            'predicted_class': predicted_class,
            'confidence': round(confidence, 2),
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
