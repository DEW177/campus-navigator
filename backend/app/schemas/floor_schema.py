from pydantic import BaseModel, ConfigDict, field_serializer


class FloorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    building_id: int
    number: int
    name: str
    image_url: str
    width: float
    height: float
    meters_per_unit: float | None
    routing_ready: bool = True

    @field_serializer("meters_per_unit")
    def public_scale(self, value):
        # Unmeasured source drawings have no public metric scale.
        return value if self.routing_ready else None
