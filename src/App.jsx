import React, { useState, useRef, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  onSnapshot 
} from "firebase/firestore";
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
  const [loginLogs, setLoginLogs] = useState([]);

  // Customer Portal State
  const [custPhone, setCustPhone] = useState('');
  const [custLoggedIn, setCustLoggedIn] = useState(false);
  const [custNameInput, setCustNameInput] = useState('');
  const [custAddressInput, setCustAddressInput] = useState('');
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
  
  const [staffSubTab, setStaffSubTab] = useState('menu');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);

  // Admin Login State
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminSection, setAdminSection] = useState('jobs');
  const [loginFilterTab, setLoginFilterTab] = useState('all');
  const [adminExpandedJobId, setAdminExpandedJobId] = useState(null);

  // Job Form State
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

  const [workDone, setWorkDone] = useState('');
  const [sparePartOption, setSparePartOption] = useState('Used Part');
  const [sparePartName, setSparePartName] = useState('');
  const [sparePartModel, setSparePartModel] = useState('');

  const [jobStatusType, setJobStatusType] = useState('Completed');
  const [pendingSubOption, setPendingSubOption] = useState('Part Pending');
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

  // Firestore Real-time Sync
  useEffect(() => {
    const unsubJobs = onSnapshot(collection(db, "jobs"), (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setJobSheets(list);
    }, (err) => console.log("Jobs sync info:", err.message));

    const unsubLogs = onSnapshot(collection(db, "login_logs"), (snapshot) => {
      const logs = [];
      snapshot.forEach((doc) => {
        logs.push(doc.data());
      });
      setLoginLogs(logs);
    }, (err) => console.log("Logs sync info:", err.message));

    return () => {
      unsubJobs();
      unsubLogs();
    };
  }, []);

  const recordUserLogin = async (identifier, userRole, displayName) => {
    const cleanId = identifier.trim();
    if (!cleanId) return;

    setLoginLogs((prev) => {
      const existingIndex = prev.findIndex((item) => item.phone === cleanId && item.role === userRole);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          loginCount: (updated[existingIndex].loginCount || 1) + 1,
          lastLoginText: new Date().toLocaleString()
        };
        return updated;
      } else {
        return [
          {
            phone: cleanId,
            role: userRole,
            name: displayName,
            loginCount: 1,
            lastLoginText: new Date().toLocaleString()
          },
          ...prev
        ];
      }
    });

    try {
      const docId = userRole + "_" + cleanId.replace(/[^a-zA-Z0-9]/g, '_');
      const userRef = doc(db, "login_logs", docId);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        await updateDoc(userRef, {
          loginCount: increment(1),
          lastLogin: serverTimestamp(),
          lastLoginText: new Date().toLocaleString()
        });
      } else {
        await setDoc(userRef, {
          phone: cleanId,
          role: userRole,
          name: displayName,
          loginCount: 1,
          lastLogin: serverTimestamp(),
          lastLoginText: new Date().toLocaleString()
        });
      }
    } catch (error) {
      console.error("Firestore login track error:", error);
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => { setIsDrawing(false); };
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleCustomerLogin = async (e) => {
    e.preventDefault();
    if (custPhone.length < 10) {
      alert('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें!');
      return;
    }
    setCustLoggedIn(true);
    await recordUserLogin(custPhone, 'customer', 'Customer (' + custPhone + ')');
  };

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setCategoryType(cat);
    if (cat === 'HVAC & Refrigeration') setProductType('Split / Window AC');
    else if (cat === 'Electrical Work') setProductType('House Wiring & Panel');
    else if (cat === 'Plumbing Work') setProductType('Pipe Fitting & Leakage Repair');
    else if (cat === 'Civil Work') setProductType('Flooring & Tiling');
  };

  const handleNewComplaint = async (e) => {
    e.preventDefault();
    if (!custNameInput.trim() || !custAddressInput.trim()) {
      alert('कृपया कस्टमर का पूरा नाम और पता दर्ज करें!');
      return;
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const jobSheetNo = 'COMP' + custPhone + day + month + hours + minutes;

    const newEntry = {
      jobSheetNo,
      customerName: custNameInput,
      customerPhone: custPhone,
      customerAddress: custAddressInput,
      product: "[" + categoryType + "] " + productType,
      desc: problemDesc,
      status: 'Pending',
      pendingSubOption: '-',
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
      materials: [],
      sparePartOption: '-',
      sparePartName: '-',
      sparePartModel: '-',
      otherReason: '-',
      note: '-',
      feedback: '-'
    };

    setJobSheets([newEntry, ...jobSheets]);
    try {
      await setDoc(doc(db, "jobs", jobSheetNo), newEntry);
    } catch (err) {
      console.error(err);
    }

    setProblemDesc('');
    setCustNameInput('');
    setCustAddressInput('');
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

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (enteredOtp === generatedOtp) {
      const staffLabel = 'Staff (' + staffPhoneInput + ')';
      setCurrentStaffName(staffLabel);
      setStaffLoggedIn(true);
      setStaffSubTab('menu');
      setOtpStep(1);
      setEnteredOtp('');

      await recordUserLogin(staffPhoneInput, 'staff', staffLabel);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude.toFixed(4);
            const lng = position.coords.longitude.toFixed(4);
            setStaffGpsLocation(`Lat: ${lat}, Lng: ${lng} (GPS Active)`);
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

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (adminUser.toUpperCase() === 'ADMIN' && adminPass === '123456789') {
      setAdminLoggedIn(true);
      await recordUserLogin(adminUser.toUpperCase(), 'office', 'Office Admin (' + adminUser.toUpperCase() + ')');
      alert('एडमिन / ऑफिस लॉगिन सफल!');
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
    setSparePartOption('Used Part');
    setSparePartName('');
    setSparePartModel('');
    setOtherReason('');
    setJobNote('');
    setCategoryType('HVAC & Refrigeration');
    setProductType('Split / Window AC');
    setJobStatusType('Completed');
    setPendingSubOption('Part Pending');
    setWizardStep(1);
    setStaffSubTab('newJobForm');
  };

  const handleFillComplaintToNewJob = (comp) => {
    setSelectedComplaint(comp);
    setJobCustName(comp.customerName || 'Customer');
    setJobCustPhone(comp.customerPhone || '');
    setJobCustAddress(comp.customerAddress || '');
    setCategoryType(comp.categoryType || 'HVAC & Refrigeration');
    setProductType(comp.productType || 'Split / Window AC');
    setWorkDone(comp.desc || '');
    setSparePartOption(comp.sparePartOption && comp.sparePartOption !== '-' ? comp.sparePartOption : 'Used Part');
    setSparePartName(comp.sparePartName && comp.sparePartName !== '-' ? comp.sparePartName : '');
    setSparePartModel(comp.sparePartModel && comp.sparePartModel !== '-' ? comp.sparePartModel : '');
    setOtherReason(comp.otherReason && comp.otherReason !== '-' ? comp.otherReason : '');
    setJobNote(comp.note && comp.note !== '-' ? comp.note : '');
    setWizardStep(1);
    setStaffSubTab('newJobForm');
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
        const finalStatus = jobStatusType === 'Completed' 
          ? 'Completed' 
          : (pendingSubOption === 'Part Pending' ? 'Part Pending' : 'Pending');

        const updatedRecord = {
          jobSheetNo,
          customerName: jobCustName,
          customerPhone: jobCustPhone,
          customerAddress: jobCustAddress,
          categoryType,
          productType,
          product: "[" + categoryType + "] " + productType,
          desc: workDone || 'General Service / Repair',
          status: finalStatus,
          pendingSubOption: jobStatusType === 'Pending' ? pendingSubOption : '-',
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
          materials: filteredMaterials,
          sparePartOption: sparePartOption,
          sparePartName: sparePartName || '-',
          sparePartModel: sparePartModel || '-',
          otherReason: otherReason || '-',
          note: jobNote || '-',
          feedback: customerFeedback || 'Good Service'
        };

        const filteredList = jobSheets.filter(j => j.jobSheetNo !== jobSheetNo);
        setJobSheets([updatedRecord, ...filteredList]);

        await setDoc(doc(db, "jobs", jobSheetNo), updatedRecord);

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
        setSparePartOption('Used Part');
        setSparePartName('');
        setSparePartModel('');
        setOtherReason('');
        setJobNote('');
        setSectionPressure('');
        setRoomTemp('');
        setAmpere('');
        setCustomerFeedback('');
        setImageFile(null);
        setMaterials([{ name: '', qty: '', price: '' }, { name: '', qty: '', price: '' }]);
        clearSignature();
        setWizardStep(1);
        setStaffSubTab('menu');

      } catch (error) {
        console.error("Upload error:", error);
        setUploading(false);
        alert('जॉब सबमिट करने में कुछ गड़बड़ी हुई!');
      }
    };

    processSave(staffGpsLocation);
  };

  const onlineComplaintsList = jobSheets.filter(j => j.status === 'Pending' && j.location === 'Online Booking');
  const pendingJobsList = jobSheets.filter(j => j.status === 'Pending' || j.status === 'Part Pending');
  const completedJobsList = jobSheets.filter(j => j.status === 'Completed');
  const partPendingJobsList = jobSheets.filter(j => j.status === 'Part Pending' || j.sparePartOption === 'Pending Part' || j.sparePartOption === 'Pending');

  const filteredLoginLogs = loginLogs.filter(log => {
    if (loginFilterTab === 'customer') return log.role === 'customer';
    if (loginFilterTab === 'office') return log.role === 'office';
    if (loginFilterTab === 'staff') return log.role === 'staff';
    return true;
  });

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '750px', margin: '0 auto', padding: '15px', background: '#f4f6f9', minHeight: '100vh' }}>
      
      {/* हेडर */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px 0', background: '#fff', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <img 
          src="/1000384854.jpg" 
          alt="Manqube Logo" 
          style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '50%', marginBottom: '8px' }}
        />
        <h2 style={{ margin: '0', color: '#1e293b', fontSize: '20px' }}>MANQUBE</h2>
        <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#64748b' }}>We Build. Your Trust.</p>
      </div>

      {activeTab !== 'home' && (
        <div style={{ marginBottom: '15px' }}>
          <button 
            onClick={() => setActiveTab('home')}
            style={{ padding: '8px 14px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
            ⬅ मुख्य मेनू (Home) पर वापस जाएं
          </button>
        </div>
      )}

      {/* GPS लोकेशन स्टेटस */}
      <div style={{ background: '#dcfce7', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '12px', color: '#166534' }}>
        <strong>GPS:</strong> {staffGpsLocation}
      </div>

      {/* होम पेज / पोर्टल सिलेक्शन */}
      {activeTab === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ textAlign: 'center', marginBottom: '5px' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>पोर्टल चुनें (Select Portal)</h3>
            <p style={{ margin: '0', fontSize: '13px', color: '#64748b' }}>कृपया आगे बढ़ने के लिए अपना संबंधित पोर्टल चुनें:</p>
          </div>

          <div 
            onClick={() => setActiveTab('complaint')}
            style={{ background: '#fff', borderLeft: '5px solid #2563eb', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#2563eb', fontSize: '18px' }}>👤 कस्टमर पोर्टल (Customer Portal)</h3>
            <p style={{ margin: '0', fontSize: '13px', color: '#475569' }}>अपनी शिकायत दर्ज करें और पुरानी जॉब-शीट्स देखें</p>
          </div>

          <div 
            onClick={() => setActiveTab('staff')}
            style={{ background: '#fff', borderLeft: '5px solid #166534', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#166534', fontSize: '18px' }}>🛠️ फ़ील्ड स्टाफ पोर्टल (Staff Mobile & GPS Login)</h3>
            <p style={{ margin: '0', fontSize: '13px', color: '#475569' }}>मोबाइल नंबर, OTP और GPS लोकेशन के साथ लॉगिन करें</p>
          </div>

          <div 
            onClick={() => setActiveTab('admin')}
            style={{ background: '#fff', borderLeft: '5px solid #d97706', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#d97706', fontSize: '18px' }}>📊 एडमिन & ऑफिस स्टाफ पैनल (Office Login)</h3>
            <p style={{ margin: '0', fontSize: '13px', color: '#475569' }}>ऑफिस स्टाफ लॉगिन करके पेंडिंग जॉब्स, स्पेयर पार्ट्स और लॉगिन रिकॉर्ड देखें</p>
          </div>
        </div>
      )}

      {/* 1. शिकायत दर्ज करें टैब (कस्टमर पोर्टल) */}
      {activeTab === 'complaint' && (
        <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>कस्टमर पोर्टल</h3>
          {!custLoggedIn ? (
            <form onSubmit={handleCustomerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: '0', fontSize: '13px', color: '#64748b' }}>अपनी शिकायतें और पूरी हुई जॉब-शीट देखने के लिए अपना मोबाइल नंबर दर्ज करें:</p>
              <input 
                type="tel" 
                maxLength="10" 
                placeholder="मोबाइल नंबर दर्ज करें" 
                value={custPhone} 
                onChange={(e) => setCustPhone(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                required 
              />
              <button type="submit" style={{ padding: '12px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                आगे बढ़ें
              </button>
            </form>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', marginBottom: '15px' }}>
                <span>स्वागत है! मोबाइल: <strong>{custPhone}</strong></span>
                <button onClick={() => setCustLoggedIn(false)} style={{ padding: '4px 8px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px' }}>लॉगआउट</button>
              </div>

              <form onSubmit={handleNewComplaint} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '15px' }}>
                <h4 style={{ margin: '0', color: '#007bff' }}>नई शिकायत दर्ज करें (New Complaint)</h4>
                
                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>कस्टमर का पूरा नाम (Customer Name):</label>
                <input 
                  type="text" 
                  placeholder="अपना पूरा नाम दर्ज करें" 
                  value={custNameInput} 
                  onChange={(e) => setCustNameInput(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required 
                />

                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>कस्टमर का पूरा पता (Full Address):</label>
                <textarea 
                  rows="2" 
                  placeholder="लोकेशन/पता विस्तार से लिखें..." 
                  value={custAddressInput} 
                  onChange={(e) => setCustAddressInput(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required 
                />

                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>मुख्य श्रेणी (Main Category):</label>
                <select value={categoryType} onChange={handleCategoryChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="HVAC & Refrigeration">HVAC & Refrigeration (एसी, कूलर, फ्रिज, चिलर, VRV)</option>
                  <option value="Electrical Work">Electrical Work (इलेक्ट्रिकल कार्य)</option>
                  <option value="Plumbing Work">Plumbing Work (प्लंबिंग)</option>
                  <option value="Civil Work">Civil Work (सिविल कार्य)</option>
                </select>

                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>संबंधित कार्य / उत्पाद (Sub-Option):</label>
                <select value={productType} onChange={(e) => setProductType(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  {categoryType === 'HVAC & Refrigeration' && (
                    <>
                      <option value="Split / Window AC">Split / Window AC</option>
                      <option value="Inverter AC">Inverter AC</option>
                      <option value="Cassette AC">Cassette AC (cómo / कैसेट एसी)</option>
                      <option value="Ductable AC">Ductable AC (डक्टेबल एसी)</option>
                      <option value="VRV / VRF System">VRV / VRF System</option>
                      <option value="AHU Unit (Air Handling Unit)">AHU Unit (Air Handling Unit)</option>
                      <option value="Chiller Unit">Chiller Unit (चिलर यूनिट)</option>
                      <option value="Tower / Cassette AC">Tower / Cassette AC</option>
                      <option value="Air Cooler (Honeywool/Iron)">Air Cooler (Honeywool/Iron)</option>
                      <option value="Deep Freezer / Refrigerator">Deep Freezer / Refrigerator</option>
                      <option value="Water Cooler">Water Cooler</option>
                    </>
                  )}
                  {categoryType === 'Electrical Work' && (
                    <>
                      <option value="House Wiring & Panel">House Wiring & Panel</option>
                      <option value="DB / MCB / MCCB Work">DB / MCB / MCCB Work</option>
                      <option value="Earthing & Lightning Arrester">Earthing & Lightning Arrester</option>
                      <option value="Three Phase Industrial Panel">Three Phase Industrial Panel</option>
                      <option value="Inverter / UPS / Battery Setup">Inverter / UPS / Battery Setup</option>
                    </>
                  )}
                  {categoryType === 'Plumbing Work' && (
                    <option value="Pipe Fitting & Leakage Repair">Pipe Fitting & Leakage Repair</option>
                  )}
                  {categoryType === 'Civil Work' && (
                    <option value="Flooring & Tiling">Flooring & Tiling</option>
                  )}
                </select>

                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>समस्या का विवरण:</label>
                <textarea 
                  rows="3" 
                  placeholder="क्या समस्या आ रही है विस्तार से लिखें..." 
                  value={problemDesc} 
                  onChange={(e) => setProblemDesc(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required 
                />

                <button type="submit" style={{ padding: '12px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                  शिकायत सबमिट करें
                </button>
              </form>

              <div>
                <h4 style={{ margin: '0 0 10px 0' }}>आपकी शिकायतें और जॉब हिस्ट्री:</h4>
                {jobSheets.filter(j => j.customerPhone === custPhone).length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '13px' }}>कोई पुरानी शिकायत या जॉब शीट नहीं मिली।</p>
                ) : (
                  jobSheets.filter(j => j.customerPhone === custPhone).map((job) => (
                    <div key={job.jobSheetNo} style={{ border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', marginBottom: '10px', background: '#fafafa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
                        <span>{job.jobSheetNo} ({job.customerName})</span>
                        <span style={{ color: job.status === 'Completed' ? 'green' : 'orange' }}>{job.status}</span>
                      </div>
                      <div style={{ fontSize: '13px', marginTop: '4px' }}>{job.product} - {job.desc}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>पता: {job.customerAddress} | तारीख: {job.date}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. स्टाफ पोर्टल टैब */}
      {activeTab === 'staff' && (
        <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>फ़ील्ड स्टाफ लॉगिन</h3>
          {!staffLoggedIn ? (
            <div>
              {otpStep === 1 ? (
                <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: '0', fontSize: '13px', color: '#64748b' }}>अपना रजिस्टर्ड मोबाइल नंबर दर्ज करें:</p>
                  <input 
                    type="tel" 
                    maxLength="10" 
                    placeholder="10 अंकों का मोबाइल नंबर" 
                    value={staffPhoneInput} 
                    onChange={(e) => setStaffPhoneInput(e.target.value)}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    required 
                  />
                  <button type="submit" style={{ padding: '12px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                    OTP भेजें
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#475569' }}>
                    नंबर <strong>{staffPhoneInput}</strong> पर OTP भेजा गया है।
                  </div>
                  <label style={{ fontWeight: 'bold' }}>OTP दर्ज करें:</label>
                  <input 
                    type="text" 
                    maxLength="4" 
                    placeholder="4 अंकों का OTP" 
                    value={enteredOtp} 
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    required 
                  />
                  <button type="submit" style={{ padding: '12px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                    OTP सत्यापित करें और लॉगिन करें
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '13px' }}>स्टाफ: <strong>{currentStaffName}</strong></span>
                <button onClick={() => setStaffLoggedIn(false)} style={{ padding: '5px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px' }}>लॉग आउट</button>
              </div>

              {staffSubTab === 'menu' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* विकल्प 1: नई जॉब शीट */}
                  <button onClick={handleOpenBlankNewJob} style={{ padding: '12px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', textAlign: 'left' }}>
                    ➕ नई जॉब शीट भरें (New Job Sheet)
                  </button>
                  
                  {/* विकल्प 2: ऑनलाइन शिकायतें */}
                  <button onClick={() => setStaffSubTab('onlineComplaints')} style={{ padding: '12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', textAlign: 'left' }}>
                    📋 ऑनलाइन शिकायतें देखें ({onlineComplaintsList.length})[span_4](start_span)[span_4](end_span)
                  </button>
                  
                  {/* विकल्प 3: पेंडिंग जॉब्स */}
                  <button onClick={() => setStaffSubTab('pending')} style={{ padding: '12px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', textAlign: 'left' }}>
                    ⏳ पेंडिंग जॉब्स ({pendingJobsList.length})[span_5](start_span)[span_5](end_span)
                  </button>

                  {/* विकल्प 4: कम्पलीट जॉब्स */}
                  <button onClick={() => setStaffSubTab('completed')} style={{ padding: '12px', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', textAlign: 'left' }}>
                    ✅ कम्पलीट जॉब्स ({completedJobsList.length})[span_6](start_span)[span_6](end_span)
                  </button>
                  
                  {/* विकल्प 5: स्पेयर पार्ट पेंडिंग */}
                  <button onClick={() => setStaffSubTab('partPending')} style={{ padding: '12px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', textAlign: 'left' }}>
                    ⚙️ स्पेयर पार्ट पेंडिंग ({partPendingJobsList.length})[span_7](start_span)[span_7](end_span)
                  </button>
                </div>
              )}

              {staffSubTab === 'onlineComplaints' && (
                <div>
                  <button onClick={() => setStaffSubTab('menu')} style={{ marginBottom: '10px', padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px' }}>← पीछे जाएं</button>
                  <h4>ऑनलाइन प्राप्त शिकायतें (Online Complaints)</h4>
                  {onlineComplaintsList.length === 0 ? (
                    <p style={{ color: '#64748b' }}>कोई नई ऑनलाइन शिकायत उपलब्ध नहीं है।</p>
                  ) : (
                    onlineComplaintsList.map((job) => (
                      <div key={job.jobSheetNo} style={{ border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', marginBottom: '10px', background: '#fafafa' }}>
                        <div><strong>कम्प्लेंट नं:</strong> {job.jobSheetNo}</div>
                        <div><strong>कस्टमर:</strong> {job.customerName} ({job.customerPhone})</div>
                        <div><strong>पता:</strong> {job.customerAddress}</div>
                        <div><strong>उत्पाद:</strong> {job.product}</div>
                        <div><strong>विवरण:</strong> {job.desc}</div>
                        <button onClick={() => handleFillComplaintToNewJob(job)} style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px' }}>
                          इस शिकायत पर जॉब शीट भरें
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {staffSubTab === 'pending' && (
                <div>
                  <button onClick={() => setStaffSubTab('menu')} style={{ marginBottom: '10px', padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px' }}>← पीछे जाएं</button>
                  <h4>पेंडिंग जॉब्स (Pending Jobs)</h4>
                  {pendingJobsList.length === 0 ? (
                    <p style={{ color: '#64748b' }}>कोई पेंडिंग जॉब नहीं है।</p>
                  ) : (
                    pendingJobsList.map((job) => (
                      <div key={job.jobSheetNo} style={{ border: '1px solid #fcd34d', padding: '10px', borderRadius: '6px', marginBottom: '10px', background: '#fffbeb' }}>
                        <div><strong>नंबर:</strong> {job.jobSheetNo}</div>
                        <div><strong>कस्टमर:</strong> {job.customerName} ({job.customerPhone})</div>
                        <div><strong>विवरण:</strong> {job.desc}</div>
                        <button onClick={() => handleFillComplaintToNewJob(job)} style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px' }}>
                          जारी रखें / अपडेट करें
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {staffSubTab === 'completed' && (
                <div>
                  <button onClick={() => setStaffSubTab('menu')} style={{ marginBottom: '10px', padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px' }}>← पीछे जाएं</button>
                  <h4>कम्पलीट जॉब्स (Completed Jobs - OK)</h4>
                  {completedJobsList.length === 0 ? (
                    <p style={{ color: '#64748b' }}>अभी तक कोई जॉब कम्पलीट नहीं हुई है।</p>
                  ) : (
                    completedJobsList.map((job) => (
                      <div key={job.jobSheetNo} style={{ border: '1px solid #86efac', padding: '10px', borderRadius: '6px', marginBottom: '10px', background: '#f0fdf4' }}>
                        <div><strong>जॉब नंबर:</strong> {job.jobSheetNo}</div>
                        <div><strong>कस्टमर:</strong> {job.customerName} ({job.customerPhone})</div>
                        <div><strong>उत्पाद:</strong> {job.product}</div>
                        <div><strong>कार्य विवरण:</strong> {job.desc}</div>
                        <div><strong>स्टाफ:</strong> {job.staffName}</div>
                        <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>तारीख: {job.date} | स्टेटस: Completed ✅</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {staffSubTab === 'partPending' && (
                <div>
                  <button onClick={() => setStaffSubTab('menu')} style={{ marginBottom: '10px', padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px' }}>← पीछे जाएं</button>
                  <h4>स्पेयर पार्ट पेंडिंग जॉब्स (Spare Part Pending)</h4>
                  {partPendingJobsList.length === 0 ? (
                    <p style={{ color: '#64748b' }}>कोई स्पेयर पार्ट पेंडिंग जॉब नहीं है।</p>
                  ) : (
                    partPendingJobsList.map((job) => (
                      <div key={job.jobSheetNo} style={{ border: '1px solid #c4b5fd', padding: '10px', borderRadius: '6px', marginBottom: '10px', background: '#f5f3ff' }}>
                        <div><strong>नंबर:</strong> {job.jobSheetNo}</div>
                        <div><strong>कस्टमर:</strong> {job.customerName} ({job.customerPhone})</div>
                        <div><strong>मंगवाना है पार्ट:</strong> {job.sparePartName} (मॉडल: {job.sparePartModel})</div>
                        <button onClick={() => handleFillComplaintToNewJob(job)} style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px' }}>
                          पार्ट स्टेटस अपडेट करें
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {staffSubTab === 'newJobForm' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <button onClick={() => setStaffSubTab('menu')} style={{ padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px' }}>← मेनू पर वापस जाएं</button>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Wizard Step: {wizardStep} / 5</span>
                  </div>

                  {wizardStep === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4>स्टेप 1: कस्टमर और प्रॉडक्ट विवरण</h4>
                      <label>कस्टमर का नाम:</label>
                      <input type="text" value={jobCustName} onChange={(e) => setJobCustName(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />

                      <label>कस्टमर मोबाइल नंबर:</label>
                      <input type="tel" maxLength="10" value={jobCustPhone} onChange={(e) => setJobCustPhone(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />

                      <label>कस्टमर का पूरा पता (Address):</label>
                      <textarea rows="2" value={jobCustAddress} onChange={(e) => setJobCustAddress(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />

                      <label>श्रेणी (Category):</label>
                      <select value={categoryType} onChange={(e) => setCategoryType(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                        <option value="HVAC & Refrigeration">HVAC & Refrigeration</option>
                        <option value="Electrical Work">Electrical Work</option>
                        <option value="Plumbing Work">Plumbing Work</option>
                        <option value="Civil Work">Civil Work</option>
                      </select>

                      <button onClick={() => setWizardStep(2)} style={{ marginTop: '10px', padding: '10px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                        अगला (Next) →
                      </button>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4>स्टेप 2: टेक्निकल पैरामीटर्स</h4>
                      {categoryType === 'HVAC & Refrigeration' && (
                        <>
                          <label>इंडोर मॉडल / सीरियल:</label>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <input type="text" placeholder="Indoor Model" value={indoorModel} onChange={(e) => setIndoorModel(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                            <input type="text" placeholder="Indoor Serial" value={indoorSerial} onChange={(e) => setIndoorSerial(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                          </div>

                          <label>आउटडोर मॉडल / सीरियल:</label>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <input type="text" placeholder="Outdoor Model" value={outdoorModel} onChange={(e) => setOutdoorModel(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                            <input type="text" placeholder="Outdoor Serial" value={outdoorSerial} onChange={(e) => setOutdoorSerial(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                          </div>

                          <label>सेक्शन प्रेशर (PSI):</label>
                          <input type="text" placeholder="e.g. 120 PSI" value={sectionPressure} onChange={(e) => setSectionPressure(e.target.value)} style={{ padding: '8px' }} />

                          <label>रूम टेम्परेचर (°C):</label>
                          <input type="text" placeholder="e.g. 24°C" value={roomTemp} onChange={(e) => setRoomTemp(e.target.value)} style={{ padding: '8px' }} />
                        </>
                      )}

                      {categoryType !== 'Civil Work' && (
                        <>
                          <label>वोल्टेज और एम्पीयर:</label>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <input type="text" placeholder="Voltage" value={voltage} onChange={(e) => setVoltage(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                            <input type="text" placeholder="Ampere" value={ampere} onChange={(e) => setAmpere(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                          </div>
                        </>
                      )}

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button onClick={() => setWizardStep(1)} style={{ flex: 1, padding: '10px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px' }}>← पीछे</button>
                        <button onClick={() => setWizardStep(3)} style={{ flex: 1, padding: '10px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>अगला →</button>
                      </div>
                    </div>
                  )}

                  {wizardStep === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4>स्टेप 3: किया गया कार्य और स्पेयर पार्ट्स</h4>
                      <label>किया गया कार्य (Work Done):</label>
                      <textarea rows="3" value={workDone} onChange={(e) => setWorkDone(e.target.value)} style={{ padding: '8px' }} />

                      <label>स्पेयर पार्ट विकल्प:</label>
                      <select value={sparePartOption} onChange={(e) => setSparePartOption(e.target.value)} style={{ padding: '8px' }}>
                        <option value="Used Part">Used Part (इस्तेमाल किया गया)</option>
                        <option value="Pending Part">Pending Part (पार्ट मंगवाना है)</option>
                      </select>

                      <label>स्पेयर पार्ट का नाम और मॉडल:</label>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <input type="text" placeholder="Part Name" value={sparePartName} onChange={(e) => setSparePartName(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                        <input type="text" placeholder="Model / No." value={sparePartModel} onChange={(e) => setSparePartModel(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button onClick={() => setWizardStep(2)} style={{ flex: 1, padding: '10px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px' }}>← पीछे</button>
                        <button onClick={() => setWizardStep(4)} style={{ flex: 1, padding: '10px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>अगला →</button>
                      </div>
                    </div>
                  )}

                  {wizardStep === 4 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4>स्टेप 4: मैटेरियल्स / पार्ट्स लिस्ट</h4>
                      {materials.map((mat, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                          <input 
                            type="text" 
                            placeholder="Item Name" 
                            value={mat.name} 
                            onChange={(e) => handleMaterialFieldChange(idx, 'name', e.target.value)}
                            style={{ flex: 2, padding: '6px' }} 
                          />
                          <input 
                            type="text" 
                            placeholder="Qty" 
                            value={mat.qty} 
                            onChange={(e) => handleMaterialFieldChange(idx, 'qty', e.target.value)}
                            style={{ flex: 1, padding: '6px' }} 
                          />
                          <input 
                            type="text" 
                            placeholder="Price" 
                            value={mat.price} 
                            onChange={(e) => handleMaterialFieldChange(idx, 'price', e.target.value)}
                            style={{ flex: 1, padding: '6px' }} 
                          />
                        </div>
                      ))}

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button onClick={() => setWizardStep(3)} style={{ flex: 1, padding: '10px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px' }}>← पीछे</button>
                        <button onClick={() => setWizardStep(5)} style={{ flex: 1, padding: '10px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>अगला →</button>
                      </div>
                    </div>
                  )}

                  {wizardStep === 5 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4>स्टेप 5: स्टेटस, फोटो और डिजिटल हस्ताक्षर</h4>
                      <label>जॉब स्टेटस:</label>
                      <select value={jobStatusType} onChange={(e) => setJobStatusType(e.target.value)} style={{ padding: '8px' }}>
                        <option value="Completed">Completed (पूर्ण)</option>
                        <option value="Pending">Pending (लंबित)</option>
                      </select>

                      {jobStatusType === 'Pending' && (
                        <>
                          <label>पेंडिंग का कारण:</label>
                          <select value={pendingSubOption} onChange={(e) => setPendingSubOption(e.target.value)} style={{ padding: '8px' }}>
                            <option value="Part Pending">Part Pending (पार्ट प्रतीक्षित)</option>
                            <option value="Repeat Complaint">Repeat Complaint</option>
                            <option value="Customer Busy">Customer Busy</option>
                          </select>
                        </>
                      )}

                      <label>फोटो अपलोड करें:</label>
                      <input type="file" accept="image/*" onChange={handleFileChange} style={{ padding: '6px' }} />

                      <label>कस्टमर हस्ताक्षर (Sign Below):</label>
                      <div style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', touchAction: 'none' }}>
                        <canvas 
                          ref={canvasRef} 
                          width={320} 
                          height={120} 
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          style={{ display: 'block', margin: '0 auto', cursor: 'crosshair' }}
                        />
                      </div>
                      <button type="button" onClick={clearSignature} style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', alignSelf: 'flex-start' }}>हस्ताक्षर साफ करें</button>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button onClick={() => setWizardStep(4)} style={{ flex: 1, padding: '10px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px' }}>← पीछे</button>
                        <button 
                          onClick={handleJobSubmit} 
                          disabled={uploading}
                          style={{ flex: 2, padding: '12px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                          {uploading ? 'सेव हो रहा है...' : 'जॉब शीट फाइनल सेव करें (Submit)'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. ऑफिस एडमिन टैब */}
      {activeTab === 'admin' && (
        <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>ऑफिस एडमिन पोर्टल</h3>
          {!adminLoggedIn ? (
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontWeight: 'bold' }}>यूजरनेम (Username):</label>
              <input 
                type="text" 
                placeholder="Admin" 
                value={adminUser} 
                onChange={(e) => setAdminUser(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                required 
              />
              <label style={{ fontWeight: 'bold' }}>पासवर्ड (Password):</label>
              <input 
                type="password" 
                placeholder="Password" 
                value={adminPass} 
                onChange={(e) => setAdminPass(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                required 
              />
              <button type="submit" style={{ padding: '10px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                लॉगिन करें
              </button>
            </form>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                <button 
                  onClick={() => setAdminSection('jobs')}
                  style={{ flex: 1, padding: '8px', backgroundColor: adminSection === 'jobs' ? '#166534' : '#e2e8f0', color: adminSection === 'jobs' ? '#fff' : '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                  जॉब शीट्स ({jobSheets.length})
                </button>
                <button 
                  onClick={() => setAdminSection('logins')}
                  style={{ flex: 1, padding: '8px', backgroundColor: adminSection === 'logins' ? '#166534' : '#e2e8f0', color: adminSection === 'logins' ? '#fff' : '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                  लॉगिन लॉग्स ({loginLogs.length})
                </button>
              </div>

              {adminSection === 'jobs' && (
                <div>
                  <h4>सभी जॉब शीट्स</h4>
                  {jobSheets.length === 0 ? (
                    <p style={{ color: '#64748b' }}>कोई जॉब शीट उपलब्ध नहीं है।</p>
                  ) : (
                    jobSheets.map((job) => (
                      <div key={job.jobSheetNo} style={{ border: '1px solid #cbd5e1', padding: '10px', borderRadius: '6px', marginBottom: '10px', background: '#f8fafc' }}>
                        <div><strong>जॉब नंबर:</strong> {job.jobSheetNo}</div>
                        <div><strong>कस्टमर:</strong> {job.customerName} ({job.customerPhone})</div>
                        <div><strong>पता:</strong> {job.customerAddress}</div>
                        <div><strong>उत्पाद:</strong> {job.product}</div>
                        <div><strong>स्टाफ:</strong> {job.staffName}</div>
                        <div><strong>स्थिति:</strong> <span style={{ color: job.status === 'Completed' ? 'green' : 'orange' }}>{job.status}</span></div>

                        {adminExpandedJobId === job.jobSheetNo && (
                          <div style={{ marginTop: '10px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', fontSize: '13px' }}>
                            <div><strong>विवरण:</strong> {job.desc}</div>
                            <div><strong>GPS:</strong> {job.location}</div>
                            <div><strong>पार्ट:</strong> {job.sparePartName} ({job.sparePartOption})</div>
                            {job.photoURL && (
                              <div style={{ marginTop: '5px' }}>
                                <a href={job.photoURL} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>📸 अपलोड की गई फोटो देखें</a>
                              </div>
                            )}
                          </div>
                        )}

                        <button 
                          onClick={() => setAdminExpandedJobId(adminExpandedJobId === job.jobSheetNo ? null : job.jobSheetNo)}
                          style={{ marginTop: '8px', padding: '5px 10px', background: '#475569', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px' }}>
                          {adminExpandedJobId === job.jobSheetNo ? 'कम दिखाएं' : 'विस्तार से देखें'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {adminSection === 'logins' && (
                <div>
                  <h4>यूजर लॉगिन हिस्ट्री (Login Logs)</h4>
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                    <button onClick={() => setLoginFilterTab('all')} style={{ padding: '4px 8px', fontSize: '12px', background: loginFilterTab === 'all' ? '#166534' : '#e2e8f0', color: loginFilterTab === 'all' ? '#fff' : '#000', border: 'none', borderRadius: '4px' }}>सभी</button>
                    <button onClick={() => setLoginFilterTab('customer')} style={{ padding: '4px 8px', fontSize: '12px', background: loginFilterTab === 'customer' ? '#166534' : '#e2e8f0', color: loginFilterTab === 'customer' ? '#fff' : '#000', border: 'none', borderRadius: '4px' }}>कस्टमर</button>
                    <button onClick={() => setLoginFilterTab('staff')} style={{ padding: '4px 8px', fontSize: '12px', background: loginFilterTab === 'staff' ? '#166534' : '#e2e8f0', color: loginFilterTab === 'staff' ? '#fff' : '#000', border: 'none', borderRadius: '4px' }}>स्टाफ</button>
                    <button onClick={() => setLoginFilterTab('office')} style={{ padding: '4px 8px', fontSize: '12px', background: loginFilterTab === 'office' ? '#166534' : '#e2e8f0', color: loginFilterTab === 'office' ? '#fff' : '#000', border: 'none', borderRadius: '4px' }}>ऑफिस</button>
                  </div>

                  {filteredLoginLogs.length === 0 ? (
                    <p style={{ color: '#64748b' }}>कोई लॉगिन रिकॉर्ड नहीं मिला।</p>
                  ) : (
                    filteredLoginLogs.map((log, idx) => (
                      <div key={idx} style={{ border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', marginBottom: '8px', background: '#fff', fontSize: '13px' }}>
                        <div><strong>नाम/आईडी:</strong> {log.name || log.phone}</div>
                        <div><strong>मोबाइल/आईडी:</strong> {log.phone}</div>
                        <div><strong>रोल:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{log.role}</span></div>
                        <div><strong>कुल लॉगिन:</strong> {log.loginCount || 1} बार</div>
                        <div><strong>अंतिम लॉगिन:</strong> {log.lastLabel || log.lastLoginText || 'Just now'}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}