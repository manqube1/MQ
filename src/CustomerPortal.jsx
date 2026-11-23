import React, { useState, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, compressImage } from "./App";

const FIRM_NAME = "Hindustan Refrigeration Service";

const SUB_OPTIONS_BY_CATEGORY = {
  "HVAC & Refrigeration": [
    { value: "Split / Window AC", label: "Split / Window AC" },
    { value: "Inverter AC", label: "Inverter AC" },
    { value: "Cassette AC", label: "Cassette AC (कैसेट एसी)" },
    { value: "Ductable AC", label: "Ductable AC (डक्टेबल एसी)" },
    { value: "VRV / VRF System", label: "VRV / VRF System" },
    { value: "AHU Unit", label: "AHU Unit" },
    { value: "Chiller Unit", label: "Chiller Unit (चिलर)" },
    { value: "Refrigerator / Deep Freezer", label: "Refrigerator / Deep Freezer" },
    { value: "Water Cooler", label: "Water Cooler" },
  ],
  "Electrical Work": [
    { value: "Cooler", label: "Cooler (कूलर)" },
    { value: "House Wiring & Panel", label: "House Wiring & Panel" },
    { value: "DB / MCB / MCCB Work", label: "DB / MCB / MCCB Work" },
    { value: "Earthing & Lightning Arrester", label: "Earthing & Lightning Arrester" },
    { value: "Three Phase Industrial Panel", label: "Three Phase Industrial Panel" },
    { value: "Inverter / UPS / Battery Setup", label: "Inverter / UPS / Battery Setup" },
  ],
  "Plumbing Work": [
    { value: "Pipe Fitting & Leakage Repair", label: "Pipe Fitting & Leakage Repair" },
    { value: "Sanitary & Bathroom Fitting", label: "Sanitary & Bathroom Fitting" },
    { value: "Water Tank Installation", label: "Water Tank Installation" },
    { value: "Boring & Submersible Pump Work", label: "Boring & Submersible Pump Work" },
    { value: "Drainage & Sewer Line Fitting", label: "Drainage & Sewer Line Fitting" },
    { value: "Pressure Pump Installation", label: "Pressure Pump Installation" },
  ],
  "Civil Work": [
    { value: "Flooring & Tiling", label: "Flooring & Tiling" },
    { value: "Brickwork & Plastering", label: "Brickwork & Plastering" },
    { value: "RCC Roof & Pillar Casting", label: "RCC Roof & Pillar Casting" },
    { value: "Waterproofing & Leakage Solution", label: "Waterproofing & Leakage Solution" },
    { value: "Foundation & Excavation", label: "Foundation & Excavation" },
    { value: "Wall Putty & Painting", label: "Wall Putty & Painting" },
  ],
};

export default function CustomerPortal({
  firmName = FIRM_NAME,
  gpsText = "Fetching GPS...",
  jobSheets = [],
  onBackToPortalMenu,
  onSubmitComplaint,
  onSelectMode,
  onRecordLogin,
}) {
  const [custPhone, setCustPhone] = useState("");
  const [custLoggedIn, setCustLoggedIn] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [categoryType, setCategoryType] = useState("HVAC & Refrigeration");
  const [productType, setProductType] = useState("Split / Window AC");
  const [complaintText, setComplaintText] = useState("");
  const [photos, setPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const cameraInputRef = useRef(null);

  const handleCategoryChange = (cat) => {
    setCategoryType(cat);
    const list = SUB_OPTIONS_BY_CATEGORY[cat] || [];
    if (list.length > 0) setProductType(list[0].value);
  };

  const handlePhoneContinue = (e) => {
    e.preventDefault();
    const clean = custPhone.replace(/\D/g, "");
    if (clean.length < 10) {
      alert("कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें!");
      return;
    }
    setCustPhone(clean.slice(-10));
    setCustLoggedIn(true);
    if (typeof onRecordLogin === "function") {
      onRecordLogin(clean.slice(-10), "customer", `Customer (${clean.slice(-10)})`);
    }
  };

  const handlePhotoChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const newEntries = selectedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      file,
      previewUrl: URL.createObjectURL(file),
      uploadedUrl: "",
    }));

    setPhotos((prev) => [...prev, ...newEntries]);
    e.target.value = "";

    try {
      setUploadingPhotos(true);
      for (const item of newEntries) {
        const compressedBlob = await compressImage(item.file);
        const storageRef = ref(
          storage,
          `complaint_photos/${Date.now()}_${item.file.name}`
        );
        await uploadBytesResumable(storageRef, compressedBlob);
        const downloadUrl = await getDownloadURL(storageRef);

        setPhotos((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, uploadedUrl: downloadUrl } : p
          )
        );
      }
    } catch (err) {
      console.error("Customer photo upload error:", err);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleRemovePhoto = (id) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName.trim() || !address.trim() || !complaintText.trim()) {
      alert("कृपया नाम, पता और समस्या का विवरण भरें!");
      return;
    }

    const uploadedUrls = photos.map((p) => p.uploadedUrl).filter(Boolean);

    const payload = {
      customerName: customerName.trim(),
      customerPhone: custPhone,
      customerAddress: address.trim(),
      categoryType,
      productType,
      complaintText: complaintText.trim(),
      sitePhotoUrls: uploadedUrls,
      photoURL: uploadedUrls[0] || "",
    };

    if (typeof onSubmitComplaint === "function") {
      const createdNo = onSubmitComplaint(payload);
      setStatusMsg(
        `शिकायत सफलतापूर्वक दर्ज हो गई! कंप्लेंट नंबर: ${createdNo || ""}`
      );
    } else {
      setStatusMsg("आपकी कंप्लेंट दर्ज कर ली गई है।");
    }

    setComplaintText("");
    setCustomerName("");
    setAddress("");
    photos.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    setPhotos([]);
  };

  const customerHistory = jobSheets.filter(
    (j) => String(j.customerPhone || "").slice(-10) === custPhone
  );

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 pb-8">
      <div className="max-w-xl mx-auto px-3 pt-3 space-y-3">
        <div className="bg-[#dcfce7] text-[#166534] text-xs font-medium text-center py-2 px-3 rounded-md border border-[#bbf7d0]">
          <strong>GPS:</strong> {gpsText}
        </div>

        <div className="flex items-center justify-between pt-1 pb-1">
          {typeof onBackToPortalMenu === "function" ? (
            <button
              type="button"
              onClick={onBackToPortalMenu}
              className="px-3 py-1.5 rounded-md bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              ← वापस
            </button>
          ) : (
            <span className="w-14" />
          )}

          <div className="text-center">
            <div className="text-[11px] font-semibold text-slate-500">
              {firmName}
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              कस्टमर पोर्टल
            </h1>
          </div>

          <span className="w-14" />
        </div>

        {!custLoggedIn ? (
          <form
            onSubmit={handlePhoneContinue}
            className="bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-[#2563eb] p-4 space-y-3"
          >
            <div className="font-bold text-sm sm:text-base text-slate-900">
              मोबाइल नंबर से लॉगिन करें
            </div>
            <p className="text-xs text-slate-600">
              नई शिकायत दर्ज करने और पुरानी जॉब-शीट्स देखने के लिए अपना 10 अंकों का मोबाइल नंबर दर्ज करें:
            </p>
            <input
              type="tel"
              maxLength={10}
              required
              value={custPhone}
              onChange={(e) => setCustPhone(e.target.value)}
              placeholder="10 अंकों का मोबाइल नंबर"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#2563eb]"
            />
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-bold transition"
            >
              आगे बढ़ें →
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm">
              <span>
                मोबाइल: <strong>{custPhone}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustLoggedIn(false);
                  setStatusMsg("");
                }}
                className="px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-bold"
              >
                लॉगआउट
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-[#2563eb] p-4 space-y-3"
            >
              <div className="font-bold text-sm sm:text-base text-[#2563eb]">
                नई शिकायत दर्ज करें
              </div>

              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="कस्टमर / संस्था का पूरा नाम"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-[#2563eb]"
              />

              <textarea
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="लोकेशन / साइट का पूरा पता"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-[#2563eb]"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <select
                  value={categoryType}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="HVAC & Refrigeration">
                    HVAC &amp; Refrigeration
                  </option>
                  <option value="Electrical Work">Electrical Work</option>
                  <option value="Plumbing Work">Plumbing Work</option>
                  <option value="Civil Work">Civil Work</option>
                </select>

                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:border-[#2563eb]"
                >
                  {(SUB_OPTIONS_BY_CATEGORY[categoryType] || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                rows={3}
                required
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="क्या समस्या आ रही है विस्तार से लिखें..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-[#2563eb]"
              />

              {/* फोटो खींचकर डालने का Option */}
              <div className="space-y-2">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition"
                >
                  <span>📷</span>
                  <span>फोटो खींचें / अपलोड करें</span>
                </button>

                {uploadingPhotos && (
                  <div className="text-xs font-semibold text-teal-700 text-center">
                    फोटो अपलोड हो रही है...
                  </div>
                )}

                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {photos.map((item) => (
                      <div
                        key={item.id}
                        className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                      >
                        <img
                          src={item.previewUrl}
                          alt="Complaint"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(item.id)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/75 text-white text-xs flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {statusMsg && (
                <div className="px-3 py-2 rounded-lg bg-[#dcfce7] text-[#166534] text-xs font-bold text-center">
                  {statusMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={uploadingPhotos}
                className="w-full py-2.5 px-4 rounded-lg bg-[#166534] hover:bg-[#14532d] disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition"
              >
                शिकायत सबमिट करें
              </button>
            </form>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-2.5">
              <div className="font-bold text-sm text-slate-900">
                आपकी शिकायतें और पुरानी जॉब-शीट्स ({customerHistory.length})
              </div>
              {customerHistory.length === 0 ? (
                <p className="text-xs text-slate-500">
                  इस नंबर पर अभी कोई पुरानी शिकायत या जॉब-शीट नहीं है।
                </p>
              ) : (
                customerHistory.map((job) => (
                  <div
                    key={job.jobSheetNo}
                    className="border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-xs space-y-1"
                  >
                    <div className="flex justify-between font-bold">
                      <span>
                        {job.jobSheetNo} ({job.customerName})
                      </span>
                      <span
                        className={
                          job.status === "Completed"
                            ? "text-emerald-700"
                            : "text-amber-600"
                        }
                      >
                        {job.status}
                      </span>
                    </div>
                    <div className="text-slate-700">
                      {job.product} — {job.desc}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      पता: {job.customerAddress} | दिनांक: {job.date}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* नीचे केवल छोटा नाम: फील्ड स्टाफ और ऑफिस */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() =>
              typeof onSelectMode === "function" && onSelectMode("staff")
            }
            className="w-full bg-white rounded-lg shadow-sm border border-slate-200 border-l-4 border-l-[#166534] py-2.5 px-3 text-center hover:bg-slate-50 transition"
          >
            <span className="text-xs sm:text-sm font-bold text-[#166534]">
              फील्ड स्टाफ
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              typeof onSelectMode === "function" && onSelectMode("admin")
            }
            className="w-full bg-white rounded-lg shadow-sm border border-slate-200 border-l-4 border-l-[#d97706] py-2.5 px-3 text-center hover:bg-slate-50 transition"
          >
            <span className="text-xs sm:text-sm font-bold text-[#d97706]">
              ऑफिस
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}