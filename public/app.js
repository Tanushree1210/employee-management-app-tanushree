const { useCallback, useEffect, useMemo, useState } = React;

const emptyForm = {
  name: "",
  email: "",
  department: "",
  role: "",
  hireDate: "",
};

function App() {
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = editingId !== null;

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (departmentFilter.trim()) params.set("department", departmentFilter.trim());

      const response = await fetch(`/api/employees?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load employees");
      }

      setEmployees(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, departmentFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const onInputChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const url = isEditing ? `/api/employees/${editingId}` : "/api/employees";
      const method = isEditing ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const message = await response.json();
        throw new Error(message.error || "Request failed");
      }

      resetForm();
      fetchEmployees();
    } catch (err) {
      setError(err.message);
    }
  };

  const editEmployee = (employee) => {
    setEditingId(employee.id);
    setFormData({
      name: employee.name,
      email: employee.email,
      department: employee.department,
      role: employee.role,
      hireDate: employee.hireDate,
    });
  };

  const deleteEmployee = async (id) => {
    setError("");
    try {
      const response = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const message = await response.json();
        throw new Error(message.error || "Delete failed");
      }
      fetchEmployees();
    } catch (err) {
      setError(err.message);
    }
  };

  const employeeCountText = useMemo(
    () => `${employees.length}`,
    [employees]
  );

  return (
    <main className="container">
      <h1>Employee Management System</h1>

      <section className="panel">
        <h2>{isEditing ? "Edit Employee" : "Add Employee"}</h2>
        <form onSubmit={submitForm} className="form-grid">
          <input name="name" placeholder="Name" value={formData.name} onChange={onInputChange} required />
          <input name="email" type="email" placeholder="Email" value={formData.email} onChange={onInputChange} required />
          <input name="department" placeholder="Department" value={formData.department} onChange={onInputChange} required />
          <input name="role" placeholder="Role" value={formData.role} onChange={onInputChange} required />
          <input name="hireDate" type="date" value={formData.hireDate} onChange={onInputChange} required />
          <div className="form-actions">
            <button type="submit">{isEditing ? "Update" : "Create"}</button>
            {isEditing && (
              <button type="button" onClick={resetForm} className="secondary">
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Employees ({employeeCountText})</h2>
        <div className="filters">
          <input
            type="search"
            placeholder="Search by name, email, or role"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <input
            placeholder="Filter by department"
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          />
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p>Loading employees...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Hire Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="7">No employees found.</td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.id}</td>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.department}</td>
                    <td>{employee.role}</td>
                    <td>{employee.hireDate}</td>
                    <td className="actions">
                      <button onClick={() => editEmployee(employee)}>Edit</button>
                      <button className="danger" onClick={() => deleteEmployee(employee.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
