import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'cambia-esto-por-una-clave-secreta'  # en producción cámbialo

DEBUG = True

ALLOWED_HOSTS = []

INSTALLED_APPS = [
    'django.contrib.staticfiles',
    'diagnostics',
]

MIDDLEWARE = [
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'skin_cancer_dashboard.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [ BASE_DIR / 'diagnostics' / 'templates' ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [],
        },
    },
]

WSGI_APPLICATION = 'skin_cancer_dashboard.wsgi.application'

# No usamos base de datos por ahora
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Static files (CSS, JS)
STATIC_URL = '/static/'
STATICFILES_DIRS = [ BASE_DIR / 'diagnostics' / 'static' ]
STATIC_ROOT = BASE_DIR / 'staticfiles'
