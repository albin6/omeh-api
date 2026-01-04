# Environment Variables

## Frontend (React/Vite)

Create a `.env` file in the `frontend/` directory with the following variables:

```
# Backend URL for development
VITE_BACKEND_URL=http://localhost:3000
```

### Variable Details:

- `VITE_BACKEND_URL`: The URL of the backend server that the frontend will connect to
  - Default: `http://localhost:3000`
  - Required: No (has fallback)
  - Format: Full URL including protocol and port

## Backend (Node.js)

Create a `.env` file in the project root directory with the following variables:

```
# Port for the backend server
PORT=3000

# Frontend URL for CORS configuration
FRONTEND_URL=http://localhost:5173
```

### Variable Details:

- `PORT`: The port number for the backend server
  - Default: `3000`
  - Required: No (has fallback)

- `FRONTEND_URL`: The URL of the frontend for CORS configuration
  - Default: `http://localhost:5173` (Vite default port)
  - Required: No (has fallback)