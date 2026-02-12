-- Add 'arrived' status to purchase_status enum (between in_transit and received)
ALTER TYPE purchase_status ADD VALUE IF NOT EXISTS 'arrived' BEFORE 'received';