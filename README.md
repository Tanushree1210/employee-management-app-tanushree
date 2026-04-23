# employee-management-app-tanushree

Employee Management System with:
- RESTful employee CRUD API (Node.js + Express + SQLite)
- Employee fields: ID, Name, Email, Department, Role, Hire Date
- Search (`search`) and department filtering (`department`) via query params
- React frontend to create, update, delete, search, and filter employees

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## API Endpoints

- `GET /api/employees?search=<term>&department=<department>`
- `GET /api/employees/:id`
- `POST /api/employees`
- `PUT /api/employees/:id`
- `DELETE /api/employees/:id`

## Test

```bash
npm test
```
