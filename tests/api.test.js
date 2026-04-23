const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer, closeDatabase } = require("../src/server");

let server;
let db;
let baseUrl;

test.beforeEach(async () => {
  const started = await createServer({ dbPath: ":memory:", port: 0, disableStatic: true });
  server = started.server;
  db = started.db;
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.afterEach(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await closeDatabase(db);
});

test("creates and fetches an employee", async () => {
  const payload = {
    name: "Alice",
    email: "alice@example.com",
    department: "Engineering",
    role: "Developer",
    hireDate: "2024-03-10",
  };

  const createResponse = await fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.equal(created.name, payload.name);

  const listResponse = await fetch(`${baseUrl}/api/employees`);
  assert.equal(listResponse.status, 200);
  const list = await listResponse.json();
  assert.equal(list.length, 1);
  assert.equal(list[0].email, payload.email);
});

test("filters employees by department and search", async () => {
  const employees = [
    {
      name: "Bob",
      email: "bob@example.com",
      department: "HR",
      role: "Manager",
      hireDate: "2023-01-01",
    },
    {
      name: "Carol",
      email: "carol@example.com",
      department: "Engineering",
      role: "Developer",
      hireDate: "2022-01-01",
    },
  ];

  for (const employee of employees) {
    await fetch(`${baseUrl}/api/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employee),
    });
  }

  const byDepartment = await fetch(`${baseUrl}/api/employees?department=Engineering`);
  const engineeringEmployees = await byDepartment.json();
  assert.equal(engineeringEmployees.length, 1);
  assert.equal(engineeringEmployees[0].name, "Carol");

  const bySearch = await fetch(`${baseUrl}/api/employees?search=Manager`);
  const managerEmployees = await bySearch.json();
  assert.equal(managerEmployees.length, 1);
  assert.equal(managerEmployees[0].name, "Bob");
});

test("updates and deletes employee", async () => {
  const createResponse = await fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Dan",
      email: "dan@example.com",
      department: "Finance",
      role: "Analyst",
      hireDate: "2021-12-12",
    }),
  });
  const created = await createResponse.json();

  const updateResponse = await fetch(`${baseUrl}/api/employees/${created.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Dan Updated",
      email: "dan@example.com",
      department: "Finance",
      role: "Senior Analyst",
      hireDate: "2021-12-12",
    }),
  });
  assert.equal(updateResponse.status, 200);
  const updated = await updateResponse.json();
  assert.equal(updated.role, "Senior Analyst");

  const deleteResponse = await fetch(`${baseUrl}/api/employees/${created.id}`, {
    method: "DELETE",
  });
  assert.equal(deleteResponse.status, 204);

  const fetchDeleted = await fetch(`${baseUrl}/api/employees/${created.id}`);
  assert.equal(fetchDeleted.status, 404);
});
