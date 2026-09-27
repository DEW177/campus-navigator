from sqlalchemy import Column, Integer, Float, ForeignKey
from app.database.database import Base


class Connection(Base):
    """An edge between two Nodes, used by Dijkstra/A* for pathfinding."""
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)
    from_node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    to_node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    weight = Column(Float, nullable=False)  # distance in meters, or time in seconds
