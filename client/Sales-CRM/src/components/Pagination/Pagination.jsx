import './Pagination.css';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

const Pagination = ({ page, pages, onPageChange }) => {
  if (pages <= 1) return null;

  const getPageNumbers = () => {
    const items = [];

    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) items.push(i);
    } else {
      // Always show first 3
      items.push(1, 2, 3);

      if (page > 4) {
        items.push('...');
      }

      // Show current page area if not already shown
      if (page > 3 && page < pages - 2) {
        items.push(page);
      }

      if (page < pages - 3) {
        items.push('...');
      }

      // Always show last 3
      items.push(pages - 2, pages - 1, pages);
    }

    // Remove duplicates and sort
    const unique = [...new Set(items)];
    return unique;
  };

  return (
    <div className="pagination" id="pagination">
      <button
        className="pagination-btn pagination-nav pagination-nav-prev"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        id="btn-prev-page"
      >
        <MdChevronLeft /> Previous
      </button>

      <div className="pagination-numbers">
        {getPageNumbers().map((num, idx) =>
          num === '...' ? (
            <span key={`dots-${idx}`} className="pagination-dots">...</span>
          ) : (
            <button
              key={num}
              className={`pagination-btn pagination-num ${num === page ? 'active' : ''}`}
              onClick={() => onPageChange(num)}
            >
              {num}
            </button>
          )
        )}
      </div>

      <button
        className="pagination-btn pagination-nav pagination-nav-next"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        id="btn-next-page"
      >
        Next <MdChevronRight />
      </button>
    </div>
  );
};

export default Pagination;
