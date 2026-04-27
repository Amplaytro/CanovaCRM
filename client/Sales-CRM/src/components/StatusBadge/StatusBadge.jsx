import './StatusBadge.css';

const StatusBadge = ({ status }) => {
  const isActive = status === 'active' || status === 'closed';
  const statusClass = isActive ? 'success' : 'danger';
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`status-badge status-${statusClass}`}>
      <span className={`status-dot status-dot-${statusClass}`}></span>
      {label}
    </span>
  );
};

export default StatusBadge;
