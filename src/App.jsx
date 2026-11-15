import React, { useState } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// 1. Firebase कॉन्फ़िगरेशन और कनेक्शन
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

// 2. फोटो को छोटा (Compress) करने का फंक्शन
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
  const [activeTab, setActiveTab] = useState('customer'); // customer, staff, admin
  
  // सभी जॉब-शीट्स और शिकायतों का सेंट्रल डेटाबेस (State)
  const [jobSheets, setJobSheets] = useState([]);

  // कस्टमर स्टेट
  const [custPhone, setCustPhone] = useState('');
  const [custLoggedIn, setCustLoggedIn] = useState(false);
  
  // नई शिकायत फॉर्म स्टेट (कस्टमर के लिए)
  const [productType, setProductType] = useState('Split AC');
  const [problemDesc, setProblemDesc] = useState('');

  // स्टाफ स्टेट
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [staffLoggedIn, setStaffLoggedIn] = useState(false);

  // जॉब शीट फॉर्म स्टेट (स्टाफ के लिए - पूरी तकनीकी डिटेल्स के साथ)
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

  // फोटो अपलोड स्टेट
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // कस्टमर लॉगिन हैंडलर
  const handleCustomerLogin = (e) => {
    e.preventDefault();
    if (custPhone.length < 10) {
      alert('कृपया सही मोबाइल नंबर दर्ज करें!');
      return;
    }
    setCustLoggedIn(true);
  };

  // कस्टमर द्वारा नई शिकायत दर्ज करना
  const handleNewComplaint = (e) => {
    e.preventDefault();
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const jobSheetNo = `COMP${custPhone}${day}${month}${hours}${minutes}`;

    const newEntry = {
      jobSheetNo,
      customerName: 'Customer',
      customerPhone: custPhone,
      customerAddress: 'N/A',
      product: productType,
      desc: problemDesc,
      status: 'Pending',
      date: ${day}/${month}/${year} ${hours}:${minutes},
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
    alert(शिकायत दर्ज हो गई!\nआपका जॉब शीट/कंप्लेंट नंबर है:\n${jobSheetNo});
  };

  // स्टाफ लॉगिन हैंडलर
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

  // फोटो सेलेक्ट और कम्प्रेस करने का हैंडलर
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const compressedBlob = await compressImage(selectedFile);
    const compressedFile = new File([compressedBlob], selectedFile.name, {
      type: 'image/jpeg',
    });

    setImageFile(compressedFile);
  };

  // स्टाफ द्वारा जॉब शीट और फोटो Firebase पर सबमिट करने का हैंडलर
  const handleJobSubmit = () => {
    if (!jobCustName || !jobCustPhone) {
      alert('कृपया कस्टमर का नाम और मोबाइल नंबर भरें!');
      return;
    }

    setUploading(true);

    // ब्राउज़र से लाइव लोकेशन (GPS) प्राप्त करना
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lng = position.coords.longitude.toFixed(4);
          const locationStr = Lat: ${lat}, Lng: ${lng} (Prayagraj);
          
          await processAndSaveJob(locationStr);
        },
        async (error) => {
          await processAndSaveJob('Prayagraj (Location default)');
        }
      );
    } else {
      processAndSaveJob('Prayagraj');
    }
  };

  // डेटा प्रोसेस करके सेव करने का मुख्य फंक्शन
  const processAndSaveJob = async (locationStr) => {
    let uploadedImageUrl = '';
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const jobSheetNo = JS${jobCustPhone.slice(-4)}${day}${month}${hours}${minutes};

    try {
      if (imageFile) {
        const storageRef = ref(storage, job_photos/${Date.now()}_${imageFile.name});
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
        date: ${day}/${month}/${year} ${hours}:${minutes},
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
      alert(जॉब शीट सफलतापूर्वक सेव हो गई!\nजॉब शीट नंबर: ${jobSheetNo});
      
      // फॉर्म रीसेट करें
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
                  <select value={productType} onChange={(e) => setProductType(e.target.value)} style={{ width: '10