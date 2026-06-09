# API Conventions

## REST Endpoints

- Use plural nouns for resources: `/users`, `/orders`.
- Use HTTP verbs correctly: GET (read), POST (create), PUT/PATCH (update), DELETE (remove).
- Return appropriate status codes: 200, 201, 400, 401, 403, 404, 422, 500.
- All responses should follow the envelope:

```json
{
  "data": {},
  "error": null,
  "meta": {}
}
```

## Error Handling

- Always return a machine-readable `code` and human-readable `message`.
- Log errors server-side with full context; never leak stack traces to clients.

## Versioning

- Prefix all routes with `/api/v1/`.
- Increment the version for breaking changes.

## Authentication

- Use Bearer tokens via the `Authorization` header.
- Never pass tokens in query parameters.
