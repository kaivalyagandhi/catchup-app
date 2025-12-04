-- CatchUp Database Initialization Script
-- This script creates the database and sets up initial configuration

-- Create database (run this as postgres superuser)
-- CREATE DATABASE catchup_db;

-- Connect to the database
\c catchup_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE frequency_option AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'flexible', 'na');
CREATE TYPE interaction_type AS ENUM ('hangout', 'call', 'text', 'calendar_event');
CREATE TYPE tag_source AS ENUM ('voice_memo', 'manual', 'notification_reply');
CREATE TYPE suggestion_status AS ENUM ('pending', 'accepted', 'dismissed', 'snoozed');
CREATE TYPE trigger_type AS ENUM ('shared_activity', 'timebound');

-- Create users table with authentication support
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    name VARCHAR(255),
    timezone VARCHAR(100) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Success message
SELECT 'Database initialized successfully' AS status;
