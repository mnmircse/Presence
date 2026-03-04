-- Schema: initialize tables for the database
-- Adjust types/auto-increment for your SQL engine if needed

-- Minimal MySQL-compatible schema: only primary keys and basic column types.
CREATE TABLE IF NOT EXISTS users (
	admission_no VARCHAR(100) PRIMARY KEY,
	username VARCHAR(100),
	name VARCHAR(255),
	roll_no VARCHAR(100),
	email VARCHAR(255),
	college VARCHAR(100),
	department VARCHAR(100),
	branch VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS admis (
	id INT PRIMARY KEY AUTO_INCREMENT,
	name VARCHAR(255),
	email VARCHAR(255),
	college VARCHAR(100),
	department VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS colleges (
	id INT PRIMARY KEY AUTO_INCREMENT,
	college_code VARCHAR(100),
	name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS departments (
	id INT PRIMARY KEY AUTO_INCREMENT,
	name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS branches (
	id INT PRIMARY KEY AUTO_INCREMENT,
	name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS rooms (
	id INT PRIMARY KEY AUTO_INCREMENT,
	college VARCHAR(100),
	department VARCHAR(100),
	class VARCHAR(100),
	room_no VARCHAR(100),
	ap1 VARCHAR(100),
	ap2 VARCHAR(100),
	ap3 VARCHAR(100),
	tx1 VARCHAR(100),
	tx2 VARCHAR(100),
	tx3 VARCHAR(100)
);


