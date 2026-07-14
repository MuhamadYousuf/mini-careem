from django.urls import path

from .views import DriverDetailView, DriverListCreateView, HealthView

urlpatterns = [
    path("health", HealthView.as_view()),
    path("", DriverListCreateView.as_view()),
    path("<str:driver_id>", DriverDetailView.as_view()),
]
