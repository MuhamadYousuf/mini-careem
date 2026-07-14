"""REST endpoints for driver profiles, backed by mongoengine documents."""
from mongoengine import ValidationError as MongoValidationError
from mongoengine.errors import DoesNotExist
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .documents import Driver
from .serializers import DriverCreateSerializer, DriverUpdateSerializer


class HealthView(APIView):
    """Liveness probe used by Docker / the gateway."""

    def get(self, request):
        return Response({"status": "drivers ok"})


class DriverListCreateView(APIView):
    def get(self, request):
        # Optional ?vehicle_type=CAR filter to show querying a document store.
        query = {}
        vehicle_type = request.query_params.get("vehicle_type")
        if vehicle_type:
            query["vehicle_type"] = vehicle_type
        drivers = Driver.objects(**query)
        return Response([d.to_dict() for d in drivers])

    def post(self, request):
        serializer = DriverCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        driver = Driver(**data)
        try:
            driver.save()
        except MongoValidationError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(driver.to_dict(), status=status.HTTP_201_CREATED)


class DriverDetailView(APIView):
    def _get(self, driver_id):
        return Driver.objects.get(id=driver_id)

    def get(self, request, driver_id):
        try:
            driver = self._get(driver_id)
        except (DoesNotExist, MongoValidationError):
            return Response({"error": "driver not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(driver.to_dict())

    def patch(self, request, driver_id):
        try:
            driver = self._get(driver_id)
        except (DoesNotExist, MongoValidationError):
            return Response({"error": "driver not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = DriverUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(driver, field, value)
        driver.save()
        return Response(driver.to_dict())

    def delete(self, request, driver_id):
        try:
            driver = self._get(driver_id)
        except (DoesNotExist, MongoValidationError):
            return Response({"error": "driver not found"}, status=status.HTTP_404_NOT_FOUND)
        driver.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
