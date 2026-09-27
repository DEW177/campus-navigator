-- Sample data for local development/testing

INSERT INTO buildings (name, code, latitude, longitude) VALUES
('อาคารวิทยาลัยการคอมพิวเตอร์', 'SC06', 16.4735, 102.8236),
('อาคารเรียนรวม', 'RC01', 16.4728, 102.8241);

INSERT INTO nodes (label, latitude, longitude, floor) VALUES
('ทางเข้า SC06', 16.4735, 102.8236, 1),
('ทางแยกหน้า SC06', 16.4737, 102.8238, 1),
('ทางเข้า RC01', 16.4728, 102.8241, 1);

INSERT INTO connections (from_node_id, to_node_id, weight) VALUES
(1, 2, 25.0),
(2, 3, 60.0);

INSERT INTO rooms (name, floor, building_id, node_id) VALUES
('SC06-301', 3, 1, 1),
('RC01-101', 1, 2, 3);

INSERT INTO courses (code, name, section, room_id) VALUES
('CP353761', 'สัมมนาทางวิทยาการคอมพิวเตอร์', '1', 1);
