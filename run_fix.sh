#!/bin/bash
# Script to fix the database constraint

# Update these with your database credentials
DB_HOST="localhost"
DB_USER="root"
DB_NAME="your_database_name"

echo "Fixing friend_match_requests constraint..."

mysql -h $DB_HOST -u $DB_USER -p $DB_NAME << EOF
ALTER TABLE friend_match_requests DROP INDEX unique_pending_sender_receiver;
CREATE INDEX idx_sender_receiver_status ON friend_match_requests(sender_id, receiver_id, status);
SELECT 'Constraint fixed successfully!' as status;
EOF

echo "Done!"
