import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('customer'); // customer, staff, admin
  
  // कस्टमर स्टेट
  const [custPhone, setCustPhone] = useState('');
  const [custLoggedIn, setCustLoggedIn] = useState(false);
  const [complaints, setComplaints] = useState([]);
  
  // नई शिकायत फॉर्म स्टेट
  const [productType, setProductType] = useState('AC');
  const [problemDesc, setProblemDesc] = useState('');

  // स्टाफ स्टेट
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [staffLoggedIn, setStaffLoggedIn] = useState(false);

  // जॉब शीट फॉर्म स्टेट (स्टाफ के लिए)
  const [jobCustPhone, setJobCustPhone] = useState('');
  const [voltage, setVoltage] = useState('220V');
  const [ampere, setAmpere] = useState('');
  const [stabilizer, setStabilizer] = useState('OK');
  const [selectedItems, setSelectedItems] = useState([]);

  // कस्टमर लॉगिन हैंडलर
  const handleCustomerLogin = (e) => {
    e.preventDefault();
    if (custPhone.length < 10) {
      alert('कृपया सही मोबाइल नंबर दर्ज करें!');
      return;
    }
    // डेमो के लिए पुरानी शिकायतें या नया सेशन शुरू करना
    setCustLoggedIn(true);
  };

  // नई शिकायत दर्ज करना (ऑटोमैटिक यूनिक जॉब शीट नंबर जनरेटर के साथ)
  const handleNewComplaint = (e) => {
    e.preventDefault();
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    // आपके नियम के मुताबिक जॉब शीट नंबर: मोबाइल + दिनांक + समय
    const jobSheetNo = `${custPhone}${day}${month}${year}${hours}${minutes}`;

    const newEntry = {
      jobSheetNo,
      product: productType,
      desc: problemDesc,
      status: 'Pending',
      date: `${day}/${month}/${year} ${hours}:${minutes}`
    };

    setComplaints([newEntry, ...complaints]);
    setProblemDesc('');
    alert(शिकायत दर्ज हो गई!\nआपका जॉब शीट नंबर है:\n${jobSheetNo});
  };

  // स्टाफ लॉगिन हैंडलर
  const handleStaffLogin = (e) => {
    e.preventDefault();
    if (staffPin === '1234' || staffPin.length === 4) { // डिफ़ॉल्ट पिन 1234
      setStaffLoggedIn(true);
    } else {
      alert('गलत पिन! कृपया सही पिन दर्ज करें।');
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '650px', margin: '0 auto', padding: '15px', background: '#f4f6f9', minHeight: '100vh' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>Manqube Field Service</h2>

      {/* नेविगेशन टैब */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', background: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <button onClick={() => setActiveTab('customer')} style={{ padding: '10px 15px', background: activeTab === 'customer' ? '#007bff' : '#eee', color: activeTab === 'customer' ? '#fff' : '#333', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>कस्टमर (Customer)</button>
        <button onClick={() => setActiveTab('staff')} style={{ padding: '10px 15px', background: activeTab === 'staff' ? '#28a745' : '#eee', color: activeTab === 'staff' ? '#fff' : '#333', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>फ़ील्ड स्टाफ (Staff)</button>
        <button onClick={() => setActiveTab('admin')} style={{ padding: '10px 15px', background: activeTab === 'admin' ? '#ffc107' : '#eee', color: '#333', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>एडमिन (Admin)</button>
      </div>

      {/* 1. कस्टमर सेक्शन */}
      {activeTab === 'customer' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          {!custLoggedIn ? (
            <form onSubmit={handleCustomerLogin}>
              <h3>कस्टमर पोर्टल</h3>
              <p>अपनी पुरानी शिकायतें देखने या नई दर्ज करने के लिए मोबाइल नंबर डालें:</p>
              <input type="tel" placeholder="मोबाइल नंबर दर्ज करें" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc' }} required />
              <button type="submit" style={{ width: '100%', padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>आगे बढ़ें</button>
            </form>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>स्वागत है! मोबाइल: {custPhone}</h4>
                <button onClick={() => setCustLoggedIn(false)} style={{ padding: '5px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>लॉग आउट</button>
              </div>
              <hr style={{ margin: '15px 0' }} />

              {/* नई शिकायत फॉर्म */}
              <h5>नई शिकायत दर्ज करें</h5>
              <form onSubmit={handleNewComplaint}>
                <div style={{ marginBottom: '10px' }}>
                  <label>समस्या का प्रकार / प्रोडक्ट:</label><br />
                  <select value={productType} onChange={(e) => setProductType(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="AC">AC (एयर कंडीशनर)</option>
                    <option value="Fridge">Fridge (फ्रिज)</option>
                    <option value="Stabilizer">Stabilizer (स्टेबलाइजर)</option>
                    <option value="Electrical">Electrical Wiring/Panel</option>
                  </select>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label>समस्या का विवरण (Problem Description):</label><br />
                  <textarea value={problemDesc} onChange={(e) => setProblemDesc(e.target.value)} rows="3" placeholder="समस्या क्या आ रही है लिखें..." style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                </div>
                <button type="submit" style={{ width: '100%', padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>शिकायत सबमिट करें</button>
              </form>

              {/* पुरानी शिकायतें और जॉब शीट लिस्ट */}
              <h5 style={{ marginTop: '25px' }}>आपकी पुरानी शिकायतें और जॉब शीट (History)</h5>
              {complaints.length === 0 ? (
                <p style={{ color: '#777' }}>इस नंबर पर अभी कोई शिकायत दर्ज नहीं है।</p>
              ) : (
                complaints.map((item, index) => (
                  <div key={index} style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '10px', borderLeft: '4px solid #007bff' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#555' }}><b>जॉब शीट नंबर:</b> {item.jobSheetNo}</p>
                    <p style={{ margin: '0 0 5px 0' }}><b>प्रोडक्ट:</b> {item.product} | <b>स्थिति:</b> <span style={{ color: item.status === 'Pending' ? 'orange' : 'green' }}>{item.status}</span></p>
                    <p style={{ margin: '0 0 5px 0' }}><b>विवरण:</b> {item.desc}</p>
                    <p style={{ margin: '0', fontSize: '12px', color: '#888' }}>दिनांक: {item.date}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. स्टाफ सेक्शन */}
      {activeTab === 'staff' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          {!staffLoggedIn ? (
            <form onSubmit={handleStaffLogin}>
              <h3>स्टाफ लॉगिन (Staff Authentication)</h3>
              <p>काम शुरू करने के लिए अपना मोबाइल नंबर और 4-अंकों का पिन (PIN) दर्ज करें:</p>
              <input type="tel" placeholder="स्टाफ मोबाइल नंबर" value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc' }} required />
              <input type="password" maxLength="4" placeholder="4-Digit PIN (डिफ़ॉल्ट: 1234)" value={staffPin} onChange={(e) => setStaffPin(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc' }} required />
              <button type="submit" style={{ width: '100%', padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>लॉग इन करें</button>
            </form>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>स्टाफ पोर्टल (सक्रिय: {staffPhone})</h4>
                <button onClick={() => setStaffLoggedIn(false)} style={{ padding: '5px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>लॉग आउट</button>
              </div>
              <hr style={{ margin: '15px 0' }} />

              {/* टेक्निकल जॉब शीट फॉर्म */}
              <h5>फील्ड जॉब शीट और टेक्निकल पैरामीटर्स</h5>
              <div style={{ marginBottom: '10px' }}>
                <label>कस्टमर का मोबाइल नंबर:</label>
                <input type="tel" placeholder="ग्राहक का मोबाइल नंबर" value={jobCustPhone} onChange={(e) => setJobCustPhone(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label>Voltage:</label>
                  <input type="text" value={voltage} onChange={(e) => setVoltage(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Ampere:</label>
                  <input type="text" placeholder="जैसे 5.2A" value={ampere} onChange={(e) => setAmpere(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label>Stabilizer Status:</label>
                <select value={stabilizer} onChange={(e) => setStabilizer(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="OK">OK (सही काम कर रहा है)</option>
                  <option value="High/Low Cut">High/Low Voltage Cut</option>
                  <option value="Not Available">Not Available (उपलब्ध नहीं)</option>
                </select>
              </div>

              {/* क्विक आइटम्स स्लाइडर/चेकबॉक्स */}
              <div style={{ marginBottom: '15px' }}>
                <label>जरूरी पार्ट्स / आइटम्स (Quick Select):</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '5px' }}>
                  {['Capacitor', 'Gas Charging', 'Overload', 'Wireing/MCB', 'Service/Wash'].map((item) => (
                    <label key={item} style={{ background: '#e9ecef', padding: '6px 10px', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' }}>
                      <input type="checkbox" onChange={(e) => {
                        if(e.target.checked) setSelectedItems([...selectedItems, item]);
                        else setSelectedItems(selectedItems.filter(i => i !== item));
                      }} style={{ marginRight: '5px' }} />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              {/* डिजिटल सिग्नेचर पैड एरिया */}
              <div style={{ marginBottom: '15px' }}>
                <label>कस्टमर डिजिटल हस्ताक्षर (Signature):</label>
                <div style={{ border: '2px dashed #ccc', height: '100px', background: '#fafafa', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', marginTop: '5px' }}>
                  [कस्टमर यहाँ उंगली से हस्ताक्षर करें]
                </div>
              </div>

              <button onClick={() => alert('जॉब शीट सफलतापूर्वक सेव हो गई!')} style={{ width: '100%', padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>जॉब शीट सबमिट करें</button>
            </div>
          )}
        </div>
      )}

      {/* 3. एडमिन सेक्शन */}
      {activeTab === 'admin' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>एडमिन पैनल (Management)</h3>
          <p>यहाँ सभी शिकायतों और स्टाफ की रिपोर्ट दिखाई देगी।</p>
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #ddd' }}>
            <p><b>कुल दर्ज शिकायतें:</b> {complaints.length}</p>
            <p style={{ color: 'green', fontWeight: 'bold' }}>सिस्टम पूरी तरह से ऑनलाइन और एक्टिव है।</p>
          </div>
        </div>
      )}
    </div>
  );
}