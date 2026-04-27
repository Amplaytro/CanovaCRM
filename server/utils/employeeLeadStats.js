const Lead = require('../models/Lead');
const User = require('../models/User');
const mongoose = require('mongoose');

const getEmployeeLeadStatsMap = async (employeeIds) => {
  const normalizedIds = (employeeIds || [])
    .map((employeeId) => employeeId?.toString?.())
    .filter(Boolean);

  if (normalizedIds.length === 0) {
    return new Map();
  }

  const objectIds = normalizedIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const stats = await Lead.aggregate([
    {
      $match: {
        assignedTo: { $in: objectIds }
      }
    },
    {
      $group: {
        _id: '$assignedTo',
        assignedLeadsCount: {
          $sum: {
            $cond: [{ $ne: ['$status', 'closed'] }, 1, 0]
          }
        },
        closedLeadsCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'closed'] }, 1, 0]
          }
        }
      }
    }
  ]);

  const statsMap = new Map();

  normalizedIds.forEach((id) => {
    statsMap.set(id, {
      assignedLeadsCount: 0,
      closedLeadsCount: 0
    });
  });

  stats.forEach((entry) => {
    statsMap.set(entry._id.toString(), {
      assignedLeadsCount: entry.assignedLeadsCount,
      closedLeadsCount: entry.closedLeadsCount
    });
  });

  return statsMap;
};

const mergeEmployeeLeadStats = async (employees) => {
  const statsMap = await getEmployeeLeadStatsMap(employees.map((employee) => employee._id));

  return employees.map((employee) => {
    const employeeObject = typeof employee.toObject === 'function' ? employee.toObject() : { ...employee };
    const stats = statsMap.get(employeeObject._id.toString()) || {
      assignedLeadsCount: 0,
      closedLeadsCount: 0
    };

    return {
      ...employeeObject,
      assignedLeadsCount: stats.assignedLeadsCount,
      closedLeadsCount: stats.closedLeadsCount,
      status: stats.assignedLeadsCount > 0 ? 'active' : 'inactive'
    };
  });
};

const syncEmployeeLeadStats = async (employeeIds) => {
  const normalizedIds = (Array.isArray(employeeIds) ? employeeIds : [employeeIds])
    .map((employeeId) => employeeId?.toString?.())
    .filter(Boolean);

  if (normalizedIds.length === 0) {
    return;
  }

  const statsMap = await getEmployeeLeadStatsMap(normalizedIds);

  await Promise.all(
    normalizedIds.map((employeeId) => {
      const stats = statsMap.get(employeeId) || {
        assignedLeadsCount: 0,
        closedLeadsCount: 0
      };

      return User.findByIdAndUpdate(employeeId, {
        $set: {
          assignedLeadsCount: stats.assignedLeadsCount,
          closedLeadsCount: stats.closedLeadsCount,
          status: stats.assignedLeadsCount > 0 ? 'active' : 'inactive'
        }
      });
    })
  );
};

module.exports = { getEmployeeLeadStatsMap, mergeEmployeeLeadStats, syncEmployeeLeadStats };
