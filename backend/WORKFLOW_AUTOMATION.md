# Workflow Automation

This backend now supports workflow automation and status tracking.

## What it does

When a business verification runs, the backend automatically:

1. Saves the verification result.
2. Updates the business status.
3. Creates a workflow task.
4. Logs the event in activity_logs.

If the business is verified, the workflow task is marked `Completed`.
If the business needs review, the workflow task is marked `Pending` and assigned for manual review.

## API Endpoints

### List workflow tasks
GET /api/workflows/tasks

### Create a workflow task
POST /api/workflows/tasks

Body:
```json
{
  "business_id": 1,
  "task_name": "Review address discrepancy",
  "task_type": "Manual Review",
  "task_status": "Pending",
  "assigned_to": "Kevin Ferreira",
  "due_date": "2026-07-15"
}
```

### Update workflow task status
PATCH /api/workflows/tasks/:id/status

Body:
```json
{
  "task_status": "Completed",
  "assigned_to": "Kevin Ferreira"
}
```

### Workflow summary
GET /api/workflows/summary

## Database additions

- `calculate_workflow_progress()` function
- `workflow_task_summary` view
- Indexes for task status, business ID, and due date
