-- Campus Navigator database schema (PostgreSQL)

CREATE TABLE buildings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL
);

CREATE TABLE nodes (
    id SERIAL PRIMARY KEY,
    label VARCHAR(255),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    floor INTEGER DEFAULT 1
);

CREATE TABLE connections (
    id SERIAL PRIMARY KEY,
    from_node_id INTEGER NOT NULL REFERENCES nodes(id),
    to_node_id INTEGER NOT NULL REFERENCES nodes(id),
    weight DOUBLE PRECISION NOT NULL  -- distance in meters
);

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    floor INTEGER DEFAULT 1,
    building_id INTEGER REFERENCES buildings(id),
    node_id INTEGER REFERENCES nodes(id)
);

CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    section VARCHAR(50),
    room_id INTEGER REFERENCES rooms(id)
);

CREATE INDEX idx_rooms_name ON rooms(name);
CREATE INDEX idx_connections_from ON connections(from_node_id);
CREATE INDEX idx_connections_to ON connections(to_node_id);
