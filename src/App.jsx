import React, { useState } from 'react';

export default function App() {
  const [searchPhone, setSearchPhone] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [issueType, setIssueType] = useState('HVAC - AC/Fridge');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      alert('शिकायत दर्ज हो गई है!');
      setLoading(false);
      setName('');
      setPhone('');
      setDescription('');
    }, 1000);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Manqube Field App</h2>

      {/* नई शिकायत दर्ज करने का फॉर्म */}
      <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label>आपका नाम:</label><br />
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} required />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label>मोबाइल नंबर:</label><br />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} required />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label>समस्या का प्रकार:</label><br />
            <select value={issueType} onChange={(e) => setIssueType(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="HVAC - AC/Fridge">HVAC (AC / Fridge)</option>
              <option value="Electrical - Wiring/Panel">Electrical (Wiring / Panel / Geyser)</option>
              <option value="Civil Work">Civil Work</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>समस्या का विवरण:</label><br />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} rows="3" required />
          </div>

          <button type="submit" disabled={loading} style={{ background: '#28a745', color: '#fff', padding: '12px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
            {loading ? 'सबमिट हो रहा है...' : 'शिकायत भेजें'}
          </button>
        </form>
      </div>

      {/* कस्टमर पुरानी शिकायतें देखने का सेक्शन */}
      <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <h3>अपनी पुरानी शिकायतें देखें (Customer History)</h3>
        <div style={{ marginBottom: '12px' }}>
          <label>अपना रजिस्टर्ड मोबाइल नंबर दर्ज करें:</label><br />
          <input type="tel" placeholder="mobile number" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
      </div>
    </div>
  );
}