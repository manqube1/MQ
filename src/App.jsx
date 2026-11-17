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
  onSnapshot, 
  addDoc 
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

  // Staff Slide-by-Slide Wizard Step (1 to 5)
  const [wizardStep, setWizardStep] = useState(1);

  // Admin / Office Staff Login State
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminSection, setAdminSection] = useState('jobs'); // 'jobs' or 'logins'
  const [loginFilterTab, setLoginFilterTab] = useState('all'); // 'all', 'customer', 'office', 'staff'

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
  
  // Spare Part Selection: 'Used Part' or 'Pending Part'
  const [sparePartOption, setSparePartOption] = useState('Used Part');
  const [sparePartName, setSparePartName] = useState('');
  const [sparePartModel, setSparePartModel] = useState('');

  // Status & Pending Sub-Options
  const [jobStatusType, setJobStatusType] = useState('Completed'); // 'Completed' or 'Pending'
  const [pendingSubOption, setPendingSubOption] = useState('Part Pending'); // 'Part Pending', 'Repeat Complaint', 'OK'
  
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

  // Firestore Real-time Sync for Jobs & Login Logs
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

  // Track Login Function (Customer, Staff, Office)
  const recordUserLogin = async (identifier, userRole, displayName) => {
    const cleanId = identifier.trim();
    if (!cleanId) return;

    // Update Local State immediately for instant UI feedback
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

    // Save to Firestore
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

  // Signature Pad Handlers
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

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Customer Portal Login
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
      stabilizer: '-',
      standType: '-',
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
    alert('शिकायत सफलतापूर्वक दर्ज हो गई!\nआपका कंप्लेंट नंबर है:\n' + jobSheetNo);
  };

  // Staff Portal OTP Login
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

  // Admin / Office Login
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
    setSparePartOption(comp.sparePartOption && comp.sparePartOption !== '-' ? comp.sparePartOption : 'Used Part');
    setSparePartName(comp.sparePartName && comp.sparePartName !== '-' ? comp.sparePartName : '');
    setSparePartModel(comp.sparePartModel && comp.sparePartModel !== '-' ? comp.sparePartModel : '');
    setOtherReason(comp.otherReason && comp.otherReason !== '-' ? comp.otherReason : '');
    setJobNote(comp.note && comp.note !== '-' ? comp.note : '');
    setWizardStep(1);
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
          stabilizer: categoryType === 'HVAC & Refrigeration' ? stabilizer : '-',
          standType: categoryType === 'HVAC & Refrigeration' ? standType : '-',
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

  // Filtered Lists for Staff & Admin
  const pendingJobsList = jobSheets.filter(j => j.status === 'Pending');
  const partPendingJobsList = jobSheets.filter(j => j.status === 'Part Pending' || j.sparePartOption === 'Pending Part');
  const usedPartsJobsList = jobSheets.filter(j => j.sparePartOption === 'Used Part' && j.sparePartName && j.sparePartName !== '-');

  const filteredLoginLogs = loginLogs.filter(log => {
    if (loginFilterTab === 'customer') return log.role === 'customer';
    if (loginFilterTab === 'office') return log.role === 'office';
    if (loginFilterTab === 'staff') return log.role === 'staff';
    return true;
  });

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '750px', margin: '0 auto', padding: '15px', background: '#f4f6f9', minHeight: '100vh' }}>
      
      {/* हेडर: कंपनी का लोगो और टैगलाइन केवल "We Build. Your Trust." तक */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px 0', background: '#fff', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <img 
          src="/1000384854.jpg" 
          alt="Manqube Logo" 
          style={{ height: '70px', width: '70px', objectFit: 'contain', borderRadius: '12px', marginBottom: '8px' }} 
        />
        <h1 style={{ margin: '0', color: '#1a365d', fontSize: '26px', fontWeight: '800', letterSpacing: '1px' }}>MANQUBE</h1>
        <p style={{ margin: '4px 0 0 0', color: '#555', fontSize: '13px', fontWeight: '600' }}>We Build. Your Trust.</p>
      </div>

      {/* मुख्य मेनू (Home Portal Selection) */}
      {activeTab === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
          <div style={{ textAlign: 'center', marginBottom: '5px' }}>
            <h3 style={{ color: '#333', margin: '0 0 5px 0' }}>पोर्टल चुनें (Select Portal)</h3>
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>कृपया आगे बढ़ने के लिए अपना संबंधित पोर्टल चुनें:</p>
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
              <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>ऑफिस स्टाफ लॉगिन करके पेंडिंग जॉब्स, स्पेयर पार्ट्स और लॉगिन रिकॉर्ड देखें</p>
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

      {/* ==================== 1. कस्टमर पोर्टल ==================== */}
      {activeTab === 'customer' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          {!custLoggedIn ? (
            <form onSubmit={handleCustomerLogin}>
              <h3>कस्टमर पोर्टल</h3>
              <p style={{ fontSize: '13px', color: '#555' }}>अपनी शिकायतें और पूरी हुई जॉब-शीट देखने के लिए अपना मोबाइल नंबर दर्ज करें:</p>
              <input type="tel" placeholder="मोबाइल नंबर दर्ज करें" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />
              <button type="submit" style={{ width: '100%', padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>आगे बढ़ें</button>
            </form>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                <h4 style={{ margin: 0 }}>स्वागत है! मोबाइल: {custPhone}</h4>
                <button onClick={() => setCustLoggedIn(false)} style={{ padding: '5px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>लॉगआउट</button>
              </div>

              <form onSubmit={handleNewComplaint} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ marginTop: 0, color: '#007bff' }}>नई शिकायत दर्ज करें (New Complaint)</h4>
                
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>मुख्य श्रेणी (Main Category):</label>
                <select value={categoryType} onChange={handleCategoryChange} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
                  <option value="HVAC & Refrigeration">HVAC & Refrigeration (एसी, कूलर, फ्रिज आदि)</option>
                  <option value="Electrical Work">Electrical Work (इलेक्ट्रिकल वर्क)</option>
                  <option value="Plumbing Work">Plumbing Work (प्लंबिंग वर्क)</option>
                  <option value="Civil Work">Civil Work (सिविल वर्क)</option>
                </select>

                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>संबंधित कार्य (Sub-Option):</label>
                <select value={productType} onChange={(e) => setProductType(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
                  {categoryType === 'HVAC & Refrigeration' && (
                    <>
                      <option value="Split / Window AC">Split / Window AC</option>
                      <option value="Air Cooler">Air Cooler</option>
                      <option value="Deep Freezer / Refrigerator">Deep Freezer / Refrigerator</option>
                      <option value="Water Cooler">Water Cooler</option>
                    </>
                  )}
                  {categoryType === 'Electrical Work' && (
                    <>
                      <option value="House Wiring & Panel">House Wiring & Panel</option>
                      <option value="Inverter / Stabilizer">Inverter / Stabilizer</option>
                      <option value="Motor & Pump">Motor & Pump</option>
                    </>
                  )}
                  {categoryType === 'Plumbing Work' && (
                    <>
                      <option value="Pipe Fitting & Leakage Repair">Pipe Fitting & Leakage Repair</option>
                      <option value="Tap, Mixer & Sanitary Fitting">Tap, Mixer & Sanitary Fitting</option>
                      <option value="Water Tank & Motor Line">Water Tank & Motor Line</option>
                    </>
                  )}
                  {categoryType === 'Civil Work' && (
                    <>
                      <option value="Flooring & Tiling">Flooring & Tiling</option>
                      <option value="Plaster & Painting">Plaster & Painting</option>
                      <option value="General Civil Maintenance">General Civil Maintenance</option>
                    </>
                  )}
                </select>

                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>समस्या का विवरण:</label>
                <textarea placeholder="क्या समस्या आ रही है विस्तार से लिखें..." value={problemDesc} onChange={(e) => setProblemDesc(e.target.value)} rows="3" style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />
                
                <button type="submit" style={{ width: '100%', padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>शिकायत सबमिट करें</button>
              </form>

              <h4>आपकी शिकायतें और जॉब हिस्ट्री:</h4>
              {jobSheets.filter(j => j.customerPhone === custPhone).length === 0 ? (
                <p style={{ color: '#777', fontSize: '13px' }}>इस नंबर पर अभी तक कोई रिकॉर्ड नहीं मिला।</p>
              ) : (
                jobSheets.filter(j => j.customerPhone === custPhone).map((job, i) => (
                  <div key={i} style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '6px', marginBottom: '10px', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
                      <span>{job.jobSheetNo}</span>
                      <span style={{ color: job.status === 'Completed' ? 'green' : '#d97706' }}>{job.status}</span>
                    </div>
                    <p style={{ margin: '5px 0', fontSize: '13px', color: '#333' }}>{job.product} - {job.desc}</p>
                    <small style={{ color: '#777' }}>तारीख: {job.date}</small>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== 2. फ़ील्ड स्टाफ पोर्टल (स्लाइड-बाय-स्लाइड फॉर्म के साथ) ==================== */}
      {activeTab === 'staff' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          {!staffLoggedIn ? (
            <div>
              <h3 style={{ marginTop: 0, color: '#28a745' }}>🛠️ फ़ील्ड स्टाफ लॉगिन</h3>
              {otpStep === 1 ? (
                <form onSubmit={handleSendOtp}>
                  <p style={{ fontSize: '13px', color: '#555' }}>अपना रजिस्टर्ड मोबाइल नंबर दर्ज करें:</p>
                  <input type="tel" placeholder="10 अंकों का मोबाइल नंबर" value={staffPhoneInput} onChange={(e) => setStaffPhoneInput(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />
                  <button type="submit" style={{ width: '100%', padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>OTP भेजें</button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <p style={{ fontSize: '13px', color: '#555' }}>मोबाइल नंबर {staffPhoneInput} पर भेजा गया 4-अंकों का OTP दर्ज करें:</p>
                  <input type="text" placeholder="OTP दर्ज करें" value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />
                  <button type="submit" style={{ width: '100%', padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>सत्यापित करें और लॉगिन करें</button>
                  <button type="button" onClick={() => setOtpStep(1)} style={{ width: '100%', padding: '8px', marginTop: '8px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '12px' }}>नंबर बदलें</button>
                </form>
              )}
            </div>
          ) : (
            <div>
              {/* Staff Header Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e9f7ef', padding: '10px 12px', borderRadius: '6px', marginBottom: '15px' }}>
                <div>
                  <strong style={{ color: '#155724', fontSize: '14px' }}>{currentStaffName}</strong>
                  <div style={{ fontSize: '11px', color: '#28a745' }}>📍 {staffGpsLocation}</div>
                </div>
                <button onClick={() => setStaffLoggedIn(false)} style={{ padding: '6px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>लॉगआउट</button>
              </div>

              {/* Staff Sub-Menu */}
              {staffSubTab === 'menu' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button onClick={handleOpenBlankNewJob} style={{ padding: '16px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>📝 नई जॉब शीट भरें (Slide-by-Slide)</span>
                    <span>➡️</span>
                  </button>

                  <button onClick={() => setStaffSubTab('pending')} style={{ padding: '16px', background: '#ffc107', color: '#212529', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⏳ पेंडिंग शिकायतें / जॉब्स ({pendingJobsList.length})</span>
                    <span>➡️</span>
                  </button>

                  <button onClick={() => setStaffSubTab('partPending')} style={{ padding: '16px', background: '#fd7e14', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚙️ पार्ट पेंडिंग जॉब्स ({partPendingJobsList.length})</span>
                    <span>➡️</span>
                  </button>
                </div>
              )}

              {/* Pending & Part Pending Lists for Staff */}
              {(staffSubTab === 'pending' || staffSubTab === 'partPending') && (
                <div>
                  <button onClick={() => setStaffSubTab('menu')} style={{ marginBottom: '12px', padding: '6px 12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>⬅️ स्टाफ मेनू पर वापस</button>
                  <h4 style={{ margin: '0 0 10px 0' }}>{staffSubTab === 'pending' ? 'पेंडिंग शिकायतें (Pending Jobs)' : 'पार्ट पेंडिंग जॉब्स (Part Pending)'}</h4>
                  
                  {(staffSubTab === 'pending' ? pendingJobsList : partPendingJobsList).length === 0 ? (
                    <p style={{ color: '#777', fontSize: '13px' }}>इस श्रेणी में कोई जॉब नहीं है।</p>
                  ) : (
                    (staffSubTab === 'pending' ? pendingJobsList : partPendingJobsList).map((item, idx) => (
                      <div key={idx} style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '6px', marginBottom: '10px', background: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
                          <span>{item.jobSheetNo} - {item.customerName}</span>
                          <span style={{ color: '#d97706' }}>{item.status}</span>
                        </div>
                        <p style={{ margin: '4px 0', fontSize: '12px' }}>📞 {item.customerPhone} | 📍 {item.customerAddress}</p>
                        <p style={{ margin: '4px 0', fontSize: '12px', color: '#444' }}>कार्य: {item.product} - {item.desc}</p>
                        {item.sparePartName && item.sparePartName !== '-' && (
                          <p style={{ margin: '4px 0', fontSize: '12px', color: '#c0392b', fontWeight: 'bold' }}>पार्ट: {item.sparePartName} (Model: {item.sparePartModel})</p>
                        )}
                        <button onClick={() => handleFillComplaintToNewJob(item)} style={{ marginTop: '8px', padding: '8px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                          जॉब शीट अपडेट / क्लोज करें ➡️
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ==================== स्लाइड-बाय-स्लाइड जॉब शीट फॉर्म (Wizard UI) ==================== */}
              {staffSubTab === 'new' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, color: '#007bff' }}>नई जॉब शीट / सर्विस रिपोर्ट</h4>
                    <button onClick={() => setStaffSubTab('menu')} style={{ padding: '5px 10px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>बैक मेनू</button>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', background: '#e9ecef', height: '8px', borderRadius: '4px', marginBottom: '8px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: wizardStep === 1 ? '20%' : wizardStep === 2 ? '40%' : wizardStep === 3 ? '60%' : wizardStep === 4 ? '80%' : '100%', 
                      background: '#007bff', 
                      height: '100%', 
                      transition: 'width 0.3s ease' 
                    }}></div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '15px' }}>
                    स्लाइड (Step) {wizardStep} / 5
                  </div>

                  {/* SLIDE 1: मुख्य श्रेणी + कस्टमर नाम + मोबाइल नंबर */}
                  {wizardStep === 1 && (
                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', color: '#1a365d' }}>मुख्य श्रेणी (Category):</label>
                      <select value={categoryType} onChange={handleCategoryChange} style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '5px', border: '1px solid #ccc' }}>
                        <option value="HVAC & Refrigeration">HVAC & Refrigeration (एसी, कूलर, फ्रिज आदि)</option>
                        <option value="Electrical Work">Electrical Work (इलेक्ट्रिकल वर्क)</option>
                        <option value="Plumbing Work">Plumbing Work (प्लंबिंग वर्क)</option>
                        <option value="Civil Work">Civil Work (सिविल वर्क)</option>
                      </select>

                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', color: '#1a365d' }}>संबंधित प्रोडक्ट / कार्य (Sub-Option):</label>
                      <select value={productType} onChange={(e) => setProductType(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '5px', border: '1px solid #ccc' }}>
                        {categoryType === 'HVAC & Refrigeration' && (
                          <>
                            <option value="Split / Window AC">Split / Window AC</option>
                            <option value="Air Cooler">Air Cooler</option>
                            <option value="Deep Freezer / Refrigerator">Deep Freezer / Refrigerator</option>
                            <option value="Water Cooler">Water Cooler</option>
                          </>
                        )}
                        {categoryType === 'Electrical Work' && (
                          <>
                            <option value="House Wiring & Panel">House Wiring & Panel</option>
                            <option value="Inverter / Stabilizer">Inverter / Stabilizer</option>
                            <option value="Motor & Pump">Motor & Pump</option>
                          </>
                        )}
                        {categoryType === 'Plumbing Work' && (
                          <>
                            <option value="Pipe Fitting & Leakage Repair">Pipe Fitting & Leakage Repair</option>
                            <option value="Tap, Mixer & Sanitary Fitting">Tap, Mixer & Sanitary Fitting</option>
                            <option value="Water Tank & Motor Line">Water Tank & Motor Line</option>
                          </>
                        )}
                        {categoryType === 'Civil Work' && (
                          <>
                            <option value="Flooring & Tiling">Flooring & Tiling</option>
                            <option value="Plaster & Painting">Plaster & Painting</option>
                            <option value="General Civil Maintenance">General Civil Maintenance</option>
                          </>
                        )}
                      </select>

                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>कस्टमर का नाम (Customer Name):</label>
                      <input type="text" placeholder="ग्राहक का नाम दर्ज करें" value={jobCustName} onChange={(e) => setJobCustName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />

                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>कस्टमर का मोबाइल नंबर (Mobile Number):</label>
                      <input type="tel" placeholder="मोबाइल नंबर दर्ज करें" value={jobCustPhone} onChange={(e) => setJobCustPhone(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />

                      <button 
                        type="button" 
                        onClick={() => {
                          if (!jobCustName || !jobCustPhone) {
                            alert('कृपया कस्टमर का नाम और मोबाइल नंबर भरें!');
                            return;
                          }
                          setWizardStep(2);
                        }} 
                        style={{ width: '100%', padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                      >
                        अगला स्लाइड (पता भरें) ➡️
                      </button>
                    </div>
                  )}

                  {/* SLIDE 2: पता (Address) */}
                  {wizardStep === 2 && (
                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>साइट / ग्राहक का पूरा पता (Address):</label>
                      <textarea placeholder="पूरा पता दर्ज करें..." rows="3" value={jobCustAddress} onChange={(e) => setJobCustAddress(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" onClick={() => setWizardStep(1)} style={{ width: '50%', padding: '12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>⬅️ पिछला स्लाइड</button>
                        <button type="button" onClick={() => setWizardStep(3)} style={{ width: '50%', padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>अगला स्लाइड ➡️</button>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 3: प्रॉब्लम क्या थी और किया गया काम + टेक्निकल डिटेल्स */}
                  {wizardStep === 3 && (
                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>प्रॉब्लम क्या थी / किया गया काम (Problem & Work Done):</label>
                      <textarea placeholder="क्या समस्या थी और क्या काम किया गया विस्तार से लिखें..." rows="3" value={workDone} onChange={(e) => setWorkDone(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />

                      {categoryType === 'HVAC & Refrigeration' && (
                        <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '12px' }}>
                          <strong style={{ fontSize: '12px', color: '#007bff', display: 'block', marginBottom: '8px' }}>मशीन टेक्निकल रीडिंग (वैकल्पिक):</strong>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                            <input type="text" placeholder="Indoor Model" value={indoorModel} onChange={(e) => setIndoorModel(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }} />
                            <input type="text" placeholder="Outdoor Model" value={outdoorModel} onChange={(e) => setOutdoorModel(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }} />
                            <input type="text" placeholder="Gas Pressure (PSI)" value={sectionPressure} onChange={(e) => setSectionPressure(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }} />
                            <input type="text" placeholder="Ampere (A)" value={ampere} onChange={(e) => setAmpere(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }} />
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" onClick={() => setWizardStep(2)} style={{ width: '50%', padding: '12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>⬅️ पिछला स्लाइड</button>
                        <button type="button" onClick={() => setWizardStep(4)} style={{ width: '50%', padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>अगला स्लाइड ➡️</button>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 4: क्या सामान लगा / स्पेयर पार्ट ऑप्शन (Used Part या Pending Part) */}
                  {wizardStep === 4 && (
                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#1a365d' }}>स्पेयर पार्ट्स विवरण (Spare Parts):</label>
                      
                      <select 
                        value={sparePartOption} 
                        onChange={(e) => setSparePartOption(e.target.value)} 
                        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', fontWeight: 'bold' }}
                      >
                        <option value="Used Part">✅ Used Part (जो सामान / पार्ट लगा है)</option>
                        <option value="Pending Part">⏳ Pending Part (जो पार्ट पेंडिंग है)</option>
                      </select>

                      <input 
                        type="text" 
                        placeholder={sparePartOption === 'Used Part' ? "इस्तेमाल किए गए पार्ट का नाम लिखें" : "पेंडिंग पार्ट का नाम लिखें"} 
                        value={sparePartName} 
                        onChange={(e) => setSparePartName(e.target.value)} 
                        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
                      />

                      <input 
                        type="text" 
                        placeholder="पार्ट का मॉडल नंबर / साइज (Model Number)" 
                        value={sparePartModel} 
                        onChange={(e) => setSparePartModel(e.target.value)} 
                        style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
                      />

                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#555' }}>अतिरिक्त मटेरियल लिस्ट (मात्रा व दाम सहित - वैकल्पिक):</label>
                      {materials.map((mat, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                          <input type="text" placeholder="सामान का नाम" value={mat.name} onChange={(e) => handleMaterialFieldChange(idx, 'name', e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }} />
                          <input type="text" placeholder="मात्रा" value={mat.qty} onChange={(e) => handleMaterialFieldChange(idx, 'qty', e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }} />
                          <input type="text" placeholder="दाम (₹)" value={mat.price} onChange={(e) => handleMaterialFieldChange(idx, 'price', e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }} />
                        </div>
                      ))}

                      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        <button type="button" onClick={() => setWizardStep(3)} style={{ width: '50%', padding: '12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>⬅️ पिछला स्लाइड</button>
                        <button type="button" onClick={() => setWizardStep(5)} style={{ width: '50%', padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>अगला स्लाइड ➡️</button>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 5: जॉब स्टेटस (Completed / Pending -> 3 Sub-Options) + Signature + Submit */}
                  {wizardStep === 5 && (
                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#1a365d' }}>जॉब स्टेटस चुनें (Job Status):</label>
                      
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <button 
                          type="button" 
                          onClick={() => setJobStatusType('Completed')} 
                          style={{ 
                            flex: 1, 
                            padding: '12px', 
                            borderRadius: '6px', 
                            border: '2px solid #28a745', 
                            background: jobStatusType === 'Completed' ? '#28a745' : '#fff', 
                            color: jobStatusType === 'Completed' ? '#fff' : '#28a745', 
                            fontWeight: 'bold', 
                            cursor: 'pointer' 
                          }}
                        >
                          ✅ Complete (पूरा हुआ)
                        </button>

                        <button 
                          type="button" 
                          onClick={() => setJobStatusType('Pending')} 
                          style={{ 
                            flex: 1, 
                            padding: '12px', 
                            borderRadius: '6px', 
                            border: '2px solid #ffc107', 
                            background: jobStatusType === 'Pending' ? '#ffc107' : '#fff', 
                            color: jobStatusType === 'Pending' ? '#212529' : '#b78103', 
                            fontWeight: 'bold', 
                            cursor: 'pointer' 
                          }}
                        >
                          ⏳ Pending (पेंडिंग)
                        </button>
                      </div>

                      {/* यदि Pending चुना गया है तो 3 सब-ऑप्शन */}
                      {jobStatusType === 'Pending' && (
                        <div style={{ background: '#fff3cd', padding: '12px', borderRadius: '6px', border: '1px solid #ffeeba', marginBottom: '15px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#856404' }}>पेंडिंग का कारण / विकल्प चुनें:</label>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                              <input type="radio" name="pendingOpt" checked={pendingSubOption === 'Part Pending'} onChange={() => setPendingSubOption('Part Pending')} />
                              1. पार्ट पेंडिंग (Part Pending)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                              <input type="radio" name="pendingOpt" checked={pendingSubOption === 'Repeat Complaint'} onChange={() => setPendingSubOption('Repeat Complaint')} />
                              2. रिपीट कंप्लेंट (Repeat Complaint)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                              <input type="radio" name="pendingOpt" checked={pendingSubOption === 'OK'} onChange={() => setPendingSubOption('OK')} />
                              3. ओके (OK)
                            </label>
                          </div>

                          {/* Option 1: Part Pending -> पार्ट का नाम और मॉडल नंबर लिखने के लिए */}
                          {pendingSubOption === 'Part Pending' && (
                            <div style={{ spaceY: '8px' }}>
                              <input 
                                type="text" 
                                placeholder="पेंडिंग पार्ट का नाम लिखें (Part Name)" 
                                value={sparePartName} 
                                onChange={(e) => {
                                  setSparePartName(e.target.value);
                                  setSparePartOption('Pending Part');
                                }} 
                                style={{ width: '100%', padding: '10px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
                              />
                              <input 
                                type="text" 
                                placeholder="मॉडल नंबर लिखें (Model Number)" 
                                value={sparePartModel} 
                                onChange={(e) => setSparePartModel(e.target.value)} 
                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
                              />
                            </div>
                          )}

                          {/* Option 3: OK -> विशेष नोट */}
                          {pendingSubOption === 'OK' && (
                            <input 
                              type="text" 
                              placeholder="अन्य कोई नोट या रीजन (वैकल्पिक)" 
                              value={otherReason} 
                              onChange={(e) => setOtherReason(e.target.value)} 
                              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
                            />
                          )}
                        </div>
                      )}

                      {/* कस्टमर सिग्नेचर पैड: केवल 'Completed' या 'Repeat Complaint' चुनने पर दिखेगा */}
                      {(jobStatusType === 'Completed' || (jobStatusType === 'Pending' && pendingSubOption === 'Repeat Complaint')) && (
                        <div style={{ marginBottom: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>✍️ कस्टमर सिग्नेचर (Customer Signature):</label>
                            <button type="button" onClick={clearSignature} style={{ padding: '4px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>रीसेट</button>
                          </div>
                          <canvas
                            ref={canvasRef}
                            width={320}
                            height={110}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            style={{ border: '2px dashed #007bff', borderRadius: '6px', background: '#fff', width: '100%', touchAction: 'none' }}
                          />
                        </div>
                      )}

                      {/* साइट फोटो अपलोड (वैकल्पिक) */}
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>📷 साइट / मशीन की फोटो (वैकल्पिक):</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ fontSize: '12px' }} />
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" onClick={() => setWizardStep(4)} style={{ width: '40%', padding: '12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>⬅️ पीछे</button>
                        <button 
                          type="button" 
                          disabled={uploading}
                          onClick={handleJobSubmit} 
                          style={{ width: '60%', padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                        >
                          {uploading ? 'सबमिट हो रहा है...' : '✔️ जॉब शीट सबमिट करें'}
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

      {/* ==================== 3. एडमिन & ऑफिस पैनल ==================== */}
      {activeTab === 'admin' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          {!adminLoggedIn ? (
            <form onSubmit={handleAdminLogin}>
              <h3 style={{ marginTop: 0, color: '#d39e00' }}>📊 एडमिन & ऑफिस स्टाफ लॉगिन</h3>
              <input type="text" placeholder="यूजरनेम (ADMIN)" value={adminUser} onChange={(e) => setAdminUser(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />
              <input type="password" placeholder="पासवर्ड" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />
              <button type="submit" style={{ width: '100%', padding: '12px', background: '#ffc107', color: '#212529', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>लॉगिन करें</button>
            </form>
          ) : (
            <div>
              {/* Admin Top Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, color: '#1a365d', fontSize: '16px' }}>📊 एडमिन कंट्रोल पैनल</h3>
                <button onClick={() => setAdminLoggedIn(false)} style={{ padding: '6px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>लॉगआउट</button>
              </div>

              {/* Admin Main Section Switcher: जॉब्स और स्पेयर पार्ट्स vs लॉगिन रिकॉर्ड */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button 
                  onClick={() => setAdminSection('jobs')} 
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', background: adminSection === 'jobs' ? '#1a365d' : '#e2e8f0', color: adminSection === 'jobs' ? '#fff' : '#333' }}
                >
                  📋 जॉब्स & स्पेयर पार्ट्स ({jobSheets.length})
                </button>
                <button 
                  onClick={() => setAdminSection('logins')} 
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', background: adminSection === 'logins' ? '#1a365d' : '#e2e8f0', color: adminSection === 'logins' ? '#fff' : '#333' }}
                >
                  🔐 लॉगिन (Login History)
                </button>
              </div>

              {/* SECTION A: जॉब्स और स्पेयर पार्ट्स (Pending Part & Used Part) */}
              {adminSection === 'jobs' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px', textAlign: 'center' }}>
                    <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '6px', border: '1px solid #ffeeba' }}>
                      <div style={{ fontSize: '11px', color: '#856404' }}>Pending Jobs</div>
                      <strong style={{ fontSize: '18px', color: '#856404' }}>{pendingJobsList.length}</strong>
                    </div>
                    <div style={{ background: '#f8d7da', padding: '10px', borderRadius: '6px', border: '1px solid #f5c6cb' }}>
                      <div style={{ fontSize: '11px', color: '#721c24' }}>Part Pending</div>
                      <strong style={{ fontSize: '18px', color: '#721c24' }}>{partPendingJobsList.length}</strong>
                    </div>
                    <div style={{ background: '#d4edda', padding: '10px', borderRadius: '6px', border: '1px solid #c3e6cb' }}>
                      <div style={{ fontSize: '11px', color: '#155724' }}>Used Parts</div>
                      <strong style={{ fontSize: '18px', color: '#155724' }}>{usedPartsJobsList.length}</strong>
                    </div>
                  </div>

                  <h4 style={{ margin: '10px 0', fontSize: '14px', color: '#333' }}>सभी जॉब शीट्स एवं स्पेयर पार्ट्स विवरण:</h4>
                  {jobSheets.length === 0 ? (
                    <p style={{ color: '#777', fontSize: '13px', textAlign: 'center', padding: '20px' }}>वर्तमान में कोई रिकॉर्ड नहीं है।</p>
                  ) : (
                    jobSheets.map((job, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setAdminExpandedJobId(adminExpandedJobId === idx ? null : idx)}
                        style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '6px', marginBottom: '10px', background: '#fafafa', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '13px', color: '#1a365d' }}>{job.jobSheetNo} - {job.customerName}</strong>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: 'bold', 
                            padding: '3px 8px', 
                            borderRadius: '4px', 
                            background: job.status === 'Completed' ? '#d4edda' : '#fff3cd', 
                            color: job.status === 'Completed' ? '#155724' : '#856404' 
                          }}>
                            {job.status} {job.pendingSubOption && job.pendingSubOption !== '-' ? `(${job.pendingSubOption})` : ''}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
                          📞 {job.customerPhone} | {job.product}
                        </div>

                        {job.sparePartName && job.sparePartName !== '-' && (
                          <div style={{ marginTop: '6px', fontSize: '12px', padding: '5px 8px', borderRadius: '4px', background: job.sparePartOption === 'Pending Part' ? '#f8d7da' : '#e2e8f0', color: job.sparePartOption === 'Pending Part' ? '#721c24' : '#1a365d', fontWeight: 'bold' }}>
                            ⚙️ {job.sparePartOption}: {job.sparePartName} {job.sparePartModel && job.sparePartModel !== '-' ? `(Model: ${job.sparePartModel})` : ''}
                          </div>
                        )}

                        {adminExpandedJobId === idx && (
                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #ccc', fontSize: '12px', color: '#333' }}>
                            <p style={{ margin: '3px 0' }}><strong>पता:</strong> {job.customerAddress}</p>
                            <p style={{ margin: '3px 0' }}><strong>समस्या / कार्य:</strong> {job.desc}</p>
                            <p style={{ margin: '3px 0' }}><strong>स्टाफ:</strong> {job.staffName} ({job.location})</p>
                            <p style={{ margin: '3px 0' }}><strong>तारीख:</strong> {job.date}</p>
                            {job.signatureURL && (
                              <div style={{ marginTop: '8px' }}>
                                <strong>कस्टमर सिग्नेचर:</strong><br />
                                <img src={job.signatureURL} alt="Signature" style={{ height: '60px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '4px', background: '#fff' }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SECTION B: लॉगिन एनालिटिक्स (Customer, Office, Staff) */}
              {adminSection === 'logins' && (
                <div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <button onClick={() => setLoginFilterTab('all')} style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: loginFilterTab === 'all' ? '#007bff' : '#e9ecef', color: loginFilterTab === 'all' ? '#fff' : '#333' }}>सभी ({loginLogs.length})</button>
                    <button onClick={() => setLoginFilterTab('customer')} style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: loginFilterTab === 'customer' ? '#007bff' : '#e9ecef', color: loginFilterTab === 'customer' ? '#fff' : '#333' }}>कस्टमर (Customer)</button>
                    <button onClick={() => setLoginFilterTab('office')} style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: loginFilterTab === 'office' ? '#007bff' : '#e9ecef', color: loginFilterTab === 'office' ? '#fff' : '#333' }}>ऑफिस (Office)</button>
                    <button onClick={() => setLoginFilterTab('staff')} style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: loginFilterTab === 'staff' ? '#007bff' : '#e9ecef', color: loginFilterTab === 'staff' ? '#fff' : '#333' }}>स्टाफ (Staff)</button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>श्रेणी (Role)</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>मोबाइल नंबर / ID</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>कितनी बार लॉगिन</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLoginLogs.length === 0 ? (
                          <tr>
                            <td colSpan="3" style={{ border: '1px solid #cbd5e1', padding: '15px', textAlign: 'center', color: '#777' }}>कोई लॉगिन रिकॉर्ड उपलब्ध नहीं है।</td>
                          </tr>
                        ) : (
                          filteredLoginLogs.map((log, idx) => (
                            <tr key={idx}>
                              <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold', textTransform: 'capitalize', color: '#1a365d' }}>{log.role}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontFamily: 'monospace' }}>{log.phone}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#28a745' }}>{log.loginCount} बार</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
