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
  
  // Staff Sub-tabs: 'menu', 'new', 'pending', 'partPending'
  const [staffSubTab, setStaffSubTab] = useState('menu');
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Admin / Office Staff Login State
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);

  // Expanded items state for click-to-view details
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [adminExpandedJobId, setAdminExpandedJobId] = useState(null);

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
  
  // New specific columns for pending / part pending
  const [sparePartName, setSparePartName] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [jobNote, setJobNote] = useState('');

  const [materials, setMaterials] = useState([
    { name: '', qty: '', price: '' },
    { name: '', qty: '', price: '' }
  ]);

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
      sparePartName: '-',
      otherReason: '-',
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
      setStaffSubTab('menu');
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
    setSparePartName('');
    setOtherReason('');
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
    setSparePartName(comp.sparePartName && comp.sparePartName !== '-' ? comp.sparePartName : '');
    setOtherReason(comp.otherReason && comp.otherReason !== '-' ? comp.otherReason : '');
    setJobNote(comp.note && comp.note !== '-' ? comp.note : '');
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
          sparePartName: sparePartName || '-',
          otherReason: otherReason || '-',
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
        setSparePartName('');
        setOtherReason('');
        setJobNote('');
        setSectionPressure('');
        setRoomTemp('');
        setAmpere('');
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

              {/* MAIN MENU */}
              {staffSubTab === 'menu' && (
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ color: '#334155', marginTop: '0' }}>फ़ील्ड स्टाफ डैशबोर्ड</h4>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>ऊपर दिए गए तीन विकल्पों में से किसी एक पर क्लिक करें:</p>
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
                    <p style={{ fontSize: '12px', color: '#4b5563' }}>ग्राहक की डिटेल्स और काम भरकर नीचे जॉब स्टेटस चुनें और सबमिट करें।</p>

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

                    {/* THREE SPECIFIC COLUMNS FOR PENDING / REASONS / NOTES */}
                    <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '6px', border: '1px solid #fde047', marginBottom: '15px' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#92400e' }}>यदि काम पेंडिंग या पार्ट पेंडिंग है, तो नीचे विवरण भरें:</p>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>1. स्पेयर पार्ट का नाम (Spare Part Name):</label>
                        <input type="text" placeholder="जैसे: 2 Ton Compressor / Fan Motor..." value={sparePartName} onChange={(e) => setSparePartName(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '3px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff' }} />
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>2. दूसरा रीजन (Other Reason):</label>
                        <input type="text" placeholder="जैसे: Customer not available / Site not ready..." value={otherReason} onChange={(e) => setOtherReason(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '3px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff' }} />
                      </div>

                      <div style={{ marginBottom: '0' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>3. विशेष नोट (Special Note):</label>
                        <input type="text" placeholder="अन्य कोई जरूरी जानकारी..." value={jobNote} onChange={(e) => setJobNote(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '3px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff' }} />
                      </div>
                    </div>

                    {/* JOB STATUS POSITIONED JUST ABOVE SUBMIT BUTTON */}
                    <div style={{ marginBottom: '15px', background: '#e0f2fe', padding: '12px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                      <label style={{ fontWeight: 'bold', color: '#0369a1' }}>जॉब स्टेटस चुनें (Job Status):</label><br />
                      <select value={jobStatusType} onChange={(e) => setJobStatusType(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #0284c7', fontWeight: 'bold', color: jobStatusType === 'Completed' ? 'green' : (jobStatusType === 'Part Pending' ? '#c2410c' : 'orange'), background: '#fff' }}>
                        <option value="Completed">Completed (काम पूरा हो गया)</option>
                        <option value="Pending">Pending (अभी पेंडिंग है)</option>
                        <option value="Part Pending">Part Pending (स्पेयर पार्ट की वजह से पेंडिंग)</option>
                      </select>
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

                  {/* Online complaints section */}
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

              {/* 2. PENDING JOB TAB (COLLAPSIBLE / CLICK TO VIEW) */}
              {staffSubTab === 'pending' && (
                <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: '#854d0e', margin: '0' }}>⏳ Pending Jobs (लंबित कार्य)</h4>
                    <button onClick={() => setStaffSubTab('menu')} style={{ padding: '4px 8px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>बैक मेनू</button>
                  </div>
                  <p style={{ fontSize: '12px', color: '#666' }}>किसी भी जॉब पर क्लिक करके उसकी पूरी डिटेल्स देखें:</p>

                  {jobSheets.filter(i => i.status === 'Pending').length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#666' }}>कोई पेंडिंग जॉब नहीं है।</p>
                  ) : (
                    jobSheets.filter(i => i.status === 'Pending').map((item, idx) => {
                      const isExpanded = expandedJobId === item.jobSheetNo;
                      return (
                        <div key={idx} style={{ background: '#fff', padding: '12px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #fde047', fontSize: '13px' }}>
                          <div onClick={() => setExpandedJobId(isExpanded ? null : item.jobSheetNo)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', color: '#854d0e' }}>Job No: {item.jobSheetNo} | Ph: {item.customerPhone}</p>
                              <p style={{ margin: '0', fontSize: '12px', color: '#555' }}><b>Product:</b> {item.product}</p>
                            </div>
                            <span style={{ fontSize: '12px', color: '#007bff', fontWeight: 'bold' }}>{isExpanded ? 'कम करें 🔼' : 'पूरी डिटेल्स देखें 🔽'}</span>
                          </div>

                          {isExpanded && (
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', background: '#fafafa', padding: '10px', borderRadius: '4px' }}>
                              <p style={{ margin: '0 0 4px 0' }}><b>ग्राहक नाम:</b> {item.customerName}</p>
                              <p style={{ margin: '0 0 4px 0' }}><b>विवरण:</b> {item.desc}</p>
                              <p style={{ margin: '0 0 4px 0', color: '#9a3412' }}><b>स्पेयर पार्ट जरूरत:</b> {item.sparePartName}</p>
                              <p style={{ margin: '0 0 4px 0', color: '#9a3412' }}><b>दूसरा रीजन:</b> {item.otherReason}</p>
                              <p style={{ margin: '0 0 8px 0', color: '#9a3412' }}><b>विशेष नोट:</b> {item.note}</p>
                              <button onClick={() => handleFillComplaintToNewJob(item)} style={{ padding: '6px 12px', background: '#eab308', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                                इस जॉब को पूरा करें / अपडेट करें
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* 3. PART PENDING JOB TAB (COLLAPSIBLE / CLICK TO VIEW) */}
              {staffSubTab === 'partPending' && (
                <div style={{ background: '#ffedd5', border: '1px solid #fed7aa', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ color: '#9a3412', margin: '0' }}>⚙️ Part Pending Jobs (स्पेयर पार्ट पेंडिंग)</h4>
                    <button onClick={() => setStaffSubTab('menu')} style={{ padding: '4px 8px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>बैक मेनू</button>
                  </div>
                  <p style={{ fontSize: '12px', color: '#7c2d12', marginBottom: '10px' }}>किसी भी पार्ट पेंडिंग जॉब पर क्लिक करके उसकी पूरी डिटेल्स और सामान की जरूरत देखें:</p>

                  {jobSheets.filter(i => i.status === 'Part Pending').length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#666' }}>कोई पार्ट पेंडिंग जॉब उपलब्ध नहीं है।</p>
                  ) : (
                    jobSheets.filter(i => i.status === 'Part Pending').map((item, idx) => {
                      const isExpanded = expandedJobId === item.jobSheetNo;
                      return (
                        <div key={idx} style={{ background: '#fff', padding: '12px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #fdba74', fontSize: '13px' }}>
                          <div onClick={() => setExpandedJobId(isExpanded ? null : item.jobSheetNo)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', color: '#9a3412' }}>Job No: {item.jobSheetNo} | Customer: {item.customerPhone}</p>
                              <p style={{ margin: '0', fontSize: '12px', color: '#c2410c' }}><b>चाहिए सामान:</b> {item.sparePartName}</p>
                            </div>
                            <span style={{ fontSize: '12px', color: '#007bff', fontWeight: 'bold' }}>{isExpanded ? 'कम करें 🔼' : 'पूरी डिटेल्स देखें 🔽'}</span>
                          </div>

                          {isExpanded && (
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #fed7aa', background: '#fff7ed', padding: '10px', borderRadius: '4px' }}>
                              <p style={{ margin: '0 0 4px 0' }}><b>ग्राहक नाम:</b> {item.customerName} ({item.customerPhone})</p>
                              <p style={{ margin: '0 0 4px 0' }}><b>प्रोडक्ट:</b> {item.product}</p>
                              <p style={{ margin: '0 0 4px 0', color: '#b91c1c', fontWeight: 'bold' }}><b>🛠️ स्पेयर पार्ट का नाम:</b> {item.sparePartName}</p>
                              <p style={{ margin: '0 0 4px 0', color: '#9a3412' }}><b>🔍 दूसरा रीजन:</b> {item.otherReason}</p>
                              <p style={{ margin: '0 0 8px 0', color: '#9a3412' }}><b>📌 विशेष नोट:</b> {item.note}</p>
                              <button onClick={() => handleFillComplaintToNewJob(item)} style={{ padding: '6px 12px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                                पार्ट आने पर पूरा करें
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
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
              <p style={{ fontSize: '13px', color: '#666' }}>पेंडिंग, पार्ट पेंडिंग और स्पेयर पार्ट्स की जरूरत देखने के लिए एडमिन क्रेडेंशियल्स दर्ज करें:</p>
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
                <div style={{ flex: 1, background: '#f0fdf4', padding: '10px', borderRadius: '6px', textAlign: 'center', border: '1px solid #15803d' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#166534' }}>Total Records</p>
                  <h3 style={{ margin: '5px 0 0 0', color: '#15803d' }}>{jobSheets.length}</h3>
                </div>
              </div>

              <h5 style={{ color: '#9a3412', marginTop: '20px' }}>⚙️ पार्ट पेंडिंग & पेंडिंग जॉब्स (क्लिक करके देखें क्या सामान चाहिए):</h5>
              {jobSheets.filter(i => i.status === 'Part Pending' || i.status === 'Pending' || (i.note && i.note !== '-')).length === 0 ? (
                <p style={{ fontSize: '13px', color: '#666' }}>वर्तमान में कोई भी पेंडिंग या पार्ट पेंडिंग जॉब नहीं है।</p>
              ) : (
                jobSheets.filter(i => i.status === 'Part Pending' || i.status === 'Pending' || (i.note && i.note !== '-')).map((item, idx) => {
                  const isAdminExpanded = adminExpandedJobId === item.jobSheetNo;
                  return (
                    <div key={idx} style={{ background: '#fff7ed', padding: '12px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #fdba74', fontSize: '13px' }}>
                      <div onClick={() => setAdminExpandedJobId(isAdminExpanded ? null : item.jobSheetNo)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', color: '#9a3412' }}>Job No: {item.jobSheetNo} | Status: <span style={{ color: '#c2410c' }}>{item.status}</span></p>
                          <p style={{ margin: '0', fontSize: '12px', color: '#b91c1c' }}><b>चाहिए सामान:</b> {item.sparePartName && item.sparePartName !== '-' ? item.sparePartName : 'सामान्य पेंडिंग'}</p>
                        </div>
                        <span style={{ fontSize: '12px', color: '#007bff', fontWeight: 'bold' }}>{isAdminExpanded ? 'कम करें 🔼' : 'पूरी डिटेल्स देखें 🔽'}</span>
                      </div>

                      {isAdminExpanded && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #fdba74', background: '#fff', padding: '10px', borderRadius: '4px' }}>
                          <p style={{ margin: '0 0 4px 0' }}><b>ग्राहक नाम:</b> {item.customerName} | <b>फोन:</b> {item.customerPhone}</p>
                          <p style={{ margin: '0 0 4px 0' }}><b>पता:</b> {item.customerAddress}</p>
                          <p style={{ margin: '0 0 4px 0' }}><b>प्रोडक्ट / कार्य:</b> {item.product}</p>
                          <p style={{ margin: '0 0 4px 0', color: '#b91c1c', background: '#ffedd5', padding: '5px', borderRadius: '4px' }}><b>🛠️ स्पेयर पार्ट का नाम:</b> {item.sparePartName}</p>
                          <p style={{ margin: '0 0 4px 0', color: '#9a3412' }}><b>🔍 दूसरा रीजन:</b> {item.otherReason}</p>
                          <p style={{ margin: '0 0 4px 0', color: '#9a3412' }}><b>📌 विशेष नोट:</b> {item.note}</p>
                          <p style={{ margin: '0', fontSize: '11px', color: '#666' }}>स्टाफ: {item.staffName} | GPS: {item.location}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  onSnapshot, 
  addDoc
} from 'firebase/firestore';

// --- (यहाँ अपनी Firebase कॉन्फिग डालें) ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function ManqubeFSMApp() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('staff'); // 'admin', 'staff', 'customer'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [activeTab, setActiveTab] = useState('form');

  // लॉगिन स्टेट चेक और ट्रैकिंग
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await trackUserLogin(currentUser.phoneNumber || phone || currentUser.email, name || "Manqube User", role);
      }
    });
    return () => unsubscribe();
  }, []);

  const trackUserLogin = async (userPhoneId, userName, userRole) => {
    try {
      const userRef = doc(db, "login_logs", userPhoneId);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        await updateDoc(userRef, {
          loginCount: increment(1),
          lastLogin: serverTimestamp()
        });
      } else {
        await setDoc(userRef, {
          phone: userPhoneId,
          name: userName,
          role: userRole,
          loginCount: 1,
          lastLogin: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Login tracking error:", err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("लॉगिन सफल रहा!");
    } catch (error) {
      alert("लॉगिन फेल: " + error.message);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm space-y-4">
          <div className="text-center flex flex-col items-center">
            {/* कंपनी लोगो */}
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-2 shadow-inner border border-blue-200 overflow-hidden">
              <span className="text-blue-700 font-extrabold text-lg">MQ</span>
            </div>
            <h2 className="text-2xl font-bold text-blue-700">MANQUBE</h2>
            <p className="text-xs text-gray-500">We Build. Your Trust.</p>
          </div>
          <input
            type="email"
            placeholder="ईमेल आईडी"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm"
            required
          />
          <input
            type="password"
            placeholder="पासवर्ड"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm"
            required
          />
          <input
            type="text"
            placeholder="आपका नाम"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm"
            required
          />
          <input
            type="tel"
            placeholder="मोबाइल नंबर"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm"
            required
          />
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm bg-white"
          >
            <option value="staff">स्टाफ (Staff)</option>
            <option value="admin">एडमिन (Admin)</option>
            <option value="customer">कस्टमर (Customer)</option>
          </select>
          <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold text-sm hover:bg-blue-700">
            लॉगिन करें
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* हेडर विथ लोगो एंड टैगलाइन */}
      <header className="bg-blue-700 text-white p-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center p-1 shadow overflow-hidden border border-blue-300">
            <span className="text-blue-700 font-extrabold text-xs">MQ</span>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide leading-tight">MANQUBE</h1>
            <p className="text-[10px] text-blue-200 tracking-wider">We Build. Your Trust.</p>
          </div>
        </div>

        <div className="flex gap-1.5 items-center">
          <button 
            onClick={() => setActiveTab('form')} 
            className="px-2.5 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-800"
          >
            नया जॉब
          </button>
          
          {role === 'admin' && (
            <button 
              onClick={() => setActiveTab('admin')} 
              className="px-2.5 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-800"
            >
              एडमिन पैनल
            </button>
          )}

          <button 
            onClick={handleLogout} 
            className="bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded text-xs font-medium"
          >
            लॉग आउट
          </button>
        </div>
      </header>

      <main className="p-4 max-w-xl mx-auto mt-2">
        {activeTab === 'form' ? <JobSheetSlideForm /> : <AdminLoginAnalytics />}
      </main>
    </div>
  );
}

// --- 1. स्टेप-बाय-स्टेप स्लाइड फॉर्म (Wizard UI with Spare Parts) ---
function JobSheetSlideForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    address: '',
    problemDescription: '',
    sparePartType: 'Used Part', // 'Pending Part' या 'Used Part'
    partName: '',
    modelNumber: '',
    jobStatus: 'Complete',
    customerSignature: ''
  });

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitJob = async () => {
    try {
      await addDoc(collection(getFirestore(), "jobs"), {
        ...formData,
        createdAt: serverTimestamp()
      });
      alert("जॉब शीट सफलतापूर्वक सबमिट हो गई है!");
      setStep(1);
      setFormData({
        customerName: '',
        customerPhone: '',
        address: '',
        problemDescription: '',
        sparePartType: 'Used Part',
        partName: '',
        modelNumber: '',
        jobStatus: 'Complete',
        customerSignature: ''
      });
    } catch (error) {
      alert("त्रुटि: " + error.message);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-md space-y-4">
      <div className="w-full bg-gray-200 h-2 rounded-full mb-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
          style={{ width: step === 1 ? '14%' : step === 2 ? '28%' : step === 3 ? '42%' : step === 4 ? '57%' : step === 5 ? '71%' : step === 6 ? '85%' : '100%' }}
        ></div>
      </div>
      <h2 className="text-sm font-bold text-gray-700">स्टेप {step} / 7</h2>

      {/* स्टेप 1: कस्टमर का नाम */}
      {step === 1 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">कस्टमर का नाम:</label>
          <input type="text" name="customerName" placeholder="नाम दर्ज करें" value={formData.customerName} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" />
          <button onClick={nextStep} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold text-sm">आगे बढ़ें →</button>
        </div>
      )}

      {/* स्टेप 2: मोबाइल नंबर */}
      {step === 2 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">मोबाइल नंबर:</label>
          <input type="tel" name="customerPhone" placeholder="मोबाइल नंबर दर्ज करें" value={formData.customerPhone} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" />
          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={nextStep} className="w-1/2 bg-blue-600 text-white p-3 rounded-lg text-sm font-bold">आगे →</button>
          </div>
        </div>
      )}

      {/* स्टेप 3: पता (Address) */}
      {step === 3 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">पता (Address):</label>
          <input type="text" name="address" placeholder="साइट का पूरा पता" value={formData.address} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" />
          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={nextStep} className="w-1/2 bg-blue-600 text-white p-3 rounded-lg text-sm font-bold">आगे →</button>
          </div>
        </div>
      )}

      {/* स्टेप 4: प्रॉब्लम क्या थी */}
      {step === 4 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">प्रॉब्लम क्या थी (Problem Description):</label>
          <textarea name="problemDescription" placeholder="समस्या का विवरण दर्ज करें..." rows="3" value={formData.problemDescription} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" />
          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={nextStep} className="w-1/2 bg-blue-600 text-white p-3 rounded-lg text-sm font-bold">आगे →</button>
          </div>
        </div>
      )}

      {/* स्टेप 5: स्पेयर पार्ट ऑप्शन (Pending Part या Used Part) */}
      {step === 5 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">स्पेयर पार्ट का चयन करें:</label>
          <select 
            name="sparePartType" 
            value={formData.sparePartType} 
            onChange={handleChange} 
            className="w-full p-3 border rounded-lg text-sm bg-white"
          >
            <option value="Used Part">Used Part (इस्तेमाल किया गया पार्ट)</option>
            <option value="Pending Part">Pending Part (पेंडिंग पार्ट)</option>
          </select>

          <input 
            type="text" 
            name="partName" 
            placeholder="पार्ट का नाम (Part Name)" 
            value={formData.partName} 
            onChange={handleChange} 
            className="w-full p-3 border rounded-lg text-sm" 
          />
          <input 
            type="text" 
            name="modelNumber" 
            placeholder="मॉडल नंबर (Model Number)" 
            value={formData.modelNumber} 
            onChange={handleChange} 
            className="w-full p-3 border rounded-lg text-sm" 
          />

          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={nextStep} className="w-1/2 bg-blue-600 text-white p-3 rounded-lg text-sm font-bold">आगे →</button>
          </div>
        </div>
      )}

      {/* स्टेप 6: जॉब स्टेटस (Complete, Pending, Repeat Complaint, OK) */}
      {step === 6 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">जॉब स्टेटस चुनें:</label>
          <select 
            name="jobStatus" 
            value={formData.jobStatus} 
            onChange={handleChange} 
            className="w-full p-3 border rounded-lg text-sm bg-white"
          >
            <option value="Complete">Complete (काम पूरा हो गया)</option>
            <option value="Pending">Pending (पेंडिंग)</option>
            <option value="Repeat Complaint">Repeat Complaint (रिपीट कंप्लेंट)</option>
            <option value="OK">OK (ओके)</option>
          </select>

          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={nextStep} className="w-1/2 bg-blue-600 text-white p-3 rounded-lg text-sm font-bold">आगे →</button>
          </div>
        </div>
      )}

      {/* स्टेप 7: कस्टमर सिग्नेचर और जॉब शीट सबमिट */}
      {step === 7 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">कस्टमर सिग्नेचर / नाम:</label>
          <input type="text" name="customerSignature" placeholder="कस्टमर का डिजिटल हस्ताक्षर (नाम)" value={formData.customerSignature} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" />
          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={handleSubmitJob} className="w-1/2 bg-green-600 text-white p-3 rounded-lg font-bold text-sm hover:bg-green-700">जॉब शीट सबमिट करें ✔️</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 2. एडमिन पैनल विथ 'लॉगिन' एनालिटिक्स ---
function AdminLoginAnalytics() {
  const [subTab, setSubTab] = useState('all'); // 'all', 'customer', 'office', 'staff'
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const db = getFirestore();
    const unsubscribe = onSnapshot(collection(db, "login_logs"), (snapshot) => {
      const allLogs = [];
      snapshot.forEach((doc) => {
        allLogs.push(doc.data());
      });
      setLogs(allLogs);
    });
    return () => unsubscribe();
  }, []);

  // फ़िल्टरिंग रोल के आधार पर
  const filteredLogs = logs.filter(item => {
    if (subTab === 'customer') return item.role === 'customer';
    if (subTab === 'office' || item.role === 'admin') return item.role === 'admin' || subTab === 'office';
    if (subTab === 'staff') return item.role === 'staff';
    return true;
  });

  return (
    <div className="space-y-4 bg-white p-4 rounded-xl shadow-md">
      <h2 className="text-lg font-bold text-blue-800 border-b pb-2">एडमिन पैनल - लॉगिन एनालिटिक्स</h2>
      
     {/* लॉगिन कैटेगरी टैब्स */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setSubTab('all')} className="px-3 py-1.5 rounded text-xs font-medium bg-blue-900 text-white">सभी</button>
        <button onClick={() => setSubTab('customer')} className="px-3 py-1.5 rounded text-xs font-medium bg-gray-200">कस्टमर (Customer)</button>
        <button onClick={() => setSubTab('office')} className="px-3 py-1.5 rounded text-xs font-medium bg-gray-200">ऑफिस (Office)</button>
        <button onClick={() => setSubTab('staff')} className="px-3 py-1.5 rounded text-xs font-medium bg-gray-200">स्टाफ (Staff)</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-xs text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">नाम</th>
              <th className="border p-2">रोल (Role)</th>
              <th className="border p-2">मोबाइल नंबर / आईडी</th>
              <th className="border p-2 text-center">कितनी बार लॉगिन किया</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((item, idx) => (
              <tr key={idx}>
                <td className="border p-2">{item.name || 'N/A'}</td>
                <td className="border p-2 capitalize font-semibold text-blue-600">{item.role}</td>
                <td className="border p-2 font-mono">{item.phone}</td>
                <td className="border p-2 text-center font-bold text-green-700">{item.loginCount} बार</td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center p-4 text-gray-500">कोई लॉगिन रिकॉर्ड नहीं मिला।</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}