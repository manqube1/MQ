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

  // Customer Portal State
  const [custPhone, setCustPhone] = useState('');
  const [custLoggedIn, setCustLoggedIn] = useState(false);
  const [categoryType, setCategoryType] = useState('HVAC & Refrigeration');
  const [productType, setProductType] = useState('Split / Window AC');
  const [problemDesc, setProblemDesc] = useState('');

  // Staff Portal State
  const [staffPhoneInput, setStaffPhoneInput] = useState('');
  const [otpStep, setOtpStep] = useState(1);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [staffLoggedIn, setStaffLoggedIn] = useState(false);
  const [currentStaffName, setCurrentStaffName] = useState('');
  const [staffGpsLocation, setStaffGpsLocation] = useState('Fetching GPS...');
  
  // Staff Sub-tabs: 'menu' (3 options main screen), 'new', 'pending', 'partPending'
  const [staffSubTab, setStaffSubTab] = useState('menu');
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Admin / Office Staff Login State
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);

  // Job Submission Form State
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
  const [jobStatusType, setJobStatusType] = useState('Completed');
  
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
    if (!canvas) return;
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
    if (!canvas) return;
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
    if (!canvas) return;
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
      customerAddress: 'Prayagraj Main Location',
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
    alert('शिकायत सफलतापूर्वक दर्ज हो गई!\nआपका कंप्लेंट नंबर है:\n' + jobSheetNo);
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (staffPhoneInput.length < 10) {
      alert('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें!');
      return;
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otp);
    setOtpStep(2);
    alert('[Manqube Security] आपके मोबाइल नंबर ' + staffPhoneInput + ' के लिए OTP है: ' + otp);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (enteredOtp === generatedOtp) {
      setCurrentStaffName('Staff (' + staffPhoneInput + ')');
      setStaffLoggedIn(true);
      setStaffSubTab('menu'); // Reset to 3 options menu on login
      setOtpStep(1);
      setEnteredOtp('');

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude.toFixed(4);
            const lng = position.coords.longitude.toFixed(4);
            setStaffGpsLocation('Lat: ' + lat + ', Lng: ' + lng + ' (GPS Active)');
          },
          () => {
            setStaffGpsLocation('Prayagraj (GPS Default)');
          }
        );
      } else {
        setStaffGpsLocation('Prayagraj (No GPS Support)');
      }

    } else {
      alert('गलत OTP! कृपया सही OTP दर्ज करें।');
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminUser === 'ADMIN' && adminPass === '123456789') {
      setAdminLoggedIn(true);
      alert('एडमिन लॉगिन सफल!');
    } else {
      alert('गलत यूजरनेम या पासवर्ड!');
    }
  };

  const handleOpenBlankNewJob = () => {
    setSelectedComplaint(null);
    setJobCustName('');
    setJobCustPhone('');
    setJobCustAddress('');
    setWorkDone('');
    setJobNote('');
    setCategoryType('HVAC & Refrigeration');
    setProductType('Split / Window AC');
    setJobStatusType('Completed');
    setStaffSubTab('new');
  };

  const handleFillComplaintToNewJob = (comp) => {
    setSelectedComplaint(comp);
    setJobCustName(comp.customerName || 'Customer');
    setJobCustPhone(comp.customerPhone || '');
    setJobCustAddress(comp.customerAddress || '');
    setCategoryType(comp.categoryType || 'HVAC & Refrigeration');
    setProductType(comp.productType || 'Split / Window AC');
    setWorkDone(comp.desc || '');
    setJobNote(comp.note !== '-' ? comp.note : '');
    setStaffSubTab('new');
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
    const signatureDataURL = canvas ? canvas.toDataURL('image/png') : '';

    const processSave = async (locStr) => {
      let uploadedImageUrl = '';
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      const jobSheetNo = selectedComplaint ? selectedComplaint.jobSheetNo : ('JS' + jobCustPhone.slice(-4) + day + month + hours + minutes);

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

        const updatedRecord = {
          jobSheetNo,
          customerName: jobCustName,
          customerPhone: jobCustPhone,
          customerAddress: jobCustAddress,
          categoryType,
          productType,
          product: "[" + categoryType + "] " + productType,
          desc: workDone || 'General Service / Repair',
          status: jobStatusType,
          date: day + '/' + month + '/' + now.getFullYear() + ' ' + hours + ':' + minutes,
          staffName: currentStaffName,
          staffPhone: staffPhoneInput,
          location: locStr,
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

        const filteredList = jobSheets.filter(j => j.jobSheetNo !== jobSheetNo);
        setJobSheets([updatedRecord, ...filteredList]);

        setUploading(false);
        alert('जॉब शीट सफलतापूर्वक सेव हो गई!\nजॉब शीट नंबर: ' + jobSheetNo);
        
        setSelectedComplaint(null);
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
        setStaffSubTab('menu');

      } catch (error) {
        console.error("Upload error:", error);
        setUploading(false);
        alert('जॉब सबमिट करने में कुछ गड़बड़ी हुई!');
      }
    };

    processSave(staffGpsLocation);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '750px', margin: '0 auto', padding: '15px', background: '#f4f6f9', minHeight: '100vh' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px 0', background: '#fff', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <img 
          src="/1000384854.jpg" 
          alt="Manqube Logo" 
          style={{ height: '70px', width: '70px', objectFit: 'contain', borderRadius: '12px', marginBottom: '8px' }} 
        />
        <h1 style={{ margin: '0', color: '#1a365d', fontSize: '26px', fontWeight: '800', letterSpacing: '1px' }}>MANQUBE</h1>
        <p style={{ margin: '2px 0 0 0', color: '#666', fontSize: '12px', fontWeight: '600' }}>We Build. Your Trust.[span_0](start_span)[span_0](end_span)</p>
        <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '11px' }}>Hindustan Refrigeration Service</p>
      </div>

      {activeTab === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
          <div style={{ textAlign: 'center', marginBottom: '5px' }}>
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
              <h3 style={{ margin: '0 0 5px 0', color: '#28a745' }}>फ़ील्ड स्टाफ पोर्टल (Staff Mobile & GPS Login)</h3>
              <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>मोबाइल नंबर, OTP और GPS लोकेशन के साथ लॉगिन करें</p>
            </div>
          </div>

          <div onClick={() => setActiveTab('admin')} style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '6px solid #ffc107' }}>
            <div style={{ fontSize: '35px' }}>📊</div>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#d39e00' }}>एडमिन & ऑफिस स्टाफ पैनल (Office Login)</h3>
              <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>ऑफिस स्टाफ लॉगिन करके पेंडिंग और पार्ट पेंडिंग जॉब्स देखें</p>
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
                      <p style={{ margin: '0 0 5px 0', fontSize: '13px' }}><b>स्थिति:</b> <span style={{ color: item.status === 'Completed' ? 'green' : (item.status === 'Part Pending' ? '#d97706' : 'orange'), fontWeight: 'bold' }}>{item.status}</span></p>
                      <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>दिनांक: {item.date}</p>
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
            <div>
              <h3>स्टाफ मोबाइल & GPS लॉगिन (Staff Portal)</h3>
              
              {otpStep === 1 ? (
                <form onSubmit={handleSendOtp}>
                  <p>लॉगिन करने के लिए अपना मोबाइल नंबर दर्ज करें (GPS ऑटो-रजिस्टर होगा):</p>
                  <input 
                    type="tel" 
                    maxLength="10" 
                    placeholder="स्टाफ मोबाइल नंबर (10 अंक)" 
                    value={staffPhoneInput} 
                    onChange={(e) => setStaffPhoneInput(e.target.value)} 
                    style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc' }} 
                    required 
                  />
                  <button type="submit" style={{ width: '100%', padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>OTP भेजें</button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <p>नंबर <b>{staffPhoneInput}</b> पर भेजा गया OTP दर्ज करें:</p>
                  <input 
                    type="text" 
                    maxLength="4" 
                    placeholder="4-अंकों का OTP दर्ज करें" 
                    value={enteredOtp} 
                    onChange={(e) => setEnteredOtp(e.target.value)} 
                    style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc' }} 
                    required 
                  />
                  <button type="submit" style={{ width: '100%', padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>OTP वेरीफाई कर लॉगिन करें</button>
                  <button type="button" onClick={() => setOtpStep(1)} style={{ width: '100%', marginTop: '8px', padding: '8px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>नंबर बदलें</button>
                </form>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '10px', borderRadius: '6px' }}>
                <div>
                  <h4 style={{ margin: '0', color: '#1e293b' }}>👤 {currentStaffName}</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#059669' }}>📍 GPS: {staffGpsLocation}</p>
                </div>
                <button onClick={() => setStaffLoggedIn(false)} style={{ padding: '6px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>लॉग आउट</button>
              </div>
              <hr style={{ margin: '15px 0' }} />

              {/* THREE MAIN OPTIONS BAR FOR STAFF UPON LOGIN */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button 
                  onClick={() => setStaffSubTab('new')} 
                  style={{ flex: 1, padding: '12px 5px', background: staffSubTab === 'new' ? '#166534' : '#dcfce7', color: staffSubTab === 'new' ? '#fff' : '#166534', border: '1px solid #bbf7d0', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', textAlign: 'center' }}>
                  🛠️ New Job
                </button>
                <button 
                  onClick={() => setStaffSubTab('pending')} 
                  style={{ flex: 1, padding: '12px 5px', background: staffSubTab === 'pending' ? '#b45309' : '#fef9c3', color: staffSubTab === 'pending' ? '#fff' : '#854d0e', border: '1px solid #fef08a', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', textAlign: 'center' }}>
                  ⏳ Pending Job
                </button>
                <button 
                  onClick={() => setStaffSubTab('partPending')} 
                  style={{ flex: 1, padding: '12px 5px', background: staffSubTab === 'partPending' ? '#c2410c' : '#ffedd5', color: staffSubTab === 'partPending' ? '#fff' : '#9a3412', border: '1px solid #fed7aa', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', textAlign: 'center' }}>
                  ⚙️ Part Pending
                </button>
              </div>

              {/* IF STAFF IS AT MAIN MENU BEFORE CHOOSING NEW JOB */}
              {staffSubTab === 'menu' && (
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ color: '#334155', marginTop: '0' }}>फ़ील्ड स्टाफ डैशबोर्ड</h4>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>ऊपर दिए गए तीन विकल्पों में से किसी एक पर क्लिक करें:</p>
                  <ul style={{ textAlign: 'left', display: 'inline-block', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                    <li><b>New Job:</b> नई जॉब भरें या ऑनलाइन आई कंप्लेंट को प्रोसेस करें।</li>
                    <li><b>Pending Job:</b> लंबित कार्यों की सूची देखें और पूरी करें।</li>
                    <li><b>Part Pending:</b> स्पेयर पार्ट की वजह से रुके हुए कार्यों को मैनेज करें।</li>
                  </ul>
                </div>
              )}

              {/* 1. NEW JOB TAB */}
              {staffSubTab === 'new' && (
                <div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ color: '#166534', marginTop: '0' }}>
                        {selectedComplaint ? 'शिकायत (' + selectedComplaint.jobSheetNo + ') को जॉब शीट में भरें' : 'नई जॉब शीट / सर्विस रिपोर्ट'}
                      </h4>
                      <button onClick={() => setStaffSubTab('menu')} style={{ padding: '4px 8px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>बैक मेनू</button>
                    </div>
                    <p style={{ fontSize: '12px', color: '#4b5563' }}>ऑनलाइन कंप्लेंट होने पर डिटेल्स भरी होंगी, अन्यथा खाली फॉर्म में भरें।</p>

                    <div style={{ marginBottom: '10px' }}>
                      <label>स्टेटस चुनें (Job Status):</label><br />
                      <select value={jobStatusType} onChange={(e) => setJobStatusType(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold', color: jobStatusType === 'Completed' ? 'green' : (jobStatusType === 'Part Pending' ? '#c2410c' : 'orange') }}>
                        <option value="Completed">Completed (काम पूरा हो गया)</option>
                        <option value="Pending">Pending (अभी पेंडिंग है)</option>
                        <option value="Part Pending">Part Pending (स्पेयर पार्ट की वजह से पेंडिंग)</option>
                      </select>
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
                            <option value="Air Cooler">Air Cooler</option>
                            <option value="Fridge">Fridge</option>
                            <option value="Deep Freezer">Deep Freezer</option>
                            <option value="Stabilizer">Stabilizer</option>
                          </>
                        )}
                        {categoryType === 'Electrical Work' && (
                          <>
                            <option value="House Wiring & Panel">House Wiring & Main Panel</option>
                            <option value="Fan & Light">Fan & Light</option>
                            <option value="Earthing Work">Earthing Work</option>
                          </>
                        )}
                        {categoryType === 'Civil Work' && (
                          <>
                            <option value="Flooring & Tiling">Flooring & Tiling</option>
                            <option value="Waterproofing">Waterproofing</option>
                            <option value="Minor Repairs / Painting">Minor Repairs & Painting</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                      <label>कस्टमर का नाम:</label>
                      <input type="text" placeholder="ग्राहक का नाम" value={jobCustName} onChange={(e) => setJobCustName(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                      <label>कस्टमर का मोबाइल नंबर:</label>
                      <input type="tel" placeholder="मोबाइल नंबर" value={jobCustPhone} onChange={(e) => setJobCustPhone(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                      <label>पता (Address):</label>
                      <input type="text" placeholder="ग्राहक का पता" value={jobCustAddress} onChange={(e) => setJobCustAddress(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                      <label>Work Done / समस्या का विवरण:</label>
                      <input type="text" placeholder="किया गया काम या समस्या" value={workDone} onChange={(e) => setWorkDone(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ fontWeight: 'bold' }}>मटेरियल / पार्ट्स इस्तेमाल (Materials Used):</label>
                      <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {materials.map((mat, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 'bold', width: '20px', color: '#555' }}>{index + 1}.</span>
                            <input type="text" placeholder="सामान का नाम" value={mat.name} onChange={(e) => handleMaterialFieldChange(index, 'name', e.target.value)} style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                            <input type="text" placeholder="मात्रा" value={mat.qty} onChange={(e) => handleMaterialFieldChange(index, 'qty', e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                            <input type="text" placeholder="दाम (₹)" value={mat.price} onChange={(e) => handleMaterialFieldChange(index, 'price', e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontWeight: 'bold', color: '#9a3412' }}>विशेष नोट / पेंडेंसी का कारण (Special Note / Spare Part Needed):</label>
                      <input type="text" placeholder="जैसे: Compressor 2 Ton Not Available..." value={jobNote} onChange={(e) => setJobNote(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #f97316', background: '#fff7ed' }} />
                    </div>

                    <div style={{ marginBottom: '15px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <label style={{ fontWeight: 'bold' }}>कस्टमर सिग्नेचर:</label>
                        <button type="button" onClick={clearSignature} style={{ padding: '3px 8px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>रीसेट</button>
                      </div>
                      <canvas ref={canvasRef} width={300} height={120} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} style={{ border: '1px dashed #007bff', background: '#fafafa', borderRadius: '4px', width: '100%', touchAction: 'none' }} />
                    </div>

                    <button onClick={handleJobSubmit} disabled={uploading} style={{ width: '100%', padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                      {uploading ? "सेव हो रहा है..." : "जॉब शीट सबमिट करें"}
                    </button>
                  </div>

                  {/* Pending online complaints section */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                    <h5>ऑनलाइन दर्ज नई शिकायतें (क्लिक करके भरें):</h5>
                    <button onClick={handleOpenBlankNewJob} style={{ padding: '5px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>+ बिल्कुल नया फॉर्म भरें</button>
                  </div>

                  {jobSheets.filter(i => i.status === 'Pending' && i.staffName === 'Not Assigned Yet').length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>अभी कोई नई ऑनलाइन शिकायत नहीं है। ऊपर दिए बटन से नया फॉर्म भर सकते हैं।</p>
                  ) : (
                    jobSheets.filter(i => i.status === 'Pending' && i.staffName === 'Not Assigned Yet').map((comp, idx) => (
                      <div key={idx} style={{ background: '#fff', padding: '12px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #86efac', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', color: '#166534', fontSize: '13px' }}>{comp.jobSheetNo} - {comp.customerPhone}</p>
                          <p style={{ margin: '0', fontSize: '12px', color: '#4b5563' }}><b>विवरण:</b> {comp.desc}</p>
                        </div>
                        <button onClick={() => handleFillComplaintToNewJob(comp)} style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                          जॉब भरें ➡️
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 2. PENDING JOB TAB */}
              {staffSubTab === 'pending' && (
                <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: '#854d0e', margin: '0' }}>⏳ Pending Jobs (लंबित कार्य)</h4>
                    <button onClick={() => setStaffSubTab('menu')} style={{ padding: '4px 8px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>बैक मेनू</button>
                  </div>
                  {jobSheets.filter(i => i.status === 'Pending').length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#666' }}>कोई पेंडिंग जॉब नहीं है।</p>
                  ) : (
                    jobSheets.filter(i => i.status === 'Pending').map((item, idx) => (
                      <div key={idx} style={{ background: '#fff', padding: '12px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #fde047', fontSize: '13px' }}>
                        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#854d0e' }}>Job No: {item.jobSheetNo} | Phone: {item.customerPhone}</p>
                        <p style={{ margin: '0 0 4px 0' }}><b>Product:</b> {item.product}</p>
                        <p style={{ margin: '0 0 4px 0' }}><b>Desc:</b> {item.desc}</p>
                        <p style={{ margin: '0 0 8px 0', color: '#b91c1c' }}><b>विशेष नोट:</b> {item.note}</p>
                        <button onClick={() => handleFillComplaintToNewJob(item)} style={{ padding: '5px 10px', background: '#eab308', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>
                          इस जॉब को पूरा करें / अपडेट करें
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 3. PART PENDING JOB TAB */}
              {staffSubTab === 'partPending' && (
                <div style={{ background: '#ffedd5', border: '1px solid #fed7aa', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: '#9a3412', margin: '0' }}>⚙️ Part Pending Jobs (स्पेयर पार्ट पेंडिंग)</h4>
                    <button onClick={() => setStaffSubTab('menu')} style={{ padding: '4px 8px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>बैक मेनू</button>
                  </div>
                  <p style={{ fontSize: '12px', color: '#7c2d12', marginBottom: '10px' }}>ये वे जॉब्स हैं जो स्पेयर पार्ट उपलब्ध न होने के कारण रुके हुए हैं। यह डेटा एडमिन पैनल पर भी दिख रहा है।</p>
                  {jobSheets.filter(i => i.status === 'Part Pending').length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#666' }}>कोई पार्ट पेंडिंग जॉब उपलब्ध नहीं है।</p>
                  ) : (
                    jobSheets.filter(i => i.status === 'Part Pending').map((item, idx) => (
                      <div key={idx} style={{ background: '#fff', padding: '12px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #fdba74', fontSize: '13px' }}>
                        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#9a3412' }}>Job No: {item.jobSheetNo} | Customer: {item.customerPhone}</p>
                        <p style={{ margin: '0 0 4px 0', color: '#b91c1c' }}><b>पार्ट नोट / जरूरत:</b> {item.note}</p>
                        <button onClick={() => handleFillComplaintToNewJob(item)} style={{ padding: '5px 10px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>
                          पार्ट आने पर पूरा करें
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* ADMIN & OFFICE STAFF PANEL */}
      {activeTab === 'admin' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          {!adminLoggedIn ? (
            <div>
              <h3>🔒 ऑफिस स्टाफ & एडमिन लॉगिन</h3>
              <p style={{ fontSize: '13px', color: '#666' }}>पेंडिंग, पार्ट पेंडिंग और विशेष नोट देखने के लिए एडमिन क्रेडेंशियल्स दर्ज करें:</p>
              <form onSubmit={handleAdminLogin}>
                <div style={{ marginBottom: '10px' }}>
                  <label>यूजरनेम (Username):</label>
                  <input type="text" placeholder="यूजरनेम दर्ज करें" value={adminUser} onChange={(e) => setAdminUser(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label>पासवर्ड (Password):</label>
                  <input type="password" placeholder="पासवर्ड दर्ज करें" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                </div>
                <button type="submit" style={{ width: '100%', padding: '12px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>लॉगिन करें</button>
              </form>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ color: '#b45309', margin: '0' }}>📊 एडमिन कंट्रोल पैनल (Admin Tracking View)</h4>
                <button onClick={() => setAdminLoggedIn(false)} style={{ padding: '5px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>लॉग आउट</button>
              </div>
              <hr style={{ margin: '15px 0' }} />

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1, background: '#fef9c3', padding: '10px', borderRadius: '6px', textAlign: 'center', border: '1px solid #fef08a' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#854d0e' }}>Pending Jobs</p>
                  <h3 style={{ margin: '5px 0 0 0', color: '#b45309' }}>{jobSheets.filter(i => i.status === 'Pending').length}</h3>
                </div>
                <div style={{ flex: 1, background: '#ffedd5', padding: '10px', borderRadius: '6px', textAlign: 'center', border: '1px solid #fed7aa' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#9a3412' }}>Part Pending Jobs</p>
                  <h3 style={{ margin: '5px 0 0 0', color: '#c2410c' }}>{jobSheets.filter(i => i.status === 'Part Pending').length}</h3>
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', padding: '10px', borderRadius: '6px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#166534' }}>Total Records</p>
                  <h3 style={{ margin: '5px 0 0 0', color: '#15803d' }}>{jobSheets.length}</h3>
                </div>
              </div>

              <h5 style={{ color: '#9a3412', marginTop: '20px' }}>⚙️ स्पेयर पार्ट पेंडिंग & विशेष नोट (Admin Tracking):</h5>
              {jobSheets.filter(i => i.status === 'Part Pending' || (i.note && i.note !== '-')).length === 0 ? (
                <p style={{ fontSize: '13px', color: '#666' }}>वर्तमान में कोई भी पार्ट पेंडिंग या विशेष नोट उपलब्ध नहीं है।</p>
              ) : (
                jobSheets.filter(i => i.status === 'Part Pending' || (i.note && i.note !== '-')).map((item, idx) => (
                  <div key={idx} style={{ background: '#fff7ed', padding: '12px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #fdba74', fontSize: '13px' }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#9a3412' }}><b>Job No:</b> {item.jobSheetNo} | <b>Customer Ph:</b> {item.customerPhone}</p>
                    <p style={{ margin: '0 0 4px 0' }}><b>Product:</b> {item.product} | <b>Status:</b> <span style={{ color: '#c2410c', fontWeight: 'bold' }}>{item.status}</span></p>
                    <p style={{ margin: '0 0 4px 0', color: '#b91c1c', background: '#ffedd5', padding: '5px', borderRadius: '4px' }}><b>📌 विशेष नोट / स्पेयर पार्ट जरूरत:</b> {item.note}</p>
                    <p style={{ margin: '0', fontSize: '11px', color: '#666' }}>स्टाफ: {item.staffName} | GPS: {item.location}</p>
                  </div>
                ))
              )}

              <h5 style={{ color: '#b45309', marginTop: '25px' }}>📋 सभी जनरल पेंडिंग जॉब्स (General Pending):</h5>
              {jobSheets.filter(i => i.status === 'Pending').length === 0 ? (
                <p style={{ fontSize: '13px', color: '#666' }}>कोई जनरल पेंडिंग जॉब नहीं है।</p>
              ) : (
                jobSheets.filter(i => i.status === 'Pending').map((item, idx) => (
                  <div style={{ background: '#fffdf0', padding: '10px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #fef08a', fontSize: '13px' }} key={idx}>
                    <p style={{ margin: '0 0 3px 0', fontWeight: 'bold' }}>{item.jobSheetNo} - {item.customerName} ({item.customerPhone})</p>
                    <p style={{ margin: '0' }}>विवरण: {item.desc}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}