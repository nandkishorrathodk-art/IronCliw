# IronCliw REST API v1

## Endpoints

### `GET /api/v1/health`

Check gateway status.

**Response (200 OK):**

```json
{ "status": "healthy", "uptime": 3600 }
```

### `POST /api/v1/commands/execute`

Run a command via the Parallel Executor.

**Request:**

```json
{
  "command": "Get-Process | Where-Object {$_.Name -eq 'explorer'}",
  "timeoutMs": 5000
}
```

### `POST /api/v1/vision/analyze`

Analyze a screenshot.

**Request:**

```json
{
  "imagePath": "C:\\temp\\capture.png",
  "prompt": "Find the login button"
}
```
