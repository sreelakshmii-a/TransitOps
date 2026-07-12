from django.utils import timezone


def is_license_expired(driver):
    return driver.license_expiry is None or driver.license_expiry < timezone.now().date()
