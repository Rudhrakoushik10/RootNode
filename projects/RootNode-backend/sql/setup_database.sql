-- RootNode Database Setup Script
-- Run this script to create and seed the database

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS rootnode_db;
USE rootnode_db;

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  provider_wallet VARCHAR(255) NOT NULL,
  price_algo DECIMAL(10, 6) NOT NULL,
  category VARCHAR(100) NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  description TEXT,
  rating DECIMAL(3, 2) DEFAULT 4.0,
  avg_response_time_ms INT DEFAULT 500
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_name VARCHAR(255) NOT NULL,
  status ENUM('success', 'rejected', 'pending', 'refunded') NOT NULL,
  amount_algo DECIMAL(10, 6) NOT NULL,
  txid VARCHAR(100),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  note TEXT,
  reason TEXT,
  provider VARCHAR(255) NOT NULL
);

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_name VARCHAR(255) NOT NULL,
  amount_algo DECIMAL(10, 6) NOT NULL,
  txid VARCHAR(100),
  receipt_hash VARCHAR(255) NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  hash_on_chain BOOLEAN DEFAULT FALSE,
  provider VARCHAR(255) NOT NULL
);

-- Clear existing data
DELETE FROM receipts;
DELETE FROM transactions;
DELETE FROM services;

-- Reset auto increment
ALTER TABLE services AUTO_INCREMENT = 1;
ALTER TABLE transactions AUTO_INCREMENT = 1;
ALTER TABLE receipts AUTO_INCREMENT = 1;

-- Seed services with correct endpoints pointing to mock provider server
-- Provider wallets are Algorand addresses for receiving payments
INSERT INTO services (name, provider, provider_wallet, price_algo, category, endpoint, description, rating, avg_response_time_ms) VALUES
(
  'weather-forecast-india',
  'WeatherCo India',
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYVVHZW7',
  0.001,
  'weather',
  'http://localhost:4000/api/weather',
  'Real-time weather data for Indian cities',
  4.50,
  200
),
(
  'weather-forecast-global',
  'GlobalWeather API',
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYVVHZW7',
  0.0015,
  'weather',
  'http://localhost:4000/api/weather',
  'Worldwide weather forecasts',
  4.20,
  350
),
(
  'satellite-imagery-wayanad',
  'SatGeo Systems',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB5OOR62',
  0.008,
  'satellite',
  'http://localhost:4000/api/satellite',
  'High-resolution satellite imagery for Kerala region',
  4.80,
  1500
),
(
  'radiology-scan-api',
  'HealthData Systems',
  'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCQ67D44',
  0.005,
  'medical',
  'http://localhost:4000/api/medical',
  'Medical imaging and radiology analysis',
  4.90,
  800
),
(
  'road-routing-disaster',
  'DisasterRoute API',
  'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDX7R2XU',
  0.002,
  'routing',
  'http://localhost:4000/api/routing',
  'Emergency routing during natural disasters',
  4.60,
  400
),
(
  'gst-filing-api',
  'TaxPro Services',
  'EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEHXXQXY',
  0.0012,
  'finance',
  'http://localhost:4000/api/finance',
  'Automated GST filing and compliance',
  4.30,
  600
);

-- Show confirmation
SELECT 'Database setup complete!' AS status;
SELECT COUNT(*) AS services_count FROM services;
SELECT * FROM services;
