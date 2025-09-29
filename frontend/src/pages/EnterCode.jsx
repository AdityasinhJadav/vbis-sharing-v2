import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EnterCode() {
  const [passcode, setPasscode] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const last = localStorage.getItem("last_attendee_passcode");
    if (last) setPasscode(last);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    const code = (passcode || "").toUpperCase().trim();
    const isValid = /^[A-Z]{6}$/.test(code);
    if (!isValid) {
      alert("Please enter a valid 6-letter passcode (A-Z only).");
      return;
    }

    localStorage.setItem("last_attendee_passcode", code);
    // Navigate to a route with passcode as param, e.g. /photos/ABCDEF
    navigate(`/photos/${code}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Enter Event Code</h2>
          <p className="text-slate-400 mt-1">Enter the 6-letter code shared by the organizer.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Passcode</label>
            <input
              type="text"
              maxLength={6}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.toUpperCase())}
              placeholder="ABCDEF"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 uppercase tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              required
            />
            <p className="mt-2 text-xs text-slate-500">Only letters A–Z. Not case sensitive.</p>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors"
          >
            Continue
          </button>
        </form>

        {passcode && passcode.length === 6 && (
          <div className="mt-4 text-sm text-slate-300">
            Prefer face search? {" "}
            <button
              className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"
              onClick={() => navigate(`/face-match`, { state: { passcode: passcode.toUpperCase() } })}
            >
              Go to Face Match
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
