const User = require('../models/User');
const Activity = require('../models/Activity');
const {
  assignUnassignedLeadsToEmployee,
  ensureLeadAssignmentsHealthy,
  reassignDeletedEmployeeLeads
} = require('../utils/leadAssignment');
const { mergeEmployeeLeadStats } = require('../utils/employeeLeadStats');
const { closeOverdueScheduledLeads } = require('../utils/scheduledLeadClosure');
const { withAttendanceStatus } = require('../utils/attendanceStatus');

const normalizePreferredLanguage = (preferredLanguage) => preferredLanguage?.toLowerCase?.() || '';
const normalizeLocation = (location) => location?.trim?.() || '';
const resolvePreferredLanguage = (employee) => (
  normalizePreferredLanguage(employee?.preferredLanguage || employee?.languages?.[0]) || 'english'
);
const toTitleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const formatActivityValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'empty';
  }

  return value;
};
const buildPossessiveName = (firstName, lastName) => {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();

  if (!fullName) {
    return "Employee's";
  }

  return fullName.endsWith('s') ? `${fullName}'` : `${fullName}'s`;
};

// GET /api/employees
const getEmployees = async (req, res) => {
  try {
    await closeOverdueScheduledLeads();
    await ensureLeadAssignmentsHealthy();

    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = { role: 'user' };
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const employees = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const employeesWithStats = await mergeEmployeeLeadStats(employees);
    const employeesWithAttendanceStatus = await withAttendanceStatus(employeesWithStats);
    const employeesWithStatsAndStatus = employeesWithAttendanceStatus.map((employee) => {
      const employeeData = employee.toObject ? employee.toObject() : employee;
      return {
        ...employeeData,
        preferredLanguage: resolvePreferredLanguage(employeeData)
      };
    });

    res.json({
      employees: employeesWithStatsAndStatus,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/employees
const createEmployee = async (req, res) => {
  try {
    const { firstName, lastName, email, location, preferredLanguage, status } = req.body;
    const normalizedPreferredLanguage = normalizePreferredLanguage(preferredLanguage);
    const normalizedLocation = normalizeLocation(location);

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }

    // Default password = email
    const employee = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: email.toLowerCase(),
      location: normalizedLocation,
      role: 'user',
      preferredLanguage: normalizedPreferredLanguage || 'english'
    });

    const autoAssignedLeads = await assignUnassignedLeadsToEmployee(employee);

    await Activity.create({
      type: 'employee_created',
      message: `New employee "${firstName} ${lastName}" was created`,
      relatedUser: employee._id
    });

    if (autoAssignedLeads.length > 0) {
      await Activity.insertMany(
        autoAssignedLeads.map((lead) => ({
          type: 'lead_assigned',
          message: `Lead "${lead.name}" assigned to ${employee.firstName} ${employee.lastName}`,
          relatedUser: employee._id,
          relatedLead: lead._id
        }))
      );
    }

    const employeeData = await User.findById(employee._id).select('-password');
    const [employeeWithAttendanceStatus] = await withAttendanceStatus([employeeData]);
    res.status(201).json(employeeWithAttendanceStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/employees/:id
const updateEmployee = async (req, res) => {
  try {
    const { firstName, lastName, email, location, preferredLanguage, status } = req.body;
    const employee = await User.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const wasInactive = employee.status !== 'active';
    const previousPreferredLanguage = normalizePreferredLanguage(
      employee.preferredLanguage || employee.languages?.[0]
    );
    const originalValues = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      location: employee.location || '',
      preferredLanguage: previousPreferredLanguage || 'english',
      status: employee.status
    };

    if (firstName) employee.firstName = firstName;
    if (lastName) employee.lastName = lastName;
    if (email) employee.email = email.toLowerCase();
    if (location !== undefined) employee.location = normalizeLocation(location);
    if (preferredLanguage) {
      employee.preferredLanguage = normalizePreferredLanguage(preferredLanguage);
      employee.languages = undefined;
    }

    const updatedValues = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      location: employee.location || '',
      preferredLanguage: normalizePreferredLanguage(employee.preferredLanguage) || 'english',
      status: employee.status
    };
    const changeMessages = [];
    const employeePossessiveName = buildPossessiveName(employee.firstName, employee.lastName);

    if (originalValues.firstName !== updatedValues.firstName || originalValues.lastName !== updatedValues.lastName) {
      changeMessages.push(
        `${employeePossessiveName} name was changed to "${formatActivityValue(`${updatedValues.firstName} ${updatedValues.lastName}`.trim())}"`
      );
    }
    if (originalValues.email !== updatedValues.email) {
      changeMessages.push(
        `${employeePossessiveName} email was changed to "${formatActivityValue(updatedValues.email)}"`
      );
    }
    if (originalValues.location !== updatedValues.location) {
      changeMessages.push(
        `${employeePossessiveName} location was changed to "${formatActivityValue(updatedValues.location)}"`
      );
    }
    if (originalValues.preferredLanguage !== updatedValues.preferredLanguage) {
      changeMessages.push(
        `${employeePossessiveName} preferred language was changed to "${toTitleCase(formatActivityValue(updatedValues.preferredLanguage))}"`
      );
    }
    if (originalValues.status !== updatedValues.status) {
      changeMessages.push(
        `${employeePossessiveName} status was changed to "${toTitleCase(formatActivityValue(updatedValues.status))}"`
      );
    }

    await employee.save();

    if (changeMessages.length > 0) {
      await Activity.create({
        type: 'employee_updated',
        message: changeMessages.join('; '),
        relatedUser: employee._id
      });
    }

    const currentPreferredLanguage = normalizePreferredLanguage(employee.preferredLanguage);
    const gainedPreferredLanguage = currentPreferredLanguage && currentPreferredLanguage !== previousPreferredLanguage;
    const becameEligibleForAssignment = employee.status === 'active' && (wasInactive || gainedPreferredLanguage);

    if (becameEligibleForAssignment) {
      const autoAssignedLeads = await assignUnassignedLeadsToEmployee(employee);

      if (autoAssignedLeads.length > 0) {
        await Activity.insertMany(
          autoAssignedLeads.map((lead) => ({
            type: 'lead_assigned',
            message: `Lead "${lead.name}" assigned to ${employee.firstName} ${employee.lastName}`,
            relatedUser: employee._id,
            relatedLead: lead._id
          }))
        );
      }
    }

    const updatedEmployee = await User.findById(employee._id).select('-password');
    const [updatedEmployeeWithAttendanceStatus] = await withAttendanceStatus([updatedEmployee]);
    res.json(updatedEmployeeWithAttendanceStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/employees/:id
const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await Activity.create({
      type: 'employee_deleted',
      message: `${employee.firstName} ${employee.lastName} was deleted`,
    });

    const { reassignedLeads } = await reassignDeletedEmployeeLeads(employee._id);

    await User.findByIdAndDelete(req.params.id);

    if (reassignedLeads.length > 0) {
      await Activity.insertMany(
        reassignedLeads.map((assignment) => ({
          type: 'lead_assigned',
          message: `Lead "${assignment.leadName}" assigned to ${assignment.userFirstName} ${assignment.userLastName}`,
          relatedUser: assignment.userId,
          relatedLead: assignment.leadId
        }))
      );
    }

    res.json({ message: 'Employee deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/employees/bulk-delete
const bulkDeleteEmployees = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || ids.length === 0) {
      return res.status(400).json({ message: 'No employee IDs provided' });
    }

    const { reassignedLeads } = await reassignDeletedEmployeeLeads(ids);

    const result = await User.deleteMany({ _id: { $in: ids }, role: 'user' });

    await Activity.create({
      type: 'employee_deleted',
      message: `${result.deletedCount} employees were deleted`
    });

    if (reassignedLeads.length > 0) {
      await Activity.insertMany(
        reassignedLeads.map((assignment) => ({
          type: 'lead_assigned',
          message: `Lead "${assignment.leadName}" assigned to ${assignment.userFirstName} ${assignment.userLastName}`,
          relatedUser: assignment.userId,
          relatedLead: assignment.leadId
        }))
      );
    }

    res.json({ message: `${result.deletedCount} employees deleted` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getEmployees, createEmployee, updateEmployee, deleteEmployee, bulkDeleteEmployees };
