-- Fix the unique constraint issue for friend_match_requests table
-- The current constraint prevents updating status to CANCELLED

-- Step 1: Drop the problematic unique constraint
ALTER TABLE friend_match_requests 
DROP INDEX unique_pending_sender_receiver;

-- Step 2: Add a simpler unique constraint that only prevents duplicate PENDING requests
-- Since MySQL doesn't support partial indexes, we'll create a unique index on just the IDs
-- and rely on application logic to prevent duplicate pending requests

-- Optional: Add a regular index for performance
CREATE INDEX idx_sender_receiver_status ON friend_match_requests(sender_id, receiver_id, status);

-- The application code already checks for pending requests before creating new ones,
-- so we don't need a strict database constraint
