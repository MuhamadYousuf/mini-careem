"""
Django settings for the Drivers service.

This service stores driver PROFILES, which are documents: a bike rider, a car
captain and a rickshaw driver share almost no fields. MongoDB (via mongoengine)
lets each profile carry its own shape without schema migrations, so there is no
relational database here at all.
"""
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SECRET_KEY = os.environ.get("SECRET_KEY", "demo-not-secret")
DEBUG = os.environ.get("DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = ["*"]

# Minimal app set: no ORM apps (admin/auth/sessions) because we use MongoDB only.
INSTALLED_APPS = [
    # contenttypes + auth are imported by DRF's machinery. They are listed so
    # Django can resolve their app labels; the demo never queries them, and the
    # test suite uses no relational database.
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "rest_framework",
    "drivers",
]

MIDDLEWARE = [
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    },
]

# No relational database. mongoengine manages the MongoDB connection instead.
DATABASES = {}

REST_FRAMEWORK = {
    # Public demo: no auth. Add authentication before any real deployment.
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
}

USE_TZ = True
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- MongoDB connection (mongoengine) ---
# Overridden in tests to point at an in-memory mongomock instance.
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/drivers")
