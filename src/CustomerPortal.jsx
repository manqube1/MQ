import React, { useState, useRef } from "react";

const FIRM_NAME = "Hindustan Refrigeration Service";

export default function CustomerPortal({
  firmName = FIRM_NAME,
  onSubmitComplaint,
  onSelectMode,
}) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [complaintText, setComplaintText] = useState("");
  const [photos, setPhotos] = useState([]);
  const [submittedMessage, setSubmittedMessage] = useState("");

  const cameraInputRef = useRef(null);

  const handleCapturePhoto = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = files.map((file, idx) => ({
      id: ${Date.now()}-${idx}-${file.name},
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPhotos((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const handleRemovePhoto = (id) => {
    setPhotos((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!complaintText.trim()) return;

    const payload = {
      firmName,
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      complaintText: complaintText.trim(),
      photos: photos.map((p) => p.file),
      createdAt: new Date().toISOString(),
    };

    if (typeof onSubmitComplaint === "function") {
      onSubmitComplaint(payload);
    }

    setSubmittedMessage("कंप्लेंट दर्ज हो गई है।");
    setComplaintText("");
    photos.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    setPhotos([]);
  };

  const handleSwitch = (mode) => {
    if (typeof onSelectMode === "function") {
      onSelectMode(mode);
    }
  };

  return (
    <div className="min-h-screen pb-16 bg-slate-100 text-slate-900">
      {/* Top Bar ("पोर्टल चुने" हटाया गया) */}
      <header className="sticky top-0 z-20 bg-slate-900 text-white px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-300">{firmName}</div>
            <h1 className="text-sm sm:text-base font-semibold">
              कस्टमर पोर्टल
            </h1>
          </div>
        </div>
      </header>

      {/* Complaint Form */}
      <main className="max-w-2xl mx-auto p-3 sm:p-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3"
        >
          <h2 className="text-sm sm:text-base font-semibold text-slate-900">
            नई कंप्लेंट दर्ज करें
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                नाम
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="अपना नाम लिखें"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                मोबाइल नंबर
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10 अंकों का नंबर"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          <div className="text-xs sm:text-sm">
            <label className="block text-slate-700 font-medium mb-1">
              पता
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="पूरा पता लिखें"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="text-xs sm:text-sm">
            <label className="block text-slate-700 font-medium mb-1">
              कंप्लेंट विवरण
            </label>
            <textarea
              rows={3}
              required
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              placeholder="समस्या या कंप्लेंट यहाँ लिखें..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-slate-800"
            />
          </div>

          {/* फोटो खींचकर डालने का Option */}
          <div className="space-y-2">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleCapturePhoto}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-medium"
            >
              <span>📷 फोटो खींचें</span>
            </button>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {photos.map((item) => (
                  <div
                    key={item.id}
                    className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-50"
                  >
                    <img
                      src={item.previewUrl}
                      alt="Complaint photo"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(item.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center"
                      aria-label="फोटो हटाएं"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {submittedMessage && (
            <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm">
              {submittedMessage}
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium"
            >
              कंप्लेंट भेजें
            </button>
          </div>
        </form>
      </main>

      {/* नीचे छोटे नाम: फ़ील्ड स्टाफ और ऑफ़िस */}
      <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200">
        <div className="max-w-2xl mx-auto grid grid-cols-2 divide-x divide-slate-200">
          <button
            type="button"
            onClick={() => handleSwitch("field_staff")}
            className="py-2.5 text-center text-xs sm:text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            फ़ील्ड स्टाफ
          </button>
          <button
            type="button"
            onClick={() => handleSwitch("office")}
            className="py-2.5 text-center text-xs sm:text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            ऑफ़िस
          </button>
        </div>
      </nav>
    </div>
  );
}