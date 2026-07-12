# PLACEHOLDER STUB — owned by Dev A. Created only so AUTH_USER_MODEL and
# downstream FKs (Trip.driver -> ... ) aren't blocked by contract-lock
# ordering. Dev A: flesh this out (fields, validation) in Hour 1/2 and
# replace this notice.
from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    FLEET_MANAGER = "FLEET_MANAGER"
    DRIVER = "DRIVER"
    SAFETY_OFFICER = "SAFETY_OFFICER"
    FINANCIAL_ANALYST = "FINANCIAL_ANALYST"


class User(AbstractUser):
    role = models.CharField(max_length=32, choices=Role.choices, blank=True)
