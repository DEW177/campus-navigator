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

    @field_serializer("image_url")
    def public_image(self, value):
        # Existing SC09 imports retain their original SVG paths. Return the
        # standalone raster with the exact same viewport dimensions, so old
        # databases work without overwriting any surveyed data.
        replacements = {f"/static/sc09/floor-{n}.svg": f"/static/sc09/floor-{n}.png"
                        for n in range(1, 6)}
        return replacements.get(value, value)

    @field_serializer("meters_per_unit")
    def public_scale(self, value):
        # Unmeasured source drawings have no public metric scale.
        return value if self.routing_ready else None
