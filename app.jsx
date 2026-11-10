import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [jobSheets, setJobSheets] = useState([
    { id: 1, client: 'Local Hospital Facility', equipment: 'Outdoor Split AC Unit (24 Units)', status: 'Pending Shifting' },
    { id: 2, client: 'Varanasi Institution', equipment: 'UPS Room Cooling Unit', status: 'In Progress' }
  ]);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      <header style={{ backgroundColor: '#0284c7', color: 'white', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>MQ App - Field Service Management</h1>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>Manqube Private Limited | HVAC & Electrical Services</p>
      </header>

      <nav style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('dashboard')}
          style={{ padding: '10px 15px', backgroundColor: activeTab === 'dashboard' ? '#0284c7' : '#e2e8f0', color: activeTab === 'dashboard' ? 'white' : '#334155', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('jobs')}
          style={{ padding: '10px 15px', backgroundColor: activeTab === 'jobs' ? '#0284c7' : '#e2e8f0', color: activeTab === 'jobs' ? 'white' : '#334155', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Job Sheets
        </button>
      </nav>

      {activeTab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>Active Field Units</h3>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#0284c7' }}>04</p>
            <p style={{ color: '#64748b' }}>Active vehicles & field staff on-site</p>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>Pending Job Sheets</h3>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#d97706' }}>{jobSheets.length}</p>
            <p style={{ color: '#64748b' }}>Requires technician verification</p>
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2>Digital Job Sheets</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {jobSheets.map((job) => (
              <li key={job.id} style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{job.client}</strong>
                  <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '14px' }}>{job.equipment}</p>
                </div>
                <span style={{ padding: '5px 10px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                  {job.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
