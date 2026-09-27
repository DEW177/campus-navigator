from app.models.outdoor_usage import OutdoorUsage


def upgrade(connection):
    OutdoorUsage.__table__.create(connection, checkfirst=True)
