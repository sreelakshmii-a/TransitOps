class ConflictError(Exception):
    def __init__(self, reason):
        self.reason = reason
        self.code = reason
        super().__init__(reason)


def dispatch_trip(trip_id: str) -> dict:
    """
    Returns {"success": True} or raises ConflictError(reason).

    Hour 1 stub — hardcoded success to unblock Dev C's UI work. Real
    select_for_update()-locked implementation with business-rule checks
    lands in Hour 2/3 per the build plan.
    """
    return {"success": True}
