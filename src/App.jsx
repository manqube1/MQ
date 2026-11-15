import React, { useState, useRef } from 'react';
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
  const [activeTab, setActiveTab] = useState('home');
  const [jobSheets, setJobSheets] = useState([]);

  const [custPhone, setCustPhone] = useState('');
  const [custLoggedIn, setCustLoggedIn] = useState(false);

  const [categoryType, setCategoryType] = useState('HVAC & Refrigeration');
  const [productType, setProductType] = useState('Split / Window AC');
  const [problemDesc, setProblemDesc] = useState('');

  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [staffLoggedIn, setStaffLoggedIn] = useState(false);

  const [jobCustName, setJobCustName] = useState('');
  const [jobCustAddress, setJobCustAddress] = useState('');
  const [jobCustPhone, setJobCustPhone] = useState('');
  
  const [indoorModel, setIndoorModel] = useState('');
  const [indoorSerial, setIndoorSerial] = useState('');
  const [outdoorModel, setOutdoorModel] = useState('');
  const [outdoorSerial, setOutdoorSerial] = useState('');
  const [motorType, setMotorType] = useState('AC');
  const [compressorModel, setCompressorModel] = useState('');
  const [compressorSerial, setCompressorSerial] = useState('');
  const [sectionPressure, setSectionPressure] = useState('');
  const [roomTemp, setRoomTemp] = useState('');
  const [voltage, setVoltage] = useState('230V');
  const [ampere, setAmpere] = useState('');
  const [stabilizer, setStabilizer] = useState('OK');
  const [standType, setStandType] = useState('Wall Type');

  const [workDone, setWorkDone] = useState('');
  
  const [materials, setMaterials] = useState([
    { name: '', qty: '', price: '' },
    { name: '', qty: '', price: '' }
  ]);

  const [jobNote, setJobNote] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleCustomerLogin = (e) => {
    e.preventDefault();
    if (custPhone.length < 10) {
      alert('कृपया सही मोबाइल नंबर दर्ज करें!');
      return;
    }
    setCustLoggedIn(true);
  };

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setCategoryType(cat);
    if (cat === 'HVAC & Refrigeration') setProductType('Split / Window AC');
    else if (cat === 'Electrical Work') setProductType('House Wiring & Panel');
    else if (cat === 'Civil Work') setProductType('Flooring & Tiling');
  };

  const handleNewComplaint = (e) => {
    e.preventDefault();
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const jobSheetNo = 'COMP' + custPhone + day + month + hours + minutes;

    const newEntry = {
      jobSheetNo,
      customerName: 'Customer',
      customerPhone: custPhone,
      customerAddress: 'N/A',
      product: "[" + categoryType + "] " + productType,
      desc: problemDesc,
      status: 'Pending',
      date: day + '/' + month + '/' + now.getFullYear() + ' ' + hours + ':' + minutes,
      staffName: 'Not Assigned Yet',
      staffPhone: '-',
      location: 'Online Booking',
      photoURL: '',
      signatureURL: '',
      categoryType,
      productType,
      indoorModel: '-',
      indoorSerial: '-',
      outdoorModel: '-',
      outdoorSerial: '-',
      motorType: '-',
      compressorModel: '-',
      compressorSerial: '-',
      sectionPressure: '-',
      roomTemp: '-',
      voltage: '-',
      ampere: '-',
      stabilizer: '-',
      standType: '-',
      materials: [],
      note: '-',
      feedback: '-'
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

  const handleMaterialFieldChange = (index, field, value) => {
    const newMaterials = [...materials];
    newMaterials[index][field] = value;
    setMaterials(newMaterials);

    if (index === newMaterials.length - 1 && value.trim() !== '') {
      setMaterials([...newMaterials, { name: '', qty: '', price: '' }]);
    }
  };

  const handleJobSubmit = () => {
    if (!jobCustName || !jobCustPhone) {
      alert('कृपया कस्टमर का नाम और मोबाइल नंबर भरें!');
      return;
    }

    setUploading(true);

    const canvas = canvasRef.current;
    const signatureDataURL = canvas.toDataURL('image/png');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lng = position.coords.longitude.toFixed(4);
          const locationStr = 'Lat: ' + lat + ', Lng: ' + lng + ' (Prayagraj)';
          await processAndSaveJob(locationStr, signatureDataURL);
        },
        async () => {
          await processAndSaveJob('Prayagraj (GPS Default)', signatureDataURL);
        }
      );
    } else {
      processAndSaveJob('Prayagraj (No GPS)', signatureDataURL);
    }
  };

  const processAndSaveJob = async (locationStr, signatureDataURL) => {
    let uploadedImageUrl = '';
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

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

      const filteredMaterials = materials.filter(m => m.name.trim() !== '');

      const newJobRecord = {
        jobSheetNo,
        customerName: jobCustName,
        customerPhone: jobCustPhone,
        customerAddress: jobCustAddress,
        categoryType,
        productType,
        product: "[" + categoryType + "] " + productType,
        desc: workDone || 'General Service / Repair',
        status: 'Completed',
        date: day + '/' + month + '/' + now.getFullYear() + ' ' + hours + ':' + minutes,
        staffName: staffName,
        staffPhone: staffPhone,
        location: locationStr,
        photoURL: uploadedImageUrl,
        signatureURL: signatureDataURL,
        indoorModel: indoorModel || '-',
        indoorSerial: indoorSerial || '-',
        outdoorModel: outdoorModel || '-',
        outdoorSerial: outdoorSerial || '-',
        motorType: motorType,
        compressorModel: compressorModel || '-',
        compressorSerial: compressorSerial || '-',
        sectionPressure: categoryType === 'HVAC & Refrigeration' ? sectionPressure : '-',
        roomTemp: categoryType === 'HVAC & Refrigeration' ? roomTemp : '-',
        voltage: categoryType !== 'Civil Work' ? voltage : '-',
        ampere: categoryType !== 'Civil Work' ? ampere : '-',
        stabilizer: categoryType === 'HVAC & Refrigeration' ? stabilizer : '-',
        standType: categoryType === 'HVAC & Refrigeration' ? standType : '-',
        materials: filteredMaterials,
        note: jobNote || '-',
        feedback: customerFeedback || 'Good Service'
      };

      setJobSheets([newJobRecord, ...jobSheets]);
      setUploading(false);
      alert('जॉब शीट सफलतापूर्वक सेव हो गई!\nजॉब शीट नंबर: ' + jobSheetNo);
      
      setJobCustName('');
      setJobCustAddress('');
      setJobCustPhone('');
      setIndoorModel('');
      setIndoorSerial('');
      setOutdoorModel('');
      setOutdoorSerial('');
      setCompressorModel('');
      setCompressorSerial('');
      setWorkDone('');
      setSectionPressure('');
      setRoomTemp('');
      setAmpere('');
      setJobNote('');
      setCustomerFeedback('');
      setImageFile(null);
      setMaterials([{ name: '', qty: '', price: '' }, { name: '', qty: '', price: '' }]);
      clearSignature();

    } catch (error) {
      console.error("Upload error:", error);
      setUploading(false);
      alert('जॉब सबमिट करने में कुछ गड़बड़ी हुई!');
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto', padding: '15px', background: '#f4f6f9', minHeight: '100vh' }}>
      <h2 style={{ textAlign: 'center', color: '#1a365d', marginBottom: '5px' }}>Manqube Field Service Management</h2>
      <p style={{ textAlign: 'center', color: '#666', fontSize: '13px', marginTop: '0', marginBottom: '20px' }}>Hindustan Refrigeration Service</p>

      {activeTab === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <h3 style={{ color: '#333' }}>पोर्टल चुनें (Select Portal)</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>कृपया आगे बढ़ने के लिए अपना संबंधित पोर्टल चुनें:</p>
          </div>

          <div onClick={() => setActiveTab('customer')} style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '6px solid #007bff' }}>
            <div style={{ fontSize: '35px' }}>👤</div>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#007bff' }}>कस्टमर पोर्टल (Customer Portal)</h3>
              <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>अपनी शिकायत दर्ज करें और पुरानी जॉब-शीट्स देखें</p>
            </div>
          </div>

          <div onClick={() => setActiveTab('staff')} style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '6px solid #28a745' }}>
            <div style={{ fontSize: '35px' }}>🛠️</div>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#28a745' }}>फ़ील्ड स्टाफ पोर्टल (Staff Portal)</h3>
              <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>डिजिटल जॉब शीट भरें, सिग्नेचर और GPS लोकेशन कैप्चर करें</p>
            </div>
          </div>

          <div onClick={() => setActiveTab('admin')} style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '6px solid #ffc107' }}>
            <div style={{ fontSize: '35px' }}>📊</div>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#d39e00' }}>एडमिन पैनल (Admin Panel)</h3>
              <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>सभी रिकॉर्ड और कुल जॉब-शीट्स की सूची देखें</p>
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'home' && (
        <div style={{ marginBottom: '15px' }}>
          <button onClick={() => setActiveTab('home')} style={{ padding: '8px 14px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            ⬅️ मुख्य मेनू (Home) पर वापस जाएं
          </button>
        </div>
      )}

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
                  <label>मुख्य श्रेणी (Category):</label><br />
                  <select value={categoryType} onChange={handleCategoryChange} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="HVAC & Refrigeration">HVAC & Refrigeration (एसी, कूलर, फ्रिज आदि)</option>
                    <option value="Electrical Work">Electrical Work (वायरिंग, फैन, लाइट आदि)</option>
                    <option value="Civil Work">Civil Work (सिविल और निर्माण कार्य)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label>संबंधित प्रोडक्ट / कार्य (Sub-Option):</label><br />
                  <select value={productType} onChange={(e) => setProductType(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    {categoryType === 'HVAC & Refrigeration' && (
                      <>
                        <option value="Split / Window AC">Split / Window AC</option>
                        <option value="Ductable AC">Ductable AC</option>
                        <option value="VRV / VRF AC">VRV / VRF AC</option>
                        <option value="Cassette AC">Cassette AC</option>
                        <option value="Tower AC">Tower AC</option>
                        <option value="Air Cooler">Air Cooler (डेजर्ट कूलर)</option>
                        <option value="Room Cooler">Room Cooler</option>
                        <option value="Fridge">Fridge (फ्रिज)</option>
                        <option value="Deep Freezer">Deep Freezer</option>
                        <option value="Stabilizer">Stabilizer (स्टेबलाइजर)</option>
                      </>
                    )}
                    {categoryType === 'Electrical Work' && (
                      <>
                        <option value="House Wiring & Panel">House Wiring & Main Panel</option>
                        <option value="Fan & Light">Fan & Light Installation/Repair</option>
                        <option value="Exhaust Fan">Exhaust Fan</option>
                        <option value="Fresh Air Fan">Fresh Air Fan</option>
                        <option value="Earthing Work">Earthing Work</option>
                      </>
                    )}
                    {categoryType === 'Civil Work' && (
                      <>
                        <option value="Flooring & Tiling">Flooring & Tiling Work</option>
                        <option value="Masonry & Plaster">Masonry & Plaster Work</option>
                        <option value="Waterproofing">Waterproofing</option>
                        <option value="Minor Repairs / Painting">Minor Repairs & Painting</option>
                      </>
                    )}
                  </select>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label>समस्या का विवरण (Problem Description):</label><br />
                  <textarea value={problemDesc} onChange={(e) => setProblemDesc(e.target.value)} rows="3" placeholder="समस्या क्या आ रही है विस्तार से लिखें..." style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} required />
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
                          {item.categoryType === 'HVAC & Refrigeration' && (
                            <>
                              <p style={{ margin: '0 0 2px 0' }}>🏠 <b>Indoor Model:</b> {item.indoorModel} | <b>Serial:</b> {item.indoorSerial}</p>
                              <p style={{ margin: '0 0 2px 0' }}>☀️ <b>Outdoor Model:</b> {item.outdoorModel} | <b>Serial:</b> {item.outdoorSerial}</p>
                              <p style={{ margin: '0 0 2px 0' }}>⚡ <b>Motor Type:</b> {item.motorType} | 🌀 <b>Compressor M/S:</b> {item.compressorModel} / {item.compressorSerial}</p>
                              <p style={{ margin: '0 0 2px 0' }}>🌡️ <b>Room Temp:</b> {item.roomTemp} | 🔵 <b>Pressure:</b> {item.sectionPressure}</p>
                              <p style={{ margin: '0 0 2px 0' }}>⚡ <b>Voltage:</b> {item.voltage} | 🔌 <b>Ampere:</b> {item.ampere} | 🛡️ <b>Stabilizer:</b> {item.stabilizer} | 📐 <b>Stand:</b> {item.standType}</p>
                            </>
                          )}
                          {item.categoryType === 'Electrical Work' && (
                            <>
                              <p style={{ margin: '0 0 2px 0' }}>⚡ <b>Voltage:</b> {item.voltage} | 🔌 <b>Ampere:</b> {item.ampere}</p>
                            </>
                          )}
                          
                          {item.materials && item.materials.length > 0 && (
                            <div style={{ marginTop: '4px', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                              <p style={{ margin: '0 0 2px 0', fontWeight: 'bold' }}>📦 <b>मटेरियल इस्तेमाल:</b></p>
                              {item.materials.map((m, idx) => (
                                <p key={idx} style={{ margin: '0 0 2px 10px' }}>• {m.name} | मात्रा: {m.qty} | दाम: ₹{m.price}</p>
                              ))}
                            </div>
                          )}

                          <p style={{ margin: '4px 0 2px 0' }}>📝 <b>नोट:</b> {item.note}</p>
                          <p style={{ margin: '2px 0 0 0' }}>💬 <b>कस्टमर फीडबैक:</b> {item.feedback}</p>
                        </div>
                      )}

                      <div style={{ background: '#e9ecef', padding: '8px', borderRadius: '4px', marginTop: '8px', fontSize: '13px' }}>
                        <p style={{ margin: '0 0 3px 0' }}>🛠️ <b>स्टाफ:</b> {item.staffName} (Ph: {item.staffPhone})</p>
                        <p style={{ margin: '0' }}>📍 <b>GPS लोकेशन:</b> {item.location}</p>
                      </div>

                      <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                        {item.photoURL && (
                          <div>
                            <p style={{ fontSize: '11px', margin: '0 0 3px 0', fontWeight: 'bold' }}>साइट फोटो:</p>
                            <img src={item.photoURL} alt="Site" style={{ width: '100px', borderRadius: '4px' }} />
                          </div>
                        )}
                        {item.signatureURL && (
                          <div>
                            <p style={{ fontSize: '11px', margin: '0 0 3px 0', fontWeight: 'bold' }}>कस्टमर सिग्नेचर:</p>
                            <img src={item.signatureURL} alt="Signature" style={{ width: '100px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                          </div>
                        )}
                      </div>
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
              <p>जॉब शीट भरने के लिए अपना पूरा नाम, मोबाइल नंबर और पिन दर्ज करें:</p>
              <input type="text" placeholder="आपका पूरा नाम (जैसे: राहुल कुमार)" value={staffName} onChange={(e) => setStaffName(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc' }} required />
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

              <h5>डिजिटल जॉब शीट भरें (GPS लोकेशन ऑटो-कैप्चर होगी)</h5>
              
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
                <label>मुख्य श्रेणी (Category):</label><br />
                <select value={categoryType} onChange={handleCategoryChange} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="HVAC & Refrigeration">HVAC & Refrigeration (एसी, कूलर, फ्रिज आदि)</option>
                  <option value="Electrical Work">Electrical Work (वायरिंग, फैन, लाइट आदि)</option>
                  <option value="Civil Work">Civil Work (सिविल और निर्माण कार्य)</option>
                </select>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label>संबंधित प्रोडक्ट / कार्य (Sub-Option):</label><br />
                <select value={productType} onChange={(e) => setProductType(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  {categoryType === 'HVAC & Refrigeration' && (
                    <>
                      <option value="Split / Window AC">Split / Window AC</option>
                      <option value="Ductable AC">Ductable AC</option>
                      <option value="VRV / VRF AC">VRV / VRF AC</option>
                      <option value="Cassette AC">Cassette AC</option>
                      <option value="Tower AC">Tower AC</option>
                      <option value="Air Cooler">Air Cooler</option>
                      <option value="Room Cooler">Room Cooler</option>
                      <option value="Fridge">Fridge</option>
                      <option value="Deep Freezer">Deep Freezer</option>
                      <option value="Stabilizer">Stabilizer</option>
                    </>
                  )}
                  {categoryType === 'Electrical Work' && (
                    <>
                      <option value="House Wiring & Panel">House Wiring & Main Panel</option>
                      <option value="Fan & Light">Fan & Light</option>
                      <option value="Exhaust Fan">Exhaust Fan</option>
                      <option value="Fresh Air Fan">Fresh Air Fan</option>
                      <option value="Earthing Work">Earthing Work</option>
                    </>
                  )}
                  {categoryType === 'Civil Work' && (
                    <>
                      <option value="Flooring & Tiling">Flooring & Tiling</option>
                      <option value="Masonry & Plaster">Masonry & Plaster</option>
                      <option value="Waterproofing">Waterproofing</option>
                      <option value="Minor Repairs / Painting">Minor Repairs & Painting</option>
                    </>
                  )}
                </select>
              </div>

              {categoryType === 'HVAC & Refrigeration' && (
                <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#1a365d', fontSize: '13px' }}>HVAC यूनिट विवरण:</p>
                  
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Indoor Model No:</label>
                      <input type="text" placeholder="इंडोर मॉडल" value={indoorModel} onChange={(e) => setIndoorModel(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '3px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Indoor Serial No:</label>
                      <input type="text" placeholder="इंडोर सीरियल नंबर" value={indoorSerial} onChange={(e) => setIndoorSerial(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '3px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Outdoor Model No:</label>
                      <input type="text" placeholder="आउटडोर मॉडल" value={outdoorModel} onChange={(e) => setOutdoorModel(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '3px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Outdoor Serial No:</label>
                      <input type="text" placeholder="आउटडोर सीरियल नंबर" value={outdoorSerial} onChange={(e) => setOutdoorSerial(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '3px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Motor Type:</label>
                      <select value={motorType} onChange={(e) => setMotorType(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '3px', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <option value="AC">AC Motor</option>
                        <option value="DC">DC Motor</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Compressor Model:</label>
                      <input type="text" placeholder="कंप्रेसर मॉडल" value={compressorModel} onChange={(e) => setCompressorModel(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '3px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px' }}>Compressor Serial No:</label>
                    <input type="text" placeholder="कंप्रेसर सीरियल नंबर" value={compressorSerial} onChange={(e) => setCompressorSerial(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '3px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Section Pressure:</label>
                      <input type="text" placeholder="जैसे 65" value={sectionPressure} onChange={(e) => setSectionPressure(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '3px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Room Temp:</label>
                      <input type="text" placeholder="जैसे 24°C" value={roomTemp} onChange={(e) => setRoomTemp(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '3px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Stabilizer Status:</label>
                      <select value={stabilizer} onChange={(e) => setStabilizer(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '3px', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <option value="OK">OK</option>
                        <option value="High/Low Cut">High/Low Cut</option>
                        <option value="Not Available">Not Available</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Stand Type:</label>
                      <select value={standType} onChange={(e) => setStandType(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '3px', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <option value="Wall Type">Wall Type</option>
                        <option value="Floor Type">Floor Type</option>
                        <option value="MS Stand">MS Stand</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {categoryType !== 'Civil Work' && (
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
              )}

              <div style={{ marginBottom: '10px' }}>
                <label>Work Done (किया गया काम का विवरण):</label>
                <input type="text" placeholder="जैसे Installation / Repair / Wiring Done" value={workDone} onChange={(e) => setWorkDone(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold' }}>मटेरियल / पार्ट्स इस्तेमाल (Materials Used):</label>
                <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {materials.map((mat, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold', width: '20px', color: '#555' }}>{index + 1}.</span>
                      <input 
                        type="text" 
                        placeholder="सामान का नाम" 
                        value={mat.name} 
                        onChange={(e) => handleMaterialFieldChange(index, 'name', e.target.value)} 
                        style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                      />
                      <input 
                        type="text" 
                        placeholder="मात्रा (Qty)" 
                        value={mat.qty} 
                        onChange={(e) => handleMaterialFieldChange(index, 'qty', e.target.value)} 
                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                      />
                      <input 
                        type="text" 
                        placeholder="दाम (₹)" 
                        value={mat.price} 
                        onChange={(e) => handleMaterialFieldChange(index, 'price', e.target.value)} 
                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label>विशेष नोट (Note):</label>
                <input type="text" placeholder="कोई अतिरिक्त जानकारी या निर्देश..." value={jobNote} onChange={(e) => setJobNote(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label>कस्टमर फीडबैक (Customer Feedback):</label>
                <input type="text" placeholder="ग्राहक की प्रतिक्रिया लिखें..." value={customerFeedback} onChange={(e) => setCustomerFeedback(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ marginBottom: '15px', background: '#e9ecef', padding: '10px', borderRadius: '6px' }}>
                <label style={{ fontWeight: 'bold' }}>साइट की फोटो जोड़ें:</label><br />
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ marginTop: '5px' }} />
                {imageFile && <p style={{ fontSize: '12px', color: 'green', margin: '5px 0 0 0' }}>फोटो चुनी गई है!</p>}
              </div>

              <div style={{ marginBottom: '15px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontWeight: 'bold' }}>कस्टमर सिग्नेचर (Customer Signature):</label>
                  <button type="button" onClick={clearSignature} style={{ padding: '3px 8px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>रीसेट (Clear)</button>
                </div>
                <p style={{ fontSize: '11px', color: '#666', margin: '0 0 5px 0' }}>नीचे दिए गए बॉक्स पर उंगली या माउस से साइन करें:</p>
                <canvas 
                  ref={canvasRef} 
                  width={320} 
                  height={130} 
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ border: '1px dashed #007bff', background: '#fafafa', borderRadius: '4px', cursor: 'crosshair', width: '100%', touchAction: 'none' }}
                />
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
                <p style={{ margin: '0 0 5px 0' }}><b>कार्य/प्रोडक्ट:</b> {item.product} | <b>विवरण:</b> {item.desc}</p>
                
                {item.categoryType === 'HVAC & Refrigeration' && (
                  <>
                    <p style={{ margin: '0 0 5px 0', fontSize: '13px' }}>🏠 <b>Indoor:</b> {item.indoorModel} ({item.indoorSerial}) | ☀️ <b>Outdoor:</b> {item.outdoorModel} ({item.outdoorSerial})</p>
                    <p style={{ margin: '0 0 5px 0', fontSize: '13px' }}>⚡ <b>Motor:</b> {item.motorType} | 🌀 <b>Compressor:</b> {item.compressorModel} ({item.compressorSerial})</p>
                    <p style={{ margin: '0 0 5px 0', fontSize: '13px' }}>📐 <b>स्टैंड:</b> {item.standType} | 🛡️ <b>स्टेबलाइजर:</b> {item.stabilizer}</p>
                  </>
                )}
                
                {item.materials && item.materials.length > 0 && (
                  <div style={{ margin: '5px 0', fontSize: '13px', background: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 2px 0', fontWeight: 'bold' }}>📦 <b>मटेरियल इस्तेमाल:</b></p>
                    {item.materials.map((m, idx) => (
                      <p key={idx} style={{ margin: '0 0 2px 10px' }}>• {m.name} (मात्रा: {m.qty}, दाम: ₹{m.price})</p>
                    ))}
                  </div>
                )}

                <p style={{ margin: '0 0 5px 0', fontSize: '13px' }}>📝 <b>नोट:</b> {item.note}</p>
                <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#333' }}>👤 <b>स्टाफ:</b> {item.staffName} | 📍 <b>GPS लोकेशन:</b> {item.location}</p>
                <p style={{ margin: '0 0 5px 0', fontSize: '13px' }}>💬 <b>फीडबैक:</b> {item.feedback}</p>
                
                <div style={{ display: 'flex', gap: '15px', marginTop: '8px' }}>
                  {item.photoURL && <img src={item.photoURL} alt="Site" style={{ width: '80px', borderRadius: '4px' }} />}
                  {item.signatureURL && <img src={item.signatureURL} alt="Sign" style={{ width: '80px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />}
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#888' }}>दिनांक: {item.date}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}