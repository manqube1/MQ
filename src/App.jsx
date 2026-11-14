import React, { useState, useEffect } from 'react';
import { db, storage, compressImage } from './firebase';
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function App() {
  const [role, setRole] = useState('customer'); // customer, staff, admin
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [issueType, setIssueType] = useState('AC Cooling');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState([]);
  
  // Customer History States
  const [customerHistory, setCustomerHistory] = useState([]);
  const [searchPhone, setSearchPhone] = useState('');
  
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

  // Fetch customer previous complaints
  const fetchCustomerHistory = async (phoneNumber) => {
    if (!phoneNumber) return alert("कृपया खोजने के लिए मोबाइल नंबर दर्ज करें");
    try {
      const complaintsRef = collection(db, "complaints");
      const q = query(complaintsRef, where("phone", "==", phoneNumber));
      const querySnapshot = await getDocs(q);
      
      let historyList = [];
      querySnapshot.forEach((doc) => {
        historyList.push({ id: doc.id, ...doc.data() });
      });
      
      setCustomerHistory(historyList);
    } catch (err) {
      alert("इतिहास लोड करने में त्रुटि: " + err.message);
    }
  };

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
        const storageRef = ref(storage, `job_sheets/${Date.now()}.jpg`);
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
        <div>
          {/* नई शिकायत दर्ज करने का फॉर्म */}
          <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
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

          {/* कस्टमर पुरानी शिकायतें देखने का सेक्शन */}
          <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <h3>अपनी पुरानी शिकायतें देखें (Customer History)</h3>
            <div style={{ marginBottom: '12px' }}>
              <label>अपना रजिस्टर्ड मोबाइल नंबर दर्ज करें:</label><br />
              <input type="tel" placeholder="mobile number" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}/>