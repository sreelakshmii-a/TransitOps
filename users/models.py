from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    FLEET_MANAGER = "FLEET_MANAGER"
    DRIVER = "DRIVER"
    SAFETY_OFFICER = "SAFETY_OFFICER"
    FINANCIAL_ANALYST = "FINANCIAL_ANALYST"


class User(AbstractUser):
    # PRD 3.1 mandates email+password login (not AbstractUser's default
    # username-based auth) — email must be unique for that lookup to be sound.
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=32, choices=Role.choices, blank=True)
