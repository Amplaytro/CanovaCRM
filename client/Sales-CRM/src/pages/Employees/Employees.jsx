import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Pagination from '../../components/Pagination/Pagination';
import { MdSearch, MdMoreVert, MdDelete, MdClose } from 'react-icons/md';
import './Employees.css';

const LANGUAGES = ['english', 'hindi', 'marathi', 'kannada', 'bengali'];

const EditActionIcon = () => (
  <svg
    className="action-dropdown-icon"
    width="18"
    height="18"
    viewBox="-1044 -4998 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="-1044" y="-4998" width="18" height="18" rx="3" fill="#FFEFFD" />
    <path
      d="M-1040.25 -4983.75H-1039.1813L-1031.85 -4991.0811L-1032.9187 -4992.1499L-1040.25 -4984.8188V-4983.75ZM-1041.75 -4982.25V-4985.4375L-1031.85 -4995.3188C-1031.6999 -4995.4561 -1031.5343 -4995.5625 -1031.3528 -4995.6377C-1031.1713 -4995.7124 -1030.9807 -4995.75 -1030.7812 -4995.75C-1030.5818 -4995.75 -1030.3879 -4995.7124 -1030.2 -4995.6377C-1030.012 -4995.5625 -1029.8495 -4995.4502 -1029.7125 -4995.2998L-1028.6813 -4994.25C-1028.5312 -4994.1123 -1028.4218 -4993.9502 -1028.3528 -4993.7627C-1028.2837 -4993.5752 -1028.2495 -4993.3877 -1028.25 -4993.2002C-1028.25 -4993 -1028.2843 -4992.8091 -1028.3528 -4992.6279C-1028.4213 -4992.4463 -1028.5308 -4992.2808 -1028.6813 -4992.1313L-1038.5625 -4982.25H-1041.75ZM-1032.3938 -4991.6064L-1032.9187 -4992.1499L-1031.85 -4991.0811L-1032.3938 -4991.6064Z"
      fill="#000000"
    />
  </svg>
);

const DeleteActionIcon = () => (
  <svg
    className="action-dropdown-icon"
    width="18"
    height="18"
    viewBox="-1044 -4962 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="-1044" y="-4962" width="18" height="18" rx="3" fill="#FFEFEF" />
    <path
      d="M-1038.75 -4946.25C-1039.1625 -4946.25 -1039.5155 -4946.397 -1039.809 -4946.6904C-1040.1025 -4946.9839 -1040.2495 -4947.3369 -1040.25 -4947.75V-4957.5C-1040.4625 -4957.5 -1040.6405 -4957.5718 -1040.7841 -4957.7158C-1040.9275 -4957.8599 -1040.9995 -4958.0381 -1041 -4958.25C-1041 -4958.4619 -1040.9285 -4958.6401 -1040.7841 -4958.7842C-1040.6395 -4958.9282 -1040.4615 -4959 -1040.25 -4959H-1037.25C-1037.25 -4959.2124 -1037.178 -4959.3906 -1037.0341 -4959.5342C-1036.89 -4959.6777 -1036.712 -4959.7495 -1036.5 -4959.75H-1033.5C-1033.2875 -4959.75 -1033.1093 -4959.6782 -1032.9652 -4959.5342C-1032.8213 -4959.3901 -1032.7495 -4959.2119 -1032.75 -4959H-1029.75C-1029.5375 -4959 -1029.3593 -4958.9282 -1029.2152 -4958.7842C-1029.0713 -4958.6401 -1028.9995 -4958.4619 -1029 -4958.25C-1029 -4958.0381 -1029.0725 -4957.8599 -1029.216 -4957.7153C-1029.3595 -4957.5708 -1029.5375 -4957.499 -1029.75 -4957.5V-4947.75C-1029.75 -4947.3374 -1029.8967 -4946.9844 -1030.1903 -4946.6904C-1030.4838 -4946.3965 -1030.8369 -4946.2495 -1031.25 -4946.25H-1038.75ZM-1031.25 -4957.5H-1038.75V-4947.75H-1031.25V-4957.5ZM-1036.5 -4949.25C-1036.2875 -4949.25 -1036.1093 -4949.3218 -1035.9652 -4949.4658C-1035.8213 -4949.6099 -1035.7495 -4949.7881 -1035.75 -4950V-4955.25C-1035.75 -4955.4624 -1035.822 -4955.6406 -1035.9659 -4955.7842C-1036.11 -4955.9277 -1036.288 -4955.9995 -1036.5 -4956C-1036.712 -4956.0005 -1036.89 -4955.9287 -1037.0341 -4955.7842C-1037.178 -4955.6396 -1037.25 -4955.4614 -1037.25 -4955.25V-4950C-1037.25 -4949.7876 -1037.178 -4949.6094 -1037.0341 -4949.4653C-1036.89 -4949.3213 -1036.712 -4949.2495 -1036.5 -4949.25ZM-1033.5 -4949.25C-1033.2875 -4949.25 -1033.1093 -4949.3218 -1032.9652 -4949.4658C-1032.8213 -4949.6099 -1032.7495 -4949.7881 -1032.75 -4950V-4955.25C-1032.75 -4955.4624 -1032.822 -4955.6406 -1032.9659 -4955.7842C-1033.11 -4955.9277 -1033.288 -4955.9995 -1033.5 -4956C-1033.712 -4956.0005 -1033.89 -4955.9287 -1034.0341 -4955.7842C-1034.178 -4955.6396 -1034.25 -4955.4614 -1034.25 -4955.25V-4950C-1034.25 -4949.7876 -1034.178 -4949.6094 -1034.0341 -4949.4653C-1033.89 -4949.3213 -1033.712 -4949.2495 -1033.5 -4949.25Z"
      fill="#00252A"
    />
  </svg>
);

const resolvePreferredLanguage = (employee) => {
  const resolvedLanguage = employee?.preferredLanguage || employee?.languages?.[0];
  const normalizedLanguage = resolvedLanguage?.toLowerCase?.();

  return LANGUAGES.includes(normalizedLanguage) ? normalizedLanguage : 'english';
};

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [menuOpen, setMenuOpen] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    location: '',
    preferredLanguage: 'english',
    status: 'active'
  });

  const fetchEmployees = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        search
      });
      const res = await api.get(`/employees?${params.toString()}`);
      setEmployees(res.data.employees);
      setPages(res.data.pages);
      setTotal(res.data.total);
    } catch (error) {
      console.error('Fetch employees error:', error);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(employees.map((emp) => emp._id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} employee(s)?`)) return;
    try {
      await api.post('/employees/bulk-delete', { ids: selected });
      setSelected([]);
      fetchEmployees();
    } catch (error) {
      console.error('Bulk delete error:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      setMenuOpen(null);
      fetchEmployees();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/employees', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        location: formData.location,
        preferredLanguage: formData.preferredLanguage,
        status: 'active'
      });
      setShowAddModal(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating employee');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/employees/${editingEmployee._id}`, formData);
      setShowEditModal(false);
      setEditingEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating employee');
    }
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      location: emp.location || '',
      preferredLanguage: resolvePreferredLanguage(emp),
      status: emp.status
    });
    setMenuOpen(null);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      location: '',
      preferredLanguage: 'english',
      status: 'active'
    });
  };

  return (
    <div className="employees-page" id="employees-page">
      <header className="employees-navbar">
        <div className="top-search-bar">
          <MdSearch className="top-search-icon" />
          <input
            type="text"
            placeholder="Search here..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            id="search-employees"
          />
        </div>
      </header>

      <div className="toolbar">
        <div className="breadcrumb">
          <span>Home</span>
          <span className="breadcrumb-sep">&rsaquo;</span>
          <span className="breadcrumb-active">Employees</span>
        </div>
        <div className="toolbar-right">
          {selected.length > 0 && (
            <button className="btn btn-danger" onClick={handleBulkDelete} id="btn-bulk-delete">
              <MdDelete /> Delete ({selected.length})
            </button>
          )}
          <button
            className="btn btn-add-employees"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            id="btn-add-employee"
          >
            Add Employees
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table" id="employees-table">
          <colgroup>
            <col className="employees-col-select" />
            <col className="employees-col-name" />
            <col className="employees-col-id" />
            <col className="employees-col-assigned" />
            <col className="employees-col-closed" />
            <col className="employees-col-status" />
            <col className="employees-col-action" />
          </colgroup>
          <thead>
            <tr>
              <th className="checkbox-col">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selected.length === employees.length && employees.length > 0}
                  id="select-all-employees"
                />
              </th>
              <th>Name</th>
              <th>Employee ID</th>
              <th>Assigned Leads</th>
              <th>Closed Leads</th>
              <th>Status</th>
              <th className="action-col"></th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-cell">No employees found</td>
              </tr>
            ) : (
              employees.map((emp, index) => (
                <tr
                  key={emp._id}
                  className={selected.includes(emp._id) ? 'row-selected' : ''}
                  onClick={() => handleSelect(emp._id)}
                >
                  <td className="checkbox-col">
                    <input
                      type="checkbox"
                      checked={selected.includes(emp._id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleSelect(emp._id)}
                    />
                  </td>
                  <td>
                    <div className="employee-name-cell">
                      <div className={`employee-avatar ${(emp.avatar || emp.avatarUrl || emp.profileImage) ? 'employee-avatar-image' : ''}`}>
                        {(emp.avatar || emp.avatarUrl || emp.profileImage) ? (
                          <img src={emp.avatar || emp.avatarUrl || emp.profileImage} alt={`${emp.firstName} ${emp.lastName}`} />
                        ) : (
                          <>
                            {emp.firstName?.charAt(0)}
                            {emp.lastName?.charAt(0)}
                          </>
                        )}
                      </div>
                      <div>
                        <div className="name-primary">{emp.firstName} {emp.lastName}</div>
                        <div className="name-email">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="employee-id-badge">{emp.employeeId}</span>
                  </td>
                  <td className="center-cell">{emp.assignedLeadsCount}</td>
                  <td className="center-cell">{emp.closedLeadsCount}</td>
                  <td className={`status-cell ${emp.status === 'inactive' ? 'status-cell-inactive' : 'status-cell-active'}`}><StatusBadge status={emp.status} /></td>
                  <td className="action-col">
                    <div className="action-menu-wrap">
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === emp._id ? null : emp._id);
                        }}
                      >
                        <MdMoreVert />
                      </button>
                      {menuOpen === emp._id && (
                        <div
                          className={`action-dropdown ${index >= employees.length - 2 ? 'action-dropdown-up' : ''}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button className="action-dropdown-item action-dropdown-item-edit" onClick={() => openEditModal(emp)}>
                            <EditActionIcon />
                            <span className="action-dropdown-label">Edit</span>
                          </button>
                          <button className="action-dropdown-item action-dropdown-item-delete" onClick={() => handleDelete(emp._id)}>
                            <DeleteActionIcon />
                            <span className="action-dropdown-label">Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="employees-pagination-wrap">
        <Pagination page={page} pages={pages} onPageChange={setPage} />
      </div>

      {showAddModal && (
        <div className="employee-add-overlay" onClick={() => setShowAddModal(false)}>
          <div className="employee-add-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="employee-add-title">Add New Employee</h2>
            <button className="employee-add-close" onClick={() => setShowAddModal(false)} id="btn-modal-close">
              <MdClose />
            </button>

            <form onSubmit={handleAdd} className="employee-add-form" id="add-employee-form">
              <div className="employee-add-field">
                <label>First name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>

              <div className="employee-add-field">
                <label>Last name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>

              <div className="employee-add-field">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="employee-add-field">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="employee-add-field employee-add-field-select">
                <label>Preferred Language</label>
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </form>

            <div className="employee-add-save-wrap">
              <button type="submit" form="add-employee-form" className="employee-add-save">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div
          className="employee-add-overlay"
          onClick={() => {
            setShowEditModal(false);
            setEditingEmployee(null);
          }}
        >
          <div className="employee-add-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="employee-add-title">Edit Employee</h2>
            <button
              className="employee-add-close"
              onClick={() => {
                setShowEditModal(false);
                setEditingEmployee(null);
              }}
              id="btn-modal-close"
            >
              <MdClose />
            </button>

            <form onSubmit={handleEdit} className="employee-add-form" id="edit-employee-form">
              <div className="employee-add-field">
                <label>First name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>

              <div className="employee-add-field">
                <label>Last name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>

              <div className="employee-add-field">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="employee-add-field">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="employee-add-field employee-add-field-select">
                <label>Preferred Language</label>
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferredLanguage: e.target.value,
                    })
                  }
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </form>

            <div className="employee-add-save-wrap">
              <button type="submit" form="edit-employee-form" className="employee-add-save">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
