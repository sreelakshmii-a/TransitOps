from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class AuthAPITests(APITestCase):
    def test_register_returns_user_envelope(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "alex",
                "email": "alex@example.com",
                "password": "hunter2pass",
                "role": "FLEET_MANAGER",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["email"], "alex@example.com")
        self.assertNotIn("password", response.data["user"])

    def test_register_duplicate_email_rejected(self):
        User.objects.create_user(username="a", email="dup@example.com", password="x")
        response = self.client.post(
            "/api/auth/register/",
            {"username": "b", "email": "dup@example.com", "password": "x", "role": "DRIVER"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_with_email_and_password(self):
        User.objects.create_user(username="alex", email="alex@example.com", password="hunter2pass")
        response = self.client.post(
            "/api/auth/login/", {"email": "alex@example.com", "password": "hunter2pass"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_wrong_password_returns_frozen_shape(self):
        User.objects.create_user(username="alex", email="alex@example.com", password="hunter2pass")
        response = self.client.post(
            "/api/auth/login/", {"email": "alex@example.com", "password": "wrong"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["reason"], "invalid_credentials")
        self.assertEqual(response.data["code"], "invalid_credentials")

    def test_me_requires_authentication(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_authenticated_user(self):
        user = User.objects.create_user(username="alex", email="alex@example.com", password="x", role="DRIVER")
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["email"], "alex@example.com")
        self.assertEqual(response.data["user"]["role"], "DRIVER")


class SeedDataLoginTests(APITestCase):
    """The demo accounts documented in IMPLEMENTATION.md must be loginable
    after `loaddata seed_data` — this is exactly what the deployed build runs."""

    fixtures = ["seed_data"]

    DEMO_ACCOUNTS = [
        ("fleet@transitops.test", "FLEET_MANAGER"),
        ("driver@transitops.test", "DRIVER"),
        ("safety@transitops.test", "SAFETY_OFFICER"),
        ("finance@transitops.test", "FINANCIAL_ANALYST"),
    ]

    def test_seeded_demo_users_can_login(self):
        for email, role in self.DEMO_ACCOUNTS:
            with self.subTest(email=email):
                response = self.client.post(
                    "/api/auth/login/", {"email": email, "password": "password123"}
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertIn("access", response.data)
                self.assertEqual(User.objects.get(email=email).role, role)
