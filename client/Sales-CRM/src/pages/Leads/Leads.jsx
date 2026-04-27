import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import Pagination from '../../components/Pagination/Pagination';
import { MdSearch, MdClose, MdFileDownload } from 'react-icons/md';
import './Leads.css';

const CsvUploadIcon = () => (
  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="csv-upload-icon">
    <g clipPath="url(#clip0_2_5906)">
      <path d="M33.4418 3.12109H14.1744V11.1111H37.5569V7.23451C37.5569 4.96616 35.7108 3.12109 33.4418 3.12109Z" fill="#00181B" fillOpacity="0.25" />
      <path d="M22.5352 12.3403H0V4.92636C0 2.20972 2.21068 0 4.92828 0H12.1336C12.8497 0 13.5396 0.150925 14.1664 0.434509C15.0418 0.828964 15.7939 1.47913 16.3213 2.3286L22.5352 12.3403Z" fill="#00181B" />
      <path d="M42 14.0004V37.8817C42 40.153 40.1511 42.0003 37.8789 42.0003H4.12111C1.84891 42.0003 0 40.153 0 37.8817V9.88086H37.8789C40.1511 9.88086 42 11.7288 42 14.0004Z" fill="#00181B" />
      <path d="M42 14.0004V37.8817C42 40.153 40.1511 42.0003 37.8789 42.0003H21V9.88086H37.8789C40.1511 9.88086 42 11.7288 42 14.0004Z" fill="#00181B" />
      <path d="M32.0479 25.9395C32.0479 32.032 27.0918 36.9884 21 36.9884C14.9082 36.9884 9.95206 32.032 9.95206 25.9395C9.95206 19.8481 14.9082 14.8916 21 14.8916C27.0918 14.8916 32.0479 19.8481 32.0479 25.9395Z" fill="white" />
      <path d="M32.0479 25.9395C32.0479 32.032 27.0918 36.9884 21 36.9884V14.8916C27.0918 14.8916 32.0479 19.8481 32.0479 25.9395Z" fill="#00181B" fillOpacity="0.25" />
      <path d="M24.561 26.0758C24.3306 26.2709 24.0483 26.3661 23.7686 26.3661C23.4183 26.3661 23.0703 26.2177 22.8268 25.9287L22.2305 25.2218V29.8499C22.2305 30.5292 21.6793 31.0803 21 31.0803C20.3207 31.0803 19.7695 30.5292 19.7695 29.8499V25.2218L19.1732 25.9287C18.7342 26.4481 17.9584 26.5145 17.439 26.0758C16.9199 25.6378 16.8533 24.8617 17.2913 24.3422L19.7269 21.4548C20.0445 21.0793 20.5078 20.8633 21 20.8633C21.4922 20.8633 21.9555 21.0793 22.2731 21.4548L24.7087 24.3422C25.1467 24.8617 25.0801 25.6378 24.561 26.0758Z" fill="#00181B" />
      <path d="M24.561 26.0758C24.3306 26.2709 24.0483 26.3661 23.7686 26.3661C23.4183 26.3661 23.0703 26.2177 22.8268 25.9287L22.2305 25.2218V29.8499C22.2305 30.5292 21.6793 31.0803 21 31.0803V20.8633C21.4922 20.8633 21.9555 21.0793 22.2731 21.4548L24.7087 24.3422C25.1467 24.8617 25.0801 25.6378 24.561 26.0758Z" fill="#00181B" />
    </g>
    <defs>
      <clipPath id="clip0_2_5906">
        <rect width="42" height="42" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const LANGUAGES = ['english', 'hindi', 'marathi', 'kannada', 'bengali'];
const LEADS_PAGE_SIZE = 11;
const LEADS_COLUMN_WIDTHS = [43, 96, 129, 120, 110, 96, 102, 116, 102, 66, 136];

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    source: '',
    date: '',
    location: '',
    language: 'english'
  });

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LEADS_PAGE_SIZE),
        search
      });
      const res = await api.get(`/leads?${params.toString()}`);
      setLeads(res.data.leads);
      setPages(res.data.pages);
      setTotal(res.data.total);
    } catch (error) {
      console.error('Fetch leads error:', error);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 300);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  const handleAddLead = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leads', formData);
      setShowManualModal(false);
      setFormData({ name: '', email: '', source: '', date: '', location: '', language: 'english' });
      fetchLeads();
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating lead');
    }
  };

  const handleCSVUpload = async (e) => {
    if (e) e.preventDefault();
    const file = fileInputRef.current?.files[0] || selectedFile;
    if (!file) return;

    setUploading(true);
    setUploadResult('');

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await api.post('/leads/upload-csv', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult(`Success: ${res.data.message}`);
      fetchLeads();
    } catch (error) {
      setUploadResult(`Error: ${error.response?.data?.message || 'Upload failed'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      setSelectedFile(file);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
  };

  const formatScheduledDate = (dateStr) => {
    if (!dateStr) return '-';

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
  };

  const formatEmailForCell = (email) => {
    if (!email) return '-';

    const [localPart, domainPart] = email.split('@');
    if (!domainPart || email.length <= 24) return email;

    if (localPart.length <= 8) {
      return `${localPart}@${domainPart}`;
    }

    return `${localPart.slice(0, 8)}...@${domainPart}`;
  };

  return (
    <div className="leads-page" id="leads-page">
      <header className="leads-navbar">
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
            id="search-leads"
          />
        </div>
      </header>

      <div className="leads-toolbar">
        <div className="breadcrumb">
          <span>Home</span>
          <span className="breadcrumb-sep">&rsaquo;</span>
          <span className="breadcrumb-active">Leads</span>
        </div>
        <div className="leads-actions">
          <button className="leads-action-btn" onClick={() => setShowManualModal(true)} id="btn-manual-lead">
            Add Manually
          </button>
          <button className="leads-action-btn" onClick={() => { setUploadResult(''); setSelectedFile(null); setShowCSVModal(true); }} id="btn-upload-csv">
            Add CSV
          </button>
        </div>
      </div>

      <div className="leads-table-container">
        <table className="data-table" id="leads-table">
          <colgroup>
            {LEADS_COLUMN_WIDTHS.map((width, index) => (
              <col key={index} style={{ width: `${width}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th>No.</th>
              <th>Name</th>
              <th>Email</th>
              <th>Source</th>
              <th>Date</th>
              <th>Location</th>
              <th>Language</th>
              <th>Assigned To</th>
              <th>Status</th>
              <th>Type</th>
              <th>Scheduled Date</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr><td colSpan="11" className="empty-cell">No leads found</td></tr>
            ) : (
              leads.map((lead, index) => (
                <tr key={lead._id}>
                  <td>{(page - 1) * LEADS_PAGE_SIZE + index + 1}</td>
                  <td className="name-cell" title={lead.name}>
                    <span className="table-cell-text">{lead.name}</span>
                  </td>
                  <td className="email-cell" title={lead.email}>
                    <span className="table-cell-text table-cell-text-email">{formatEmailForCell(lead.email)}</span>
                  </td>
                  <td title={lead.source}>
                    <span className="table-cell-text">{lead.source}</span>
                  </td>
                  <td>{formatDate(lead.date)}</td>
                  <td title={lead.location}>
                    <span className="table-cell-text">{lead.location}</span>
                  </td>
                  <td title={lead.language}>
                    <span className="table-cell-text">
                      {lead.language?.charAt(0).toUpperCase() + lead.language?.slice(1)}
                    </span>
                  </td>
                  <td title={lead.assignedTo?.employeeId || 'Unassigned'}>
                    {lead.assignedTo
                      ? <span className="table-cell-text">{lead.assignedTo.employeeId || '-'}</span>
                      : <span className="unassigned">Unassigned</span>}
                  </td>
                  <td>{lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1) : '-'}</td>
                  <td>{lead.type ? lead.type.charAt(0).toUpperCase() + lead.type.slice(1) : '-'}</td>
                  <td title={formatScheduledDate(lead.scheduledDate)}>
                    <span className="table-cell-text">{formatScheduledDate(lead.scheduledDate)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="leads-pagination-wrap">
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
      </div>

      {showManualModal && (
        <div className="lead-modal-overlay" onClick={() => setShowManualModal(false)}>
          <div className="lead-modal lead-modal-manual" onClick={(e) => e.stopPropagation()}>
            <div className="lead-modal-header">
              <h2 className="lead-modal-title">Add New Lead</h2>
              <button className="lead-modal-close" onClick={() => setShowManualModal(false)} id="btn-modal-close">
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleAddLead} className="lead-modal-form" id="manual-lead-form">
              <div className="lead-field">
                <label>Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="lead-field">
                <label>Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="lead-field">
                <label>Source</label>
                <input type="text" value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} placeholder="Referral" required />
              </div>
              <div className="lead-field">
                <label>Date</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="lead-field">
                <label>Location</label>
                <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required />
              </div>
              <div className="lead-field">
                <label>Preferred Language</label>
                <select value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })}>
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
                  ))}
                </select>
              </div>
            </form>
            <div className="lead-modal-footer-center">
              <button type="submit" form="manual-lead-form" className="lead-save-btn">Save</button>
            </div>
          </div>
        </div>
      )}

      {showCSVModal && (
        <div className="csv-overlay" onClick={() => setShowCSVModal(false)}>
          <div className="csv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="csv-title-section">
              <div className="csv-title-left">
                <h3 className="csv-heading">CSV Upload</h3>
                <p className="csv-desc">Add your documents here</p>
              </div>
              <div className="csv-title-right">
                <button className="csv-close-btn" onClick={() => setShowCSVModal(false)} id="btn-csv-close">
                  <MdClose />
                </button>
              </div>
            </div>

            <form onSubmit={handleCSVUpload} id="csv-upload-form" style={{ display: 'contents' }}>
              <div
                className={`csv-dropzone ${dragActive ? 'csv-drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <CsvUploadIcon />
                <div className="csv-drag-text">
                  <span>Drag your file(s) to start uploading</span>
                </div>
                <div className="csv-or-divider">
                  <span className="csv-or-line"></span>
                  <span className="csv-or-text">OR</span>
                  <span className="csv-or-line"></span>
                </div>
                <button type="button" className="csv-browse-btn" onClick={() => fileInputRef.current?.click()}>
                  Browse files
                </button>
                <input type="file" accept=".csv" ref={fileInputRef} className="csv-hidden-input" id="csv-file-input" onChange={handleFileChange} />
                <div className="csv-sample-row">
                  <span className="csv-sample-name">{selectedFile ? selectedFile.name : 'Sample File.csv'}</span>
                  <MdFileDownload className="csv-sample-icon" />
                </div>
              </div>

              {uploadResult && (
                <div className={`csv-upload-result ${uploadResult.startsWith('Success:') ? 'success' : 'error'}`}>
                  {uploadResult}
                </div>
              )}

              <div className="csv-buttons">
                <button type="button" className="csv-cancel-btn" onClick={() => setShowCSVModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="csv-next-btn" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Next'}
                  {!uploading && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.5 5L12.5 10L7.5 15" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
