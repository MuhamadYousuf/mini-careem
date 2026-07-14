"""
Mongoengine documents for driver profiles.

The whole reason this service uses MongoDB is that driver profiles are NOT
uniform. A bike rider, a car captain and a rickshaw driver need different
fields. Rather than force them into one rigid table, we keep the shared fields
typed and let the vehicle-specific and document data ride along as flexible
sub-documents.
"""
import datetime

from mongoengine import (
    DateTimeField,
    Document,
    DictField,
    EmailField,
    ListField,
    StringField,
)

VEHICLE_TYPES = ("BIKE", "CAR", "RICKSHAW")
STATUSES = ("PENDING", "ACTIVE", "SUSPENDED")


class Driver(Document):
    """A driver profile. Shared fields are typed; per-vehicle data is flexible."""

    # --- fields every driver has, regardless of vehicle ---
    name = StringField(required=True, max_length=120)
    phone = StringField(required=True, max_length=20)
    email = EmailField()
    license_number = StringField(required=True, max_length=40)
    vehicle_type = StringField(required=True, choices=VEHICLE_TYPES)
    status = StringField(default="PENDING", choices=STATUSES)

    # --- flexible parts: shape depends on the vehicle ---
    # e.g. a CAR carries {"make": "Toyota", "seats": 4, "ac": true};
    #      a BIKE carries {"engine_cc": 70};
    #      a RICKSHAW carries {"permit_zone": "Karachi-South"}.
    vehicle = DictField()

    # A list of uploaded document references (identity scans, papers, etc.).
    documents = ListField(DictField())

    created_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        "collection": "drivers",
        "indexes": ["vehicle_type", "status"],
    }

    def to_dict(self):
        """Serialise to a plain JSON-friendly dict."""
        return {
            "id": str(self.id),
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "license_number": self.license_number,
            "vehicle_type": self.vehicle_type,
            "status": self.status,
            "vehicle": self.vehicle or {},
            "documents": self.documents or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
