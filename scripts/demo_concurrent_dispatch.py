"""
Concurrency demo forcing mechanism (council fix): fires two near-simultaneous
POST /api/dispatch/:id/ requests instead of manual two-tab clicking, which is
sequential at the HTTP level and proves nothing about the row lock.

Usage (with the dev server running on :8000, seed data loaded):
    python manage.py loaddata seed_data
    python manage.py runserver 8000
    # in another terminal, optionally widen the race window further:
    DISPATCH_DEBUG_DELAY_MS=300 python manage.py runserver 8000
    python scripts/demo_concurrent_dispatch.py

Dispatches trip 5 and trip 6 from the seed fixture — both DRAFT, both
pointing at the same AVAILABLE vehicle+driver — so exactly one should
succeed and the other should get 409 vehicle_unavailable.
"""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import django
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "transitops.settings")
django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from rest_framework_simplejwt.tokens import RefreshToken  # noqa: E402

BASE_URL = "http://localhost:8000"
TRIP_IDS = (5, 6)


def get_demo_token():
    user, _ = get_user_model().objects.get_or_create(username="demo_dispatcher")
    return str(RefreshToken.for_user(user).access_token)


def dispatch(trip_id, headers):
    response = requests.post(f"{BASE_URL}/api/dispatch/{trip_id}/", headers=headers)
    return trip_id, response.status_code, response.json()


def main():
    headers = {"Authorization": f"Bearer {get_demo_token()}"}
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(dispatch, trip_id, headers) for trip_id in TRIP_IDS]
        results = [f.result() for f in futures]

    for trip_id, status, body in results:
        print(f"trip {trip_id}: {status} {body}")

    successes = sum(1 for _, status, _ in results if status == 200)
    print(f"\n{successes} of {len(TRIP_IDS)} dispatch calls succeeded (expected: 1)")


if __name__ == "__main__":
    main()
