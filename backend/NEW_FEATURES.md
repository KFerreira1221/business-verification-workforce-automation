# New Database and Backend Features

## Dashboard statistics
- `GET /api/dashboard/stats`
- `GET /api/dashboard/recent-activity`

## Verification queue
- `GET /api/queue`
- `POST /api/queue`
- `POST /api/queue/:id/process`
- `PATCH /api/queue/:id/cancel`

Example queue request:
```json
{
  "businessName": "Example Business",
  "website": "example.com",
  "priority": "High",
  "requested_by": "Kevin Ferreira"
}
```

## Notifications
- `GET /api/notifications`
- `GET /api/notifications?unreadOnly=true`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

## Database setup
Run the updated schema before starting the server:
```powershell
psql -U postgres -d business_verification -f schema.sql
```
