-- Run this SELECT against production before applying 0002.
-- It identifies paid orders that already received the old immediate-download email.
SELECT stripe_session_id, email, emailed_at, created_at
FROM ebook_orders
WHERE status = 'paid'
  AND emailed_at IS NOT NULL
ORDER BY created_at;

-- No UPDATE runs automatically. If you decide these already-delivered orders
-- should not receive a second launch email, review and run manually:
-- UPDATE ebook_orders
-- SET launch_emailed_at = emailed_at
-- WHERE status = 'paid' AND emailed_at IS NOT NULL;
