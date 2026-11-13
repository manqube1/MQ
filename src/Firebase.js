import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// आपकी Firebase कॉन्फिगरेशन कीज (जो स्क्रीन पर दिख रही हैं)
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

// फोटो को छोटा (Compress) करने का फंक्शन ताकि स्टोरेज और स्पीड बेहतरीन रहे
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