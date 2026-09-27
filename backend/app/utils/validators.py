"""Reusable input validation helpers."""


def is_valid_coordinate(lat: float, lng: float) -> bool:
    """Check that a latitude/longitude pair is within valid Earth ranges."""
    return -90 <= lat <= 90 and -180 <= lng <= 180
