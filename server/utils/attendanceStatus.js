const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');

const getStartOfDay = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const hasActiveBreak = (attendance) => (
  (attendance?.breaks || []).some((entry) => entry.startAt && !entry.endAt)
);

const isAttendanceActive = (attendance) => (
  Boolean(attendance?.checkInAt && !attendance.checkOutAt && !hasActiveBreak(attendance))
);

const normalizeEmployeeIds = (employeeIds) => (
  (employeeIds || [])
    .map((employeeId) => employeeId?.toString?.())
    .filter((employeeId) => employeeId && mongoose.Types.ObjectId.isValid(employeeId))
);

const getAttendanceActiveUserIdSet = async (employeeIds, date = new Date()) => {
  const normalizedIds = normalizeEmployeeIds(employeeIds);

  if (normalizedIds.length === 0) {
    return new Set();
  }

  const attendances = await Attendance.find({
    user: { $in: normalizedIds.map((id) => new mongoose.Types.ObjectId(id)) },
    attendanceDate: getStartOfDay(date),
    checkInAt: { $ne: null },
    checkOutAt: null
  })
    .select('user checkInAt checkOutAt breaks')
    .lean();

  return new Set(
    attendances
      .filter(isAttendanceActive)
      .map((attendance) => attendance.user.toString())
  );
};

const withAttendanceStatus = async (employees, date = new Date()) => {
  const activeUserIdSet = await getAttendanceActiveUserIdSet(
    employees.map((employee) => employee?._id),
    date
  );

  return employees.map((employee) => {
    const employeeObject = typeof employee.toObject === 'function' ? employee.toObject() : { ...employee };
    const employeeId = employeeObject._id?.toString?.();

    return {
      ...employeeObject,
      status: employeeObject.status
    };
  });
};

const filterAttendanceActiveEmployees = async (employees, date = new Date()) => {
  const activeUserIdSet = await getAttendanceActiveUserIdSet(
    employees.map((employee) => employee?._id),
    date
  );

  return employees.filter((employee) => (
    activeUserIdSet.has(employee._id.toString())
  ));
};

module.exports = {
  filterAttendanceActiveEmployees,
  getAttendanceActiveUserIdSet,
  getStartOfDay,
  isAttendanceActive,
  withAttendanceStatus
};
