DROP TABLE IF EXISTS EntryExitLog CASCADE;
DROP TABLE IF EXISTS PERSON CASCADE;
DROP TABLE IF EXISTS QR_Code CASCADE;
DROP TABLE IF EXISTS BUILDING CASCADE;
CREATE DATABASE overview_analytics;

-- 1. Building table
CREATE TABLE BUILDING (
    building_id SERIAL PRIMARY KEY,
    dept_name VARCHAR(255) NOT NULL
);

-- 2. QR_Code table replaces RFID_Tag
CREATE TABLE QR_Code (
    qr_id SERIAL PRIMARY KEY,
    qr_value VARCHAR(255) UNIQUE NOT NULL, -- Unique QR string or ticket number
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' -- Active, Expired, Used
);

-- 3. Person table now references QR_Code
CREATE TABLE PERSON (
    person_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    qr_id INT UNIQUE NOT NULL, -- One QR per person
    contact_info TEXT,
    CONSTRAINT fk_qr_code
        FOREIGN KEY(qr_id)
        REFERENCES QR_Code(qr_id)
        ON DELETE CASCADE
);

-- 4. EntryExitLog table uses qr_id instead of tag_id
CREATE TABLE EntryExitLog (
    log_id SERIAL PRIMARY KEY,
    qr_id INT NOT NULL,
    building_id INT NOT NULL,
    entry_time TIMESTAMPTZ DEFAULT NOW(),
    exit_time TIMESTAMPTZ,
    CONSTRAINT fk_qr
        FOREIGN KEY(qr_id)
        REFERENCES QR_Code(qr_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_building
        FOREIGN KEY(building_id)
        REFERENCES BUILDING(building_id)
        ON DELETE CASCADE
);

INSERT INTO BUILDING (dept_name) VALUES ('Computer Science');
INSERT INTO BUILDING (dept_name) VALUES ('Engineering');

INSERT INTO QR_Code (qr_value) VALUES ('QR001');
INSERT INTO QR_Code (qr_value) VALUES ('QR002');