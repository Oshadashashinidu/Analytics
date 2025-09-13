-- ============================================
-- Insert Data for BUILDING Table
-- ============================================

INSERT INTO BUILDING (building_id, Dept_Name, total_count) VALUES
('A22', 'Drawing Office 2', 1),
('A25', 'Structures Laboratory', 0),
('B1', 'Department of Chemical and Process Engineering', 0),
('B2', 'Mathematics/Management/Computing Centre', 0),
('B3', 'Drawing Office 1', 0),
('C10', 'Electrical and Electronic Workshop', 0),
('C11/C12', 'Surveying/Soil Lab', 0),
('C13', 'Materials Lab', 0),
('C14', 'Environmental Lab', 0),
('C8', 'Department of Electrical and Electronic Engineering', 0),
('C9', 'Department of Computer Engineering', 0),
('D15', 'Fluids Lab', 0),
('D16/D17', 'New/Applied Mechanics Labs', 0),
('D18', 'Thermodynamics Lab', 0),
('D20/D21', 'Engineering Workshop/Engineering Carpentry Shop', 0),
('D28', 'Department of Manufacturing and Industrial Engineering', 0);


-- ============================================
-- Insert Data for EntryExitLog Table
-- ============================================

INSERT INTO EntryExitLog (tag_id, building_id, entry_time, exit_time) VALUES
(1, 'A22', '2025-09-23 10:15:20', '2025-09-23 12:45:35'),
(2, 'B1',  '2025-09-23 11:05:10', '2025-09-23 13:40:50'),
(3, 'B2',  '2025-09-23 14:20:00', '2025-09-23 16:10:45'),
(4, 'B3',  '2025-09-23 15:05:15', '2025-09-23 16:30:25'),
(5, 'B3',  '2025-09-23 17:45:30', '2025-09-23 18:25:40');
