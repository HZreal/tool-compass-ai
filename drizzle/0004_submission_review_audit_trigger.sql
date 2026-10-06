CREATE TRIGGER `submissions_audit_after_review`
AFTER UPDATE OF `status` ON `submissions`
WHEN OLD.`status` = 'pending' AND NEW.`status` IN ('approved', 'rejected')
BEGIN
  INSERT INTO `admin_audit_events` (`action`, `resource_type`, `resource_id`)
  VALUES (
    CASE NEW.`status`
      WHEN 'approved' THEN 'submission.approve'
      ELSE 'submission.reject'
    END,
    'submission',
    NEW.`id`
  );
END;
