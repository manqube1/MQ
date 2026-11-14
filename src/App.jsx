import React, { useState } from 'react';

export default function App() {
  const [searchPhone, setSearchPhone] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      alert('शिकायत दर्ज हो गई है!');
      setLoading(false);
      setName('');
      setPhone('');
    }, 1000);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Manqube Field App</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="नाम" value={name} onChange={(e) => setName(e.target.value)} required /><br/><br/>
        <input type="tel" placeholder="मोबाइल नंबर" value={phone} onChange={(e) => setPhone(e.target.value)} required /><br/><br/>
        <button type="submit">{loading ? 'भेज रहे हैं...' : 'शिकायत भेजें'}</button>
      </form>
    </div>
  );
}