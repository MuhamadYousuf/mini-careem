"""
Plain DRF serializers used only for validating incoming request bodies.

We deliberately do NOT use a ModelSerializer: there is no Django ORM model here,
just a mongoengine document. Validation stays explicit and simple.
"""
from rest_framework import serializers

from .documents import STATUSES, VEHICLE_TYPES


class DriverCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True)
    license_number = serializers.CharField(max_length=40)
    vehicle_type = serializers.ChoiceField(choices=VEHICLE_TYPES)
    # Free-form, per-vehicle payload. Flexibility is the point.
    vehicle = serializers.DictField(required=False, default=dict)
    documents = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )


class DriverUpdateSerializer(serializers.Serializer):
    """All fields optional: used for PATCH-style partial updates."""

    status = serializers.ChoiceField(choices=STATUSES, required=False)
    vehicle = serializers.DictField(required=False)
    documents = serializers.ListField(child=serializers.DictField(), required=False)
