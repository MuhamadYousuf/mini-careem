from django.urls import include, path

urlpatterns = [
    path("api/drivers/", include("drivers.urls")),
]
