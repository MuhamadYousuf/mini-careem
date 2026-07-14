"""
Unit tests for the Drivers service.

Every test runs against an in-memory MongoDB provided by mongomock, so the
suite needs no running database. We reconnect mongoengine to mongomock in
setUp and wipe it in tearDown for isolation.
"""
import mongomock
from django.test import SimpleTestCase
from mongoengine import connect, disconnect
from rest_framework.test import APIClient

from .documents import Driver


class DriverApiTests(SimpleTestCase):
    def setUp(self):
        disconnect(alias="default")
        # mongomock gives an in-memory Mongo with no external server.
        connect(
            "drivers_test",
            mongo_client_class=mongomock.MongoClient,
            alias="default",
            uuidRepresentation="standard",
        )
        self.client = APIClient()

    def tearDown(self):
        Driver.drop_collection()
        disconnect(alias="default")

    def _make_bike(self):
        return {
            "name": "Bilal",
            "phone": "+923001234567",
            "license_number": "LIC-BIKE-1",
            "vehicle_type": "BIKE",
            "vehicle": {"engine_cc": 70},
        }

    def test_health(self):
        res = self.client.get("/api/drivers/health")
        self.assertEqual(res.status_code, 200)

    def test_create_driver_returns_201_and_keeps_flexible_vehicle(self):
        res = self.client.post("/api/drivers/", self._make_bike(), format="json")
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertEqual(body["vehicle_type"], "BIKE")
        # The flexible, vehicle-specific field survived the round trip.
        self.assertEqual(body["vehicle"]["engine_cc"], 70)
        self.assertEqual(body["status"], "PENDING")
        self.assertTrue(body["id"])

    def test_different_vehicle_types_store_different_shapes(self):
        # This is the crux of choosing MongoDB: no shared schema is imposed.
        self.client.post("/api/drivers/", self._make_bike(), format="json")
        self.client.post(
            "/api/drivers/",
            {
                "name": "Sana",
                "phone": "+923009999999",
                "license_number": "LIC-CAR-1",
                "vehicle_type": "CAR",
                "vehicle": {"make": "Toyota", "seats": 4, "ac": True},
            },
            format="json",
        )
        cars = self.client.get("/api/drivers/?vehicle_type=CAR").json()
        self.assertEqual(len(cars), 1)
        self.assertEqual(cars[0]["vehicle"]["make"], "Toyota")
        self.assertTrue(cars[0]["vehicle"]["ac"])

    def test_create_rejects_missing_required_field(self):
        bad = self._make_bike()
        del bad["license_number"]
        res = self.client.post("/api/drivers/", bad, format="json")
        self.assertEqual(res.status_code, 400)

    def test_create_rejects_unknown_vehicle_type(self):
        bad = self._make_bike()
        bad["vehicle_type"] = "SUBMARINE"
        res = self.client.post("/api/drivers/", bad, format="json")
        self.assertEqual(res.status_code, 400)

    def test_retrieve_and_update_status(self):
        created = self.client.post("/api/drivers/", self._make_bike(), format="json").json()
        driver_id = created["id"]

        res = self.client.get(f"/api/drivers/{driver_id}")
        self.assertEqual(res.status_code, 200)

        res = self.client.patch(
            f"/api/drivers/{driver_id}", {"status": "ACTIVE"}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ACTIVE")

    def test_missing_driver_returns_404(self):
        # A valid-looking but absent ObjectId.
        res = self.client.get("/api/drivers/507f1f77bcf86cd799439011")
        self.assertEqual(res.status_code, 404)

    def test_delete_removes_driver(self):
        created = self.client.post("/api/drivers/", self._make_bike(), format="json").json()
        driver_id = created["id"]

        res = self.client.delete(f"/api/drivers/{driver_id}")
        self.assertEqual(res.status_code, 204)

        res = self.client.get(f"/api/drivers/{driver_id}")
        self.assertEqual(res.status_code, 404)

    def test_documents_list_is_persisted(self):
        payload = self._make_bike()
        payload["documents"] = [
            {"kind": "license", "url": "s3://scans/lic.png"},
            {"kind": "id_card", "url": "s3://scans/id.png"},
        ]
        res = self.client.post("/api/drivers/", payload, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(len(res.json()["documents"]), 2)
