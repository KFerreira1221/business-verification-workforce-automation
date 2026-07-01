# Business Verification Backend

Backend API for the AI-Powered Business Verification and Workforce Automation System.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create the PostgreSQL database:

```sql
CREATE DATABASE business_verification;
```

3. Run the schema:

```bash
psql -U postgres -d business_verification -f schema.sql
```

4. Create a `.env` file using `.env.example` as a template:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=business_verification
DB_PASSWORD=your_password
DB_PORT=5432
PORT=5000
```

5. Start the server:

```bash
npm start
```

For development:

```bash
npm run dev
```

## Test Routes

- `GET http://localhost:5000/`
- `GET http://localhost:5000/health`
- `GET http://localhost:5000/api/businesses`

## Main API Routes

- `GET /api/businesses` - list businesses
- `GET /api/businesses/:id` - get one business
- `POST /api/businesses` - create business
- `PUT /api/businesses/:id` - update business
- `DELETE /api/businesses/:id` - delete business
