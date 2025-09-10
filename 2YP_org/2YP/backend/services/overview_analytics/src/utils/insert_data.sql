-- ========================
-- INSERT TEST DATA
-- ========================

-- 1. Insert buildings
INSERT INTO Building (building_id, dept_name) VALUES
(1, 'Computer Science'),
(2, 'Electrical Engineering'),
(3, 'Mechanical Engineering');

-- 2. Insert QR codes
INSERT INTO QR_Code (qr_id, qr_value, issue_date, status) VALUES
(1, 'QR001', '2025-09-10', 'Active'),
(2, 'QR002', '2025-09-10', 'Active'),
(3, 'QR003', '2025-09-10', 'Active'),
(4, 'QR004', '2025-09-10', 'Expired'),
(5, 'QR005', '2025-09-10', 'Active');

-- 3. Insert persons
INSERT INTO Person (person_id, name, qr_id, contact_info) VALUES
(1, 'Alice Johnson', 1, 'alice@example.com'),
(2, 'Bob Smith', 2, 'bob@example.com'),
(3, 'Charlie Brown', 3, 'charlie@example.com'),
(4, 'Diana White', 4, 'diana@example.com'),
(5, 'Ethan Green', 5, 'ethan@example.com');

-- 4. Insert EntryExit logs
INSERT INTO EntryExitLog (log_id, qr_id, building_id, entry_time, exit_time) VALUES
(6, 1, 1, '2025-09-10 08:00:00+05:30', '2025-09-10 12:00:00+05:30'),
(7, 2, 1, '2025-09-10 09:15:00+05:30', '2025-09-10 10:45:00+05:30'),
(8, 3, 2, '2025-09-10 10:00:00+05:30', '2025-09-10 11:30:00+05:30'),
(9, 4, 3, '2025-09-10 08:30:00+05:30', '2025-09-10 12:15:00+05:30'),
(10, 5, 2, '2025-09-10 07:45:00+05:30', '2025-09-10 09:30:00+05:30');
