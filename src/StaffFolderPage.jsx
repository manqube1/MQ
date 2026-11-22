import React, { useState, useMemo, useEffect } from "react";

const FIRM_NAME = "Hindustan Refrigeration Service";

const STATUS_CONFIG = {
  completed: {
    label: "कंप्लीट",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    dotClass: "bg-emerald-600",
  },
  part_pending: {
    label: "Part Pending",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    dotClass: "bg-amber-500",
  },
  other_reason_pending: {
    label: "Other Reason Pending",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    dotClass: "bg-rose-600",
  },
};

function normalizeStatus(rawStatus) {
  const s = String(rawStatus || "")
    .trim()
    .toLowerCase();

  if (
    s === "completed" ||
    s === "complete" ||
    s === "done" ||
    s.includes("कंप्लीट") ||
    s.includes("कम्प्लीट")
  ) {
    return "completed";
  }

  if (
    s === "part_pending" ||
    s === "part pending" ||
    s === "parts_pending" ||
    s.includes("part") ||
    s.includes("पार्ट") ||
    s.includes("स्पेयर")
  ) {
    return "part_pending";
  }

  return "other_reason_pending";
}

const DEFAULT_STAFF_FOLDERS = [
  {
    staffId: "staff-1",
    staffName: "स्टाफ 1",
    jobs: [
      {
        id: "job-101",
        dateTime: "22 Nov 2026, 10:15 AM",
        customerName: "Ramesh Verma",
        jobSheetNo: "JS-2026-001",
        status: "completed",
        phone: "9839000001",
        address: "Civil Lines, Prayagraj",
        workDetails: "Split AC service, gas check, and drain cleaning completed.",
        spareParts: "None",
        pendingReason: "",
      },
      {
        id: "job-102",
        dateTime: "22 Nov 2026, 11:05 AM",
        customerName: "Anita Traders",
        jobSheetNo: "JS-2026-002",
        status: "part_pending",
        phone: "9839000002",
        address: "Naini, Prayagraj",
        workDetails: "Indoor PCB fault checked; part replacement needed.",
        spareParts: "Indoor PCB required",
        pendingReason: "Spare part arrival pending",
      },
      {
        id: "job-103",
        dateTime: "22 Nov 2026, 12:00 PM",
        customerName: "Suresh Chandra Gupta",
        jobSheetNo: "JS-2026-003",
        status: "other_reason_pending",
        phone: "9839000003",
        address: "Tagore Town, Prayagraj",
        workDetails: "Site visited for outdoor unit shifting.",
        spareParts: "None",
        pendingReason: "Customer / site approval pending",
      },
    ],
  },
  {
    staffId: "staff-2",
    staffName: "स्टाफ 2",
    jobs: [
      {
        id: "job-201",
        dateTime: "22 Nov 2026, 09:50 AM",
        customerName: "Vikas Mishra",
        jobSheetNo: "JS-2026-004",
        status: "completed",
        phone: "9839000004",
        address: "George Town, Prayagraj",
        workDetails: "AC servicing and cooling check completed.",
        spareParts: "None",
        pendingReason: "",
      },
      {
        id: "job-202",
        dateTime: "22 Nov 2026, 11:35 AM",
        customerName: "Maa Vindhyavasini Traders",
        jobSheetNo: "JS-2026-005",
        status: "part_pending",
        phone: "9839000005",
        address: "Varanasi Road, Prayagraj",
        workDetails: "Capacitor fault diagnosed.",
        spareParts: "50mfd run capacitor pending",
        pendingReason: "Part pending",
      },
    ],
  },
];

export default function StaffFolderPage({
  staffFolders = DEFAULT_STAFF_FOLDERS,
  firmName = FIRM_NAME,
}) {
  const [selectedStaffId, setSelectedStaffId] = useState(
    staffFolders[0]?.staffId || ""
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState(null);
  const [isPrintingJob, setIsPrintingJob] = useState(false);

  useEffect(() => {
    if (staffFolders.length > 0) {
      const exists = staffFolders.some((f) => f.staffId === selectedStaffId);
      if (!exists) {
        setSelectedStaffId(staffFolders[0].staffId);
      }
    }
  }, [staffFolders, selectedStaffId]);

  useEffect(() => {
    if (!isPrintingJob) return;

    document.body.classList.add("hrs-print-single-job");
    const timer = setTimeout(() => {
      window.print();
    }, 50);

    const handleAfterPrint = () => {
      document.body.classList.remove("hrs-print-single-job");
      setIsPrintingJob(false);
    };

    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("hrs-print-single-job");
    };
  }, [isPrintingJob]);

  const currentFolder = useMemo(() => {
    return (
      staffFolders.find((item) => item.staffId === selectedStaffId) ||
      staffFolders[0] || { staffName: "Staff Folder", jobs: [] }
    );
  }, [staffFolders, selectedStaffId]);

  const normalizedJobs = useMemo(() => {
    const list = Array.isArray(currentFolder.jobs) ? currentFolder.jobs : [];
    return list.map((job, idx) => ({
      ...job,
      id: job.id || `${job.jobSheetNo || "job"}-${idx}`,
      dateTime: job.dateTime || "—",
      customerName: job.customerName || "Customer",
      jobSheetNo: job.jobSheetNo || `JS-${idx + 1}`,
      normalizedStatus: normalizeStatus(job.status),
    }));
  }, [currentFolder]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: normalizedJobs.length,
      completed: 0,
      part_pending: 0,
      other_reason_pending: 0,
    };

    for (const job of normalizedJobs) {
      counts[job.normalizedStatus] = (counts[job.normalizedStatus] || 0) + 1;
    }

    return counts;
  }, [normalizedJobs]);

  const visibleJobs = useMemo(() => {
    if (statusFilter === "all") return normalizedJobs;
    return normalizedJobs.filter((job) => job.normalizedStatus === statusFilter);
  }, [normalizedJobs, statusFilter]);

  const handleWhatsAppShare = (job) => {
    const st = STATUS_CONFIG[job.normalizedStatus] || STATUS_CONFIG.other_reason_pending;
    const message = [
      `*${firmName}*`,
      `*Job Sheet No.:* ${job.jobSheetNo}`,
      `*Date & Time:* ${job.dateTime}`,
      `*Customer:* ${job.customerName}`,
      job.address ? `*Address:* ${job.address}` : "",
      `*Status:* ${st.label}`,
      job.workDetails ? `*Work Details:* ${job.workDetails}` : "",
      job.spareParts ? `*Spare Parts:* ${job.spareParts}` : "",
      job.normalizedStatus !== "completed" && job.pendingReason
        ? `*Pending Reason:* ${job.pendingReason}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const cleanPhone = (job.phone || "").replace(/\D/g, "");
    const encoded = encodeURIComponent(message);
    const url =
      cleanPhone.length >= 10
        ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const activeStatus = selectedJob
    ? STATUS_CONFIG[selectedJob.normalizedStatus] ||
      STATUS_CONFIG.other_reason_pending
    : null;

  return (
    <div className="min-h-screen bg-slate-100 p-2 sm:p-4 text-slate-900">
      <style>{`
        @media print {
          body.hrs-print-single-job * {
            visibility: hidden;
          }
          body.hrs-print-single-job #hrs-single-job-print,
          body.hrs-print-single-job #hrs-single-job-print * {
            visibility: visible;
          }
          body.hrs-print-single-job #hrs-single-job-print {
            position: fixed;
            inset: 0;
            background: #ffffff;
            padding: 20px;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header + Staff Folder Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-slate-900 text-white">
          <div>
            <div className="text-[11px] text-slate-300">{firmName}</div>
            <h1 className="text-sm sm:text-base font-semibold">
              Job Sheet — Staff Folder
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {staffFolders.map((folder) => {
              const jobCount = Array.isArray(folder.jobs) ? folder.jobs.length : 0;
              const isSelected = folder.staffId === currentFolder.staffId;
              return (
                <button
                  key={folder.staffId}
                  type="button"
                  onClick={() => {
                    setSelectedStaffId(folder.staffId);
                    setSelectedJob(null);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    isSelected
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  {folder.staffName} ({jobCount})
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-xs">
          <span className="font-medium text-slate-700">
            {currentFolder.staffName}
          </span>

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                statusFilter === "all"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300"
              }`}
            >
              सभी ({statusCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                statusFilter === "completed"
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-white text-slate-700 border-slate-300"
              }`}
            >
              कंप्लीट ({statusCounts.completed})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("part_pending")}
              className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                statusFilter === "part_pending"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-slate-700 border-slate-300"
              }`}
            >
              Part Pending ({statusCounts.part_pending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("other_reason_pending")}
              className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                statusFilter === "other_reason_pending"
                  ? "bg-rose-700 text-white border-rose-700"
                  : "bg-white text-slate-700 border-slate-300"
              }`}
            >
              Other Reason Pending ({statusCounts.other_reason_pending})
            </button>
          </div>
        </div>

        {/* Single-Line Job Rows */}
        <div className="divide-y divide-slate-200">
          {visibleJobs.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs sm:text-sm text-slate-500">
              इस स्टेटस में कोई जॉब शीट नहीं है।
            </div>
          ) : (
            visibleJobs.map((job) => {
              const st =
                STATUS_CONFIG[job.normalizedStatus] ||
                STATUS_CONFIG.other_reason_pending;

              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedJob(job)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-xs sm:text-sm hover:bg-slate-50 active:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <span className="text-slate-600 whitespace-nowrap shrink-0">
                      {job.dateTime}
                    </span>
                    <span className="text-slate-300 shrink-0">|</span>
                    <span className="font-medium text-slate-900 truncate">
                      {job.customerName}
                    </span>
                    <span className="text-slate-300 shrink-0">|</span>
                    <span className="font-mono text-slate-700 whitespace-nowrap shrink-0">
                      {job.jobSheetNo}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap shrink-0 ${st.badgeClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dotClass}`} />
                    {st.label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Click -> Details + Print / WhatsApp */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4"
          onClick={() => setSelectedJob(null)}
        >
          <div
            id="hrs-single-job-print"
            className="w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-xl shadow-xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
              <div>
                <div className="text-[11px] text-slate-300">{firmName}</div>
                <h2 className="text-sm sm:text-base font-semibold">
                  Job Sheet Details — {selectedJob.jobSheetNo}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs print:hidden"
              >
                बंद करें ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs sm:text-sm max-h-[75vh] overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <span className="text-slate-600">{selectedJob.dateTime}</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${activeStatus.badgeClass}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${activeStatus.dotClass}`}
                  />
                  {activeStatus.label}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <div className="text-[11px] text-slate-500">Customer Name</div>
                  <div className="font-semibold text-slate-900">
                    {selectedJob.customerName}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Job Sheet No.</div>
                  <div className="font-mono font-semibold text-slate-900">
                    {selectedJob.jobSheetNo}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Phone</div>
                  <div className="font-medium">{selectedJob.phone || "—"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Address</div>
                  <div className="font-medium">{selectedJob.address || "—"}</div>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-500">कार्य विवरण</div>
                <div className="mt-0.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  {selectedJob.workDetails || "—"}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-500">Spare Parts</div>
                <div className="mt-0.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  {selectedJob.spareParts || "—"}
                </div>
              </div>

              {selectedJob.normalizedStatus !== "completed" && (
                <div>
                  <div className="text-[11px] text-rose-600 font-medium">
                    Pending Reason ({activeStatus.label})
                  </div>
                  <div className="mt-0.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
                    {selectedJob.pendingReason || "विवरण दर्ज नहीं है"}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200 print:hidden">
              <button
                type="button"
                onClick={() => setIsPrintingJob(true)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-medium"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => handleWhatsAppShare(selectedJob)}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium"
              >
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}