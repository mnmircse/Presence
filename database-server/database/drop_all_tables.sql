-- Drop all tables safely (MySQL)
-- WARNING: This will remove all data. Backup before running.

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admis;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS colleges;

SET FOREIGN_KEY_CHECKS = 1;

-- End of script