from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    FLEET_MANAGER = "FLEET_MANAGER"
    DRIVER = "DRIVER"
    SAFETY_OFFICER = "SAFETY_OFFICER"
    FINANCIAL_ANALYST = "FINANCIAL_ANALYST"


class User(AbstractUser):
    role = models.CharField(max_length=32, choices=Role.choices, blank=True)
