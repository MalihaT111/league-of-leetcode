# Fix Database Constraint Issue

## Problem
The `unique_pending_sender_receiver` constraint is preventing match request cancellations because it includes the `status` column in the unique constraint.

## Solution
Run this SQL command in your MySQL database:

```sql
ALTER TABLE friend_match_requests DROP INDEX unique_pending_sender_receiver;
```

## How to Run

### Option 1: MySQL Command Line
```bash
mysql -u root -p your_database_name
```
Then paste:
```sql
ALTER TABLE friend_match_requests DROP INDEX unique_pending_sender_receiver;
```

### Option 2: MySQL Workbench
1. Open MySQL Workbench
2. Connect to your database
3. Open a new SQL tab
4. Paste the command above
5. Click Execute (⚡ icon)

### Option 3: phpMyAdmin
1. Open phpMyAdmin
2. Select your database
3. Click "SQL" tab
4. Paste the command above
5. Click "Go"

## Verification
After running the command, verify it worked:
```sql
SHOW INDEX FROM friend_match_requests;
```

You should no longer see `unique_pending_sender_receiver` in the list.

## Why This Fix Works
- The application code already prevents duplicate pending requests
- We don't need a database constraint that includes the status
- This allows users to cancel and resend requests without constraint violations
- Multiple cancelled/rejected requests between the same users are now allowed
