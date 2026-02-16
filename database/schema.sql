CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE offices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category ENUM('academic','non_academic','maintenance','administration') NOT NULL
);

CREATE TABLE positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NULL,
  name VARCHAR(120) NOT NULL,
  category ENUM('teaching','non_teaching','maintenance','management') NOT NULL,
  FOREIGN KEY (office_id) REFERENCES offices(id)
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  employee_id VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  gender VARCHAR(20),
  civil_status VARCHAR(30),
  date_of_birth DATE,
  email VARCHAR(120),
  contact_number VARCHAR(30),
  address TEXT,
  date_hired DATE,
  employment_status VARCHAR(50),
  office_id INT,
  position_id INT,
  profile_photo VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (office_id) REFERENCES offices(id),
  FOREIGN KEY (position_id) REFERENCES positions(id)
);

CREATE TABLE employee_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  document_type VARCHAR(60) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE leave_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active TINYINT(1) DEFAULT 1
);

CREATE TABLE leave_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INT NOT NULL,
  reason TEXT NOT NULL,
  supporting_document VARCHAR(255),
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  remarks TEXT,
  date_filed DATETIME NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
);

CREATE TABLE leave_approval_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leave_application_id INT NOT NULL,
  approver_user_id INT NOT NULL,
  approval_step VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL,
  remarks TEXT,
  approved_at DATETIME,
  FOREIGN KEY (leave_application_id) REFERENCES leave_applications(id),
  FOREIGN KEY (approver_user_id) REFERENCES users(id)
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message VARCHAR(255) NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id INT NOT NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE leave_workflows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applicant_role VARCHAR(40) NOT NULL,
  position_category ENUM('teaching','non_teaching','maintenance','management') NULL,
  approver_role VARCHAR(40) NOT NULL,
  sequence_no INT NOT NULL
);

INSERT INTO leave_workflows (applicant_role, position_category, approver_role, sequence_no) VALUES
('staff', 'teaching', 'head', 1),
('staff', 'teaching', 'dean', 2),
('staff', 'teaching', 'executive', 3),
('staff', 'non_teaching', 'head', 1),
('staff', 'non_teaching', 'executive', 2),
('dean', NULL, 'executive', 1),
('executive', NULL, 'executive', 1);
