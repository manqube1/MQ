import React, { useState, useEffect } from 'react';
import { db, storage, compressImage } from './firebase';
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function App() {
  const [role, setRole] = useState('customer'); // customer, staff, admin
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [issueType, setIssueType] = useState('AC Cooling');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState([]);
  
  // Staff State & Multi-level Selection
  const [staffName, setStaffName] = useState('');
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [location, setLocation] = useState(null);
  
  // Workflow States
  const [selectedCategory, setSelectedCategory] = useState(null); // HVAC, Electrical, Civil
  const [selectedSubItem, setSelectedSubItem] = useState(null); // AC, Fridge, etc.
  
  // Job Sheet Fields
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [workDoneNote, setWorkDoneNote] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [amountCharged, setAmountCharged] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [signature, setSignature] = useState('');

  // Sub-categories mapping based on your requirements
  const categoriesData = {
    "HVAC": [
      { name: "AC (Air Conditioner)", icon: "❄️" },
      { name: "Refrigerator (फ्रिज)", icon: "🧊" },
      { name: "Deep Freezer (दीप फ्रीजर)", icon: "🥶" },
      { name: "Air Cooler (कूलर)", icon: "💨" }
    ],
    "Electrical": [
      { name: "Wiring (वायरिंग)", icon: "🔌" },
      { name: "Geyser (गीजर)", icon: "♨️" },
      { name: "Fan (फैन)", icon: "🌀" },
      { name: "Electrical Panel (इलेक्ट्रिकल पैनल)", icon: "⚡" }
    ],
    "Civil": [
      { name: "General Civil Work (सिविल रिपेयर)", icon: "🧱" },
      { name: "Pipe & Fitting (पाइप फिटिंग)", icon: "🔧" }
    ]
  };

  const fetchComplaints = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "complaints"));
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComplaints(list);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone) return alert("नाम और फोन नंबर भरें!");
    setLoading(true);
    try {
      await addDoc(collection(db, "complaints"), {
        name,
        phone,
        issueType,
        description,
        status: "Pending",
        createdAt: serverTimestamp()
      });
      alert("शिकायत सफलतापूर्वक दर्ज हो गई है!");
      setName('');
      setPhone('');
      setDescription('');
      fetchComplaints();
    } catch (err) {
      alert("एरर: " + err.message);
    }
    setLoading(false);
  };

  const markAttendance = () => {
    if (!staffName) return alert("स्टाफ का नाम दर्ज करें!");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAttendanceMarked(true);
        alert("GPS अटेंडेंस सफलतापर्वक दर्ज हो गई है!");
      },
      (err) => alert("GPS एरर: कृपया लोकेशन की अनुमति दें।")
    );
  };

  // Professional Job Sheet Submission
  const handleJobSheetSubmit = async (e) => {
    e.preventDefault();
    if (!attendanceMarked) return alert("पहले अटेंडेंस मार्क करें!");
    if (!selectedCategory || !selectedSubItem) return alert("कृपया कैटेगरी और उपकरण चुनें!");
    
    setLoading(true);
    try {
      let imageUrl = "";
      if (imageFile) {
        const compressed = await compressImage(imageFile);
        const storageRef = ref(storage, 'job_sheets/${Date.now()}.jpg');//
        await uploadBytes(storageRef, compressed);
        imageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "jobLogs"), {
        staffName,
        location,
        category: selectedCategory,
        subItem: selectedSubItem,
        clientName,
        clientPhone,
        workDoneNote,
        partsUsed,
        amountCharged,
        imageUrl,
        signature,
        createdAt: serverTimestamp()
      });

      alert("प्रोफेशनल जॉब शीट सफलतापूर्व सबमिट और सेव हो गई है!");
      // Reset flow
      setSelectedCategory(null);
      setSelectedSubItem(null);
      setClientName('');
      setClientPhone('');
      setWorkDoneNote('');
      setPartsUsed('');
      setAmountCharged('');
      setImageFile(null);
      setSignature('');
    } catch (err) {
      alert("एरर: " + err.message);
    }
    setLoading(false);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const docRef = doc(db, "complaints", id);
      await updateDoc(docRef, { status: newStatus });
      fetchComplaints();
    } catch (err) {
      alert("अपडेट करने में समस्या: " + err.message);
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '850px', margin: '20px auto', padding: '20px', background: '#f4f7f6', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', color: '#0056b3' }}>MQ - Field Service Management (Manqube)</h2>
      
      {/* Role Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '25px' }}>
        <button onClick={() => setRole('customer')} style={{ padding: '10px 20px', background: role === 'customer' ? '#0056b3' : '#ddd', color: role === 'customer' ? '#fff' : '#000', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>कस्टमर (Customer)</button>
        <button onClick={() => setRole('staff')} style={{ padding: '10px 20px', background: role === 'staff' ? '#0056b3' : '#ddd', color: role === 'staff' ? '#fff' : '#000', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>फील्ड स्टाफ (Staff)</button>
        <button onClick={() => setRole('admin')} style={{ padding: '10px 20px', background: role === 'admin' ? '#0056b3' : '#ddd', color: role === 'admin' ? '#fff' : '#000', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>एडमिन (Admin)</button>
      </div>

      {/* 1. CUSTOMER VIEW */}
      {role === 'customer' && (
        <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>नई शिकायत दर्ज करें</h3>
          <form onSubmit={handleCustomerSubmit}>
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
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} rows="3" />
            </div>
            <button type="submit" disabled={loading} style={{ background: '#28a745', color: '#fff', padding: '12px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
              {loading ? 'सबमिट हो रहा है...' : 'शिकायत भेजें'}
            </button>
          </form>
        </div>
      )}

      {/* 2. STAFF PORTAL */}
      {role === 'staff' && (
        <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>फील्ड स्टाफ पोर्टल (GPS अटेंडेंस & जॉब शीट)</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label>स्टाफ का नाम:</label><br />
            <input type="text" value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="अपना पूरा नाम लिखें" style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          
          {!attendanceMarked ? (
            <button onClick={markAttendance} style={{ background: '#ffc107', color: '#000', padding: '12px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
              📍 GPS अटेंडेंस मार्क करें (Check-in)
            </button>
          ) : (
            <div style={{ background: '#e2f0d9', padding: '10px', borderRadius: '5px', marginBottom: '15px', color: '#385723', fontWeight: 'bold' }}>
              ✓ अटेंडेंस दर्ज है! (Lat: {location?.lat.toFixed(4)}, Lng: {location?.lng.toFixed(4)})
            </div>
          )}

          {attendanceMarked && (
            <div style={{ marginTop: '20px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
              
              {/* STEP A: Select Main Category (HVAC, Electrical, Civil) */}
              {!selectedCategory && (
                <div>
                  <h4 style={{ color: '#0056b3', marginBottom: '15px' }}>स्टेप 1: मुख्य सर्विस कैटेगरी चुनें</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                    {['HVAC', 'Electrical', 'Civil'].map((cat) => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ padding: '20px', background: '#0056b3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                        {cat === 'HVAC' ? '❄️ HVAC' : cat === 'Electrical' ? '⚡ Electrical' : '🧱 Civil'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP B: Select Sub-item (AC, Fridge, Geyser, etc.) */}
              {selectedCategory && !selectedSubItem && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ color: '#0056b3', margin: '0' }}>{selectedCategory} के तहत उपकरण चुनें:</h4>
                    <button onClick={() => setSelectedCategory(null)} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>← पीछे जाएं</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {categoriesData[selectedCategory].map((item) => (
                      <button key={item.name} onClick={() => setSelectedSubItem(item.name)} style={{ padding: '15px', background: '#fff', border: '2px solid #0056b3', color: '#0056b3', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <span style={{ fontSize: '24px' }}>{item.icon}</span> {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP C: Professional Job Sheet Form */}
              {selectedCategory && selectedSubItem && (
                <form onSubmit={handleJobSheetSubmit} style={{ background: '#fdfdfd', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
                    <h4 style={{ margin: '0', color: '#28a745' }}>📝 जॉब शीट: {selectedCategory} &gt; {selectedSubItem}</h4>
                    <button type="button" onClick={() => setSelectedSubItem(null)} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>उपकरण बदलें</button>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label>कस्टमर का नाम:</label><br />
                    <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label>कस्टमर मोबाइल नंबर:</label><br />
                    <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label>क्या काम किया गया (Work Done Summary):</label><br />
                    <textarea value={workDoneNote} onChange={(e) => setWorkDoneNote(e.target.value)} placeholder="जैसे: गैस चार्जिंग, कॉइल क्लीनिंग, वायरिंग फॉल्ट ठीक किया" style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} rows="2" required />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label>डाले गए पार्ट्स / सामग्री (Parts Used):</label><br />
                    <input type="text" value={partsUsed} onChange={(e) => setPartsUsed(e.target.value)} placeholder="जैसे: कैपेसिटर 35 MFD, नई वायर" style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label>कुल चार्ज राशि (₹):</label><br />
                    <input type="number" value={amountCharged} onChange={(e) => setAmountCharged(e.target.value)} placeholder="जैसे: 1500" style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label>काम की फोटो / मशीन फोटो अपलोड करें:</label><br />
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ marginTop: '5px' }} />
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label>कस्टमर का नाम / डिजिटल हस्ताक्षर (Customer Name/Sign):</label><br />
                    <input type="text" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="कस्टमर द्वारा नाम टाइप करें" style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                  </div>

                  <button type="submit" disabled={loading} style={{ background: '#28a745', color: '#fff', padding: '12px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
                    {loading ? 'सेव हो रहा है...' : '✓ प्रोफेशनल जॉब शीट सबमिट करें (कस्टमर संतुष्टि के साथ)'}
                  </button>
                </form>
              )}

            </div>
          )}
        </div>
      )}

      {/* 3. ADMIN DASHBOARD */}
      {role === 'admin' && (
        <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>एडमिन डैशबोर्ड (शिकायतें & फील्ड जॉब रिकॉर्ड)</h3>
          {complaints.length === 0 ? (
            <p>कोई शिकायत दर्ज नहीं है।</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {complaints.map((item) => (
                <li key={item.id} style={{ background: '#f9f9f9', border: '1px solid #e0e0e0', margin: '12px 0', padding: '15px', borderRadius: '6px' }}>
                  <strong>{item.name}</strong> ({item.phone}) - <span style={{ color: '#0056b3' }}>{item.issueType}</span>
                  <p style={{ margin: '8px 0' }}>{item.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                    <span>स्थिति: <b style={{ color: item.status === 'Resolved' ? 'green' : '#d9534f' }}>{item.status}</b></span>
                    <div>
                      <button onClick={() => updateStatus(item.id, 'In Progress')} style={{ marginRight: '8px', background: '#ffc107', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>प्रगति पर</button>
                      <button onClick={() => updateStatus(item.id, 'Resolved')} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>हल हो गया</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}