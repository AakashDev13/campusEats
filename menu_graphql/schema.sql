-- CampusEats Menu service - Assignment 7 (GraphQL)
-- Run:  mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS campuseats_menu;
USE campuseats_menu;

DROP TABLE IF EXISTS dishes;

CREATE TABLE dishes (
  id        INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(150)  NOT NULL,
  price     DECIMAL(10,2) NOT NULL,
  available BOOLEAN       NOT NULL DEFAULT TRUE
);

INSERT INTO dishes (name, price, available) VALUES
  ('Veg Burger',    60.00, TRUE),
  ('Masala Dosa',   80.00, TRUE),
  ('Cold Coffee',   50.00, TRUE),
  ('Samosa (2 pc)', 30.00, FALSE);
