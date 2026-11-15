import React, { useState } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDUUnfmXZSLOS2FrUAnr2eSFYAWnwURRfC",
  authDomain: "mq-fsm-45ee9.firebaseapp.com",
  projectId: "mq-fsm-45ee9",
  storageBucket: "mq-fsm-45ee9.firebasestorage.app",
  messagingSenderId: "527381468184",
  appId: "1:527381468184:web:326741c5e9759c7799a36d",
  measurementId: "G-VTMP9DR7D9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 800;
        const scaleSize = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/jpeg", 0.7);
      };
    };
  });
};

export default function App() {
  const [activeTab, setActiveTab] = useState('customer');
  const [jobSheets, setJobSheets] = useState([]);

  const [custPhone, setCustPhone] = useState('');
  const [custLoggedIn, setCustLoggedIn] = useState(false);
  const [productType, setProductType] = useState('Split AC');
  const [problemDesc, setProblemDesc] = useState('');

  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [staffLoggedIn, setStaffLoggedIn] = useState(false);

  const [jobCustName, setJobCustName] = useState('');
  const [jobCustAddress, setJobCustAddress] = useState('');
  const [jobCustPhone, setJobCustPhone] = useState('');
  const [modelNo, setModelNo] = useState('');
  const [workDone, setWorkDone] = useState('');
  const [sectionPressure, setSectionPressure] = useState('');
  const [roomTemp, setRoomTemp] = useState('');
  const [voltage, setVoltage] = useState('230V');
  const [ampere, setAmpere] = useState('');
  const [stabilizer, setStabilizer] = useState('OK');
  const [selectedItems, setSelectedItems] = useState([]);

  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleCustomerLogin = (e) => {
    e.preventDefault();
    if (custPhone.length < 10) {
      alert('कृपया सही मोबाइल नंबर दर्ज करें!');
      return;
    }
    setCustLoggedIn(true);
  };

  const handleNewComplaint = (e) => {
    e.preventDefault();
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    // बिना बैक-टिक के स्ट्रिंग कंस्ट्रक्शन
    const jobSheetNo = 'COMP' + custPhone + day + month + hours + minutes;

    const newEntry = {
      jobSheetNo,
      customerName: 'Customer',
      customerPhone: custPhone,
      customerAddress: 'N/A',
      product: productType,
      desc: problemDesc,
      status: 'Pending',
      date: day + '/' + month + '/' + now.getFullYear() + ' ' + hours + ':' + minutes,
      staffName: 'Not Assigned Yet',
      staffPhone: '-',
      location: 'Online Booking',
      photoURL: '',
      sectionPressure: '-',
      roomTemp: '-',
      voltage: '-',
      ampere: '-',
      stabilizer: '-',
      selectedItems: []
    };

    setJobSheets([newEntry, ...jobSheets]);
    setProblemDesc('');
    alert('शिकायत दर्ज हो गई!\nआपका जॉब शीट/कंप्लेंट नंबर है:\n' + jobSheetNo);
  };

  const handleStaffLogin = (e) => {
    e.preventDefault();
    if (!staffName.trim()) {
      alert('कृपया अपना नाम दर्ज करें!');
      return;
    }
    if (staffPin === '1234' || staffPin.length === 4) {
      setStaffLoggedIn(true);
    } else {
      alert('गलत पिन! कृपया सही 4-अंकों का पिन दर्ज करें।');
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const compressedBlob = await compressImage(selectedFile);
    const compressedFile = new File([compressedBlob], selectedFile.name, {
      type: 'image/jpeg',
    });

    setImageFile(compressedFile);
  };

  const handleJobSubmit = () => {
    if (!jobCustName || !jobCustPhone) {
      alert('कृपया कस्टमर का नाम और मोबाइल नंबर भरें!');
      return;
    }

    setUploading(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lng = position.coords.longitude.toFixed(4);
          const locationStr = 'Lat: ' + lat + ', Lng: ' + lng + ' (Prayagraj)';
          await processAndSaveJob(locationStr);
        },
        async () => {
          await processAndSaveJob('Prayagraj (Location default)');
        }
      );
    } else {
      processAndSaveJob('Prayagraj');
    }
  };

  const processAndSaveJob = async (locationStr) => {
    let uploadedImageUrl = '';
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    // बिना बैक-टिक के स्ट्रिंग कंस्ट्रक्शन
    const jobSheetNo = 'JS' + jobCustPhone.slice(-4) + day + month + hours + minutes;

    try {
      if (imageFile) {
        const storageRef = ref(storage, 'job_photos/' + Date.now() + '_' + imageFile.name);
        const uploadTask = uploadBytesResumable(storageRef, imageFile);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => reject(error),
            () => {
              getDownloadURL(uploadTask.snapshot.ref).then((url) => {
                uploadedImageUrl = url;
                resolve();
              });
            }
          );
        });
      }

      const newJobRecord = {
        jobSheetNo,
        customerName: jobCustName,
        customerPhone: jobCustPhone,
        customerAddress: jobCustAddress,
        product: modelNo || 'Split/Window AC',
        desc: workDone || 'General Service / Repair',
        status: 'Completed',
        date: day + '/' + month + '/' + now.getFullYear() + ' ' + hours + ':' + minutes,
        staffName: staffName,
        staffPhone: staffPhone,
        location: locationStr,
        photoURL: uploadedImageUrl,
        sectionPressure,
        roomTemp,
        voltage,
        ampere,
        stabilizer,
        selectedItems
      };

      setJobSheets([newJobRecord, ...jobSheets]);
      setUploading(false);
      alert('जॉब शीट सफलतापूर्वक सेव हो गई!\nजॉब शीट नंबर: ' + jobSheetNo);
      
      setJobCustName('');
      setJobCustAddress('');
      setJobCustPhone('');
      setModelNo('');
      setWorkDone('');
      setSectionPressure('');
      setRoomTemp('');
      setAmpere('');
      setImageFile(null);
      setSelectedItems([]);

    } catch (error) {
      console.error("Upload error:", error);
      setUploading(false);
      alert('जॉब सबमिट करने में कुछ गड़बड़ी हुई!');
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto', padding: '15px', background: '#f4f6f9', minHeight: '100vh' }}>
      <h2 style={{ textAlign: 'center', color: '#1a365d' }}>Manqube Field Service Management</h2>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', background: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <button onClick={() => setActiveTab('customer')} style={{ padding: '10px 15px', background: activeTab === 'customer' ? '#007bff' : '#eee', color: activeTab === 'customer' ? '#fff' : '#333', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>कस्टमर (Customer)</button>
        <button onClick={() => setActiveTab('staff')} style={{ padding: '10px 15px', background: activeTab === 'staff' ? '#28a745' : '#eee', color: activeTab === 'staff' ? '#fff' : '#333', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>फ़ील्ड स्टाफ (Staff)</button>
        <button onClick={() => setActiveTab('admin')} style={{ padding: '10px 15px', background: activeTab === 'admin' ? '#ffc107' : '#eee', color: '#333', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>एडमिन (Admin)</button>
      </div>

      {activeTab === 'customer' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          {!custLoggedIn ? (
            <form onSubmit={handleCustomerLogin}>
              <h3>कस्टमर पोर्टल</h3>
              <p>अपनी शिकायतें और पूरी हुई जॉब-शीट देखने के लिए अपना मोबाइल नंबर दर्ज करें:</p>
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

              <h5>नई शिकायत दर्ज करें</h5>
              <form onSubmit={handleNewComplaint}>
                <div style={{ marginBottom: '10px' }}>
                  <label>समस्या का प्रकार / प्रोडक्ट:</label><br />
                  <select value={productType} onChange={(e) => setProductType(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="Split AC">Split AC / Window AC</option>
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

              <h5 style={{ marginTop: '25px' }}>आपकी जॉब-शीट्स और कंप्लेंट हिस्ट्री</h5>
              {jobSheets.filter(item => item.customerPhone === custPhone).length === 0 ? (
                <p style={{ color: '#777' }}>आपके इस नंबर पर अभी कोई जॉब-शीट या शिकायत दर्ज नहीं है।</p>
              ) : (
                jobSheets
                  .filter(item => item.customerPhone === custPhone)
                  .map((item, index) => (
                    <div key={index} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', marginBottom: '12px', borderLeft: '4px solid #007bff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#1a365d' }}><b>जॉब शीट / कंप्लेंट नंबर:</b> {item.jobSheetNo}</p>
                      <p style={{ margin: '0 0 5px 0' }}><b>विवरण/प्रोडक्ट:</b> {item.product} - {item.desc}</p>
                      <p style={{ margin: '0 0 5px 0', fontSize: '13px' }}><b>स्थिति:</b> <span style={{ color: item.status === 'Pending' ? 'orange' : 'green', fontWeight: 'bold' }}>{item.status}</span></p>
                      
                      {item.status === 'Completed' && (
                        <div style={{ background: '#e2e8f0', padding: '8px', borderRadius: '4px', marginTop: '6px', fontSize: '12px' }}>
                          <p style={{ margin: '0 0 2px 0' }}>🌡️ <b>Room Temp:</b> {item.roomTemp} | 🔵 <b>Pressure:</b> {item.sectionPressure}</p>
                          <p style={{ margin: '0 0 2px 0' }}>⚡ <b>Voltage:</b> {item.voltage} | 🔌 <b>Ampere:</b> {item.ampere} | 🛡️ <b>Stabilizer:</b> {item.stabilizer}</p>
                          {item.selectedItems && item.selectedItems.length > 0 && (
                            <p style={{ margin: '2px 0 0 0' }}>📦 <b>पार्ट्स/मटेरियल:</b> {item.selectedItems.join(', ')}</p>
                          )}
                        </div>
                      )}

                      <div style={{ background: '#e9ecef', padding: '8px', borderRadius: '4px', marginTop: '8px', fontSize: '13px' }}>
                        <p style={{ margin: '0 0 3px 0' }}>🛠️ <b>अटेंड करने वाला स्टाफ:</b> {item.staffName} (Ph: {item.staffPhone})</p>
                        <p style={{ margin: '0' }}>📍 <b>साइट लोकेशन:</b> {item.location}</p>
                      </div>

                      {item.photoURL && (
                        <div style={{ marginTop: '10px' }}>
                          <p style={{ fontSize: '12px', margin: '0 0 3px 0', fontWeight: 'bold' }}>साइट की फोटो:</p>
                          <img src={item.photoURL} alt="Site" style={{ width: '120px', borderRadius: '4px' }} />
                        </div>
                      )}
                      <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>दिनांक: {item.date}</p>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'staff' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          {!staffLoggedIn ? (
            <form onSubmit={handleStaffLogin}>
              <h3>स्टाफ लॉगिन (Staff Authentication)</h3>
              <p>जॉब शीट भरने के लिए अपना नाम, मोबाइल नंबर और पिन दर्ज करें:</p>
              <input type="text" placeholder="आपका नाम (जैसे: सकील / हम्माद)" value={staffName} onChange={(e) => setStaffName(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc' }} required />
              <input type="tel" placeholder="स्टाफ मोबाइल नंबर" value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc' }} required />
              <input type="password" maxLength="4" placeholder="4-Digit PIN (डिफ़ॉल्ट: 1234)" value={staffPin} onChange={(e) => setStaffPin(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc' }} required />
              <button type="submit" style={{ width: '100%', padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>लॉग इन करें</button>
            </form>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>स्टाफ: {staffName} ({staffPhone})</h4>
                <button onClick={() => setStaffLoggedIn(false)} style={{ padding: '5px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>लॉग आउट</button>
              </div>
              <hr style={{ margin: '15px 0' }} />

              <h5>डिजिटल जॉब शीट भरें (लोकेशन ऑटो-कैप्चर होगी)</h5>
              
              <div style={{ marginBottom: '10px' }}>
                <label>कस्टमर का नाम:</label>
                <input type="text" placeholder="ग्राहक का नाम" value={jobCustName} onChange={(e) => setJobCustName(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label>कस्टमर का मोबाइल नंबर (मुख्य पहचान):</label>
                <input type="tel" placeholder="मोबाइल नंबर" value={jobCustPhone} onChange={(e) => setJobCustPhone(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label>पता (Address):</label>
                <input type="text" placeholder="ग्राहक का पता" value={jobCustAddress} onChange={(e) => setJobCustAddress(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label>मॉडल / ब्रांड (Model No):</label>
                <input type="text" placeholder="जैसे Voltas / Samsung" value={modelNo} onChange={(e) => setModelNo(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label>Section Pressure:</label>
                  <input type="text" placeholder="जैसे 65" value={sectionPressure} onChange={(e) => setSectionPressure(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Room Temp:</label>
                  <input type="text" placeholder="जैसे 24°C" value={roomTemp} onChange={(e) => setRoomTemp(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
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
                  <option value="OK">OK</option>
                  <option value="High/Low Cut">High/Low Cut</option>
                  <option value="Not Available">Not Available</option>
                </select>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label>Work Done (किया गया काम):</label>
                <input type="text" placeholder="जैसे A.C. Installation / Repair" value={workDone} onChange={(e) => setWorkDone(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label>मटेरियल / पार्ट्स (Quick Select):</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '5px' }}>
                  {['Copper Pipe', 'Drain Pipe', 'Stand', 'Capacitor', 'Gas Charging'].map((item) => (
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

              <div style={{ marginBottom: '15px', background: '#e9ecef', padding: '10px', borderRadius: '6px' }}>
                <label style={{ fontWeight: 'bold' }}>साइट की फोटो जोड़ें:</label><br />
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ marginTop: '5px' }} />
                {imageFile && <p style={{ fontSize: '12px', color: 'green', margin: '5px 0 0 0' }}>फोटो चुनी गई है!</p>}
              </div>

              <button onClick={handleJobSubmit} disabled={uploading} style={{ width: '100%', padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                {uploading ? "लोकेशन और डेटा सेव हो रहा है..." : "जॉब शीट सबमिट करें"}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'admin' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>एडमिन पैनल (All Records)</h3>
          <p>कुल दर्ज जॉब-शीट्स / शिकायतें: <b>{jobSheets.length}</b></p>
          <hr />
          {jobSheets.length === 0 ? (
            <p style={{ color: '#777' }}>अभी तक कोई रिकॉर्ड नहीं है।</p>
          ) : (
            jobSheets.map((item, index) => (
              <div key={index} style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '10px', borderLeft: '4px solid #ffc107' }}>
                <p style={{ margin: '0 0 5px 0' }}><b>जॉब शीट नं:</b> {item.jobSheetNo} | <b>ग्राहक:</b> {item.customerName} ({item.customerPhone})</p>
                <p style={{ margin: '0 0 5px 0' }}><b>काम:</b> {item.product} - {item.desc}</p>
                <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#333' }}>👤 <b>स्टाफ:</b> {item.staffName} ({item.staffPhone}) | 📍 <b>लोकेशन:</b> {item.location}</p>
                <p style={{ margin: '0', fontSize: '11px', color: '#888' }}>दिनांक: {item.date}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}