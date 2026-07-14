from django.apps import AppConfig


class DriversConfig(AppConfig):
    name = "drivers"

    def ready(self):
        # Open the MongoDB connection once, when the app starts. Tests replace
        # this with an in-memory mongomock connection (see tests.py).
        from django.conf import settings
        from mongoengine import connect, disconnect

        disconnect(alias="default")
        connect(host=settings.MONGODB_URI, alias="default")
