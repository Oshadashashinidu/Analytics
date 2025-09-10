-- ========================
-- INSERT TEST DATA
-- ========================

-- 1. Insert buildings
INSERT INTO BUILDING (building_id, dept_name) VALUES
(1, 'Computer Dept'),
(2, 'Elec Dept');

-- 2. Insert QR codes
INSERT INTO QR_Code (qr_id, qr_value, issue_date, status) VALUES
(1, 'QR001', CURRENT_DATE, 'Active'),
(2, 'QR002', CURRENT_DATE, 'Active'),
(3, 'QR003', CURRENT_DATE, 'Active'),
(4, 'QR004', CURRENT_DATE, 'Active'),
(5, 'QR005', CURRENT_DATE, 'Active');

-- 3. Insert persons
INSERT INTO PERSON (person_id, name, qr_id, contact_info) VALUES
(1, 'Person 1', 1, 'person1@example.com'),
(2, 'Person 2', 2, 'person2@example.com'),
(3, 'Person 3', 3, 'person3@example.com'),
(4, 'Person 4', 4, 'person4@example.com'),
(5, 'Person 5', 5, 'person5@example.com');

-- 4. Insert EntryExit logs
-- Person 1 enters Computer Dept building
INSERT INTO EntryExitLog (log_id, qr_id, building_id, entry_time, exit_time) VALUES
(1, 1, 1, '2025-09-09 08:30:00+05:30', '2025-09-09 12:00:00+05:30');

-- Person 2 enters Elec Dept building
INSERT INTO EntryExitLog (log_id, qr_id, building_id, entry_time, exit_time) VALUES
(2, 2, 2, '2025-09-09 09:00:00+05:30', '2025-09-09 17:00:00+05:30');

-- Person 3 enters Computer Dept building (still inside)
INSERT INTO EntryExitLog (log_id, qr_id, building_id, entry_time) VALUES
(3, 3, 1, '2025-09-09 10:15:00+05:30');

-- Person 4 enters Computer Dept building
INSERT INTO EntryExitLog (log_id, qr_id, building_id, entry_time, exit_time) VALUES
(4, 4, 1, '2025-09-09 11:00:00+05:30', '2025-09-09 13:30:00+05:30');

-- Person 5 enters Elec Dept building (still inside)
INSERT INTO EntryExitLog (log_id, qr_id, building_id, entry_time) VALUES
(5, 5, 2, '2025-09-09 14:00:00+05:30');
