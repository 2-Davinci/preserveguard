import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, AlertTriangle, Battery, CheckCircle2, Compass, Download,
  FileText, Heart, MapPin, Radio, RotateCcw, Settings, ShieldAlert,
  Thermometer, User, Users, Wind, Droplets, Sun
} from 'lucide-react';

const INITIAL_PLAYERS = [
  { id: 'P01', hr: 132, temp: 37.1, status: 'Normal', activity: 'Active', x: 25, y: 35, battery: 94, contact: true },
  { id: 'P02', hr: 128, temp: 36.9, status: 'Normal', activity: 'Active', x: 40, y: 22, battery: 91, contact: true },
  { id: 'P03', hr: 145, temp: 37.4, status: 'Review', activity: 'Active', x: 52, y: 48, battery: 89, contact: true },
  { id: 'P04', hr: 162, temp: 38.1, status: 'High Risk', activity: 'Reduced', x: 64, y: 60, battery: 86, contact: true },
  { id: 'P05', hr: 130, temp: 36.8, status: 'Normal', activity: 'Active', x: 30, y: 70, battery: 95, contact: true },
  { id: 'P06', hr: 124, temp: 36.7, status: 'Normal', activity: 'Active', x: 48, y: 75, battery: 92, contact: true },
  { id: 'P07', hr: 171, temp: 38.3, status: 'SOS', activity: 'No movement', x: 74, y: 32, battery: 88, contact: true },
  { id: 'P08', hr: 136, temp: 37.0, status: 'Normal', activity: 'Active', x: 60, y: 28, battery: 90, contact: true },
  { id: 'P09', hr: 126, temp: 36.9, status: 'Normal', activity: 'Active', x: 80, y: 50, battery: 93, contact: true },
  { id: 'P10', hr: 138, temp: 37.2, status: 'Normal', activity: 'Active', x: 18, y: 50, battery: 87, contact: true },
  { id: 'P22', hr: 129, temp: 36.8, status: 'Normal', activity: 'Active', x: 88, y: 45, battery: 96, contact: true },
];

const STATUS_BADGE = {
  Normal: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/50',
  Review: 'text-amber-400 bg-amber-950/60 border-amber-700/50',
  'High Risk': 'text-orange-400 bg-orange-950/60 border-orange-700/50',
  SOS: 'text-white bg-red-600 border-red-400 animate-pulse font-bold',
};

export default function PulseGuardDashboard() {
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [selectedId, setSelectedId] = useState('P07');
  const [envData, setEnvData] = useState({ temp: 32, humidity: 68, airQuality: 'Good' });
  const [connectedCount, setConnectedCount] = useState(21);

  // Connect to Local Node.js Serial-to-WebSocket Bridge
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'telemetry') {
        setPlayers((prev) => {
          const exists = prev.find((p) => p.id === data.id);
          const evaluatedStatus = data.sos
            ? 'SOS'
            : data.hr >= 160 || data.temp >= 38.0
            ? 'High Risk'
            : data.hr >= 145 || data.temp >= 37.4
            ? 'Review'
            : 'Normal';

          const updatedPlayer = {
            id: data.id,
            hr: data.hr,
            temp: data.temp,
            status: evaluatedStatus,
            activity: data.activity === 0 ? 'No movement' : data.activity === 2 ? 'Fall Detected' : 'Active',
            x: exists ? exists.x : 50,
            y: exists ? exists.y : 50,
            battery: data.battery,
            contact: data.contact,
          };

          if (data.sos) setSelectedId(data.id);
          return exists
            ? prev.map((p) => (p.id === data.id ? updatedPlayer : p))
            : [...prev, updatedPlayer];
        });
      } else if (data.type === 'env') {
        setEnvData({ temp: data.temp, humidity: data.humidity, airQuality: data.airQuality });
      }
    };
    return () => ws.close();
  }, []);

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedId) || players[0],
    [players, selectedId]
  );

  const alertCount = useMemo(
    () => players.filter((p) => p.status === 'SOS').length,
    [players]
  );

  const acknowledgeAlert = (id) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'Review', activity: 'Medical En Route' } : p))
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans select-none flex flex-col justify-between">
      {/* TOP STATUS BAR */}
      <header className="flex flex-wrap items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-5 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-red-500" />
          <div>
            <h1 className="text-xl font-extrabold tracking-wider text-sky-400">
              PULSE<span className="text-white">GUARD</span>
            </h1>
            <p className="text-[11px] uppercase tracking-widest text-slate-400">
              Team Safety Monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-slate-800/70 px-3.5 py-1.5 rounded-lg border border-slate-700">
            <Users className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-lg">22</span>
            <span className="text-xs text-slate-400">Players</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/70 px-3.5 py-1.5 rounded-lg border border-slate-700">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-lg text-emerald-400">{connectedCount}</span>
            <span className="text-xs text-slate-400">Connected</span>
          </div>

          <div className="flex items-center gap-2 bg-red-950/80 px-4 py-1.5 rounded-lg border border-red-600/60">
            <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
            <span className="font-bold text-lg text-red-400">{alertCount}</span>
            <span className="text-xs text-red-200">Alert</span>
          </div>

          <div className="text-right pl-4 border-l border-slate-800">
            <div className="text-lg font-bold leading-none">16:24</div>
            <div className="text-xs text-slate-400">30 Sep 2026</div>
          </div>
        </div>
      </header>

      {/* MAIN 3-COLUMN GRID */}
      <div className="grid grid-cols-12 gap-4 my-4 flex-1">
        {/* LEFT COLUMN: 22-PLAYER TELEMETRY TABLE */}
        <section className="col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col">
          <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-3">
            Players (RF ESP-NOW Live Stream)
          </h2>
          <div className="overflow-y-auto flex-1 pr-1">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="py-2 px-2">ID</th>
                  <th className="py-2 px-2">HR (bpm)</th>
                  <th className="py-2 px-2">Temp (°C)</th>
                  <th className="py-2 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {players.map((p) => {
                  const isSelected = p.id === selectedPlayer.id;
                  const isSOS = p.status === 'SOS';
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`cursor-pointer transition-colors ${
                        isSOS
                          ? 'bg-red-950/70 hover:bg-red-900/80'
                          : isSelected
                          ? 'bg-sky-950/50'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-2 px-2 font-mono font-bold text-white">{p.id}</td>
                      <td
                        className={`py-2 px-2 font-mono font-semibold ${
                          p.hr >= 160 ? 'text-red-400' : p.hr >= 145 ? 'text-amber-400' : 'text-slate-200'
                        }`}
                      >
                        {p.hr}
                      </td>
                      <td
                        className={`py-2 px-2 font-mono ${
                          p.temp >= 38.0 ? 'text-red-400 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        {p.temp.toFixed(1)}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded border ${
                            STATUS_BADGE[p.status]
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* CENTER COLUMN: SELECTED PLAYER & SOS ALERT PANEL */}
        <section className="col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Selected Player - {selectedPlayer.id}
              </h2>
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Battery className="w-4 h-4 text-emerald-400" /> {selectedPlayer.battery}% | Leads:{' '}
                <strong className="text-emerald-400">OK</strong>
              </span>
            </div>

            {/* SOS ALERT BANNER */}
            {selectedPlayer.status === 'SOS' ? (
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg p-3.5 mb-4 flex items-center justify-between shadow-lg shadow-red-950/50 border border-red-400">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-7 h-7 shrink-0 animate-pulse" />
                  <div>
                    <div className="text-lg font-black tracking-wide leading-none">SOS ALERT</div>
                    <div className="text-xs text-red-100 mt-0.5">
                      Immediate medical team response required
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold">16:23:10</div>
                  <button
                    onClick={() => acknowledgeAlert(selectedPlayer.id)}
                    className="mt-1 bg-white text-red-700 hover:bg-red-50 text-xs font-bold px-2.5 py-1 rounded shadow"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-3 mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">
                  Status: {selectedPlayer.status}
                </span>
                <span className="text-xs text-slate-400">Baseline Normal</span>
              </div>
            )}

            {/* KEY TELEMETRY METRICS */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-400">HR</div>
                <div className="text-3xl font-black text-white mt-0.5">{selectedPlayer.hr}</div>
                <div className="text-xs text-slate-400">bpm</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-400">Temp</div>
                <div className="text-3xl font-black text-white mt-0.5">
                  {selectedPlayer.temp.toFixed(1)}
                </div>
                <div className="text-xs text-slate-400">°C</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-400">Activity</div>
                <div className="text-lg font-bold text-amber-300 mt-1 leading-tight">
                  {selectedPlayer.activity}
                </div>
              </div>
            </div>
          </div>

          {/* TIME-SERIES GRAPH (HEART RATE, SKIN TEMP, ACTIVITY) */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-center gap-5 text-xs mb-2">
              <span className="flex items-center gap-1.5 text-red-400">
                <span className="w-2.5 h-0.5 bg-red-500 inline-block" /> Heart Rate
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> Skin Temp
              </span>
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2.5 h-0.5 bg-sky-400 inline-block" /> Activity
              </span>
            </div>

            <svg viewBox="0 0 360 130" className="w-full h-36 overflow-visible">
              {/* Grid Lines */}
              {[20, 50, 80, 110].map((y, idx) => (
                <g key={idx}>
                  <line x1="30" y1={y} x2="350" y2={y} stroke="#1e293b" strokeWidth="1" />
                  <text x="5" y={y + 4} fill="#64748b" fontSize="9">
                    {200 - idx * 50}
                  </text>
                </g>
              ))}
              {/* Heart Rate Curve (Spiking at 16:22) */}
              <path
                d="M 30 62 L 90 60 L 150 58 L 210 56 L 235 28 L 280 35 L 345 34"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
              />
              {/* Skin Temp Curve */}
              <path
                d="M 30 92 L 150 91 L 235 88 L 345 87"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
              />
              {/* Activity Curve (Drops to zero on collapse/SOS) */}
              <path
                d="M 30 98 L 150 96 L 220 95 L 235 110 L 345 110"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
              />
              {/* X-Axis Timestamps */}
              <text x="30" y="126" fill="#94a3b8" fontSize="9">16:18</text>
              <text x="110" y="126" fill="#94a3b8" fontSize="9">16:20</text>
              <text x="215" y="126" fill="#94a3b8" fontSize="9">16:22</text>
              <text x="320" y="126" fill="#94a3b8" fontSize="9">16:24</text>
            </svg>
          </div>
        </section>

        {/* RIGHT COLUMN: GPS PITCH MAP & ENVIRONMENTAL CONDITIONS */}
        <section className="col-span-3 flex flex-col gap-4">
          {/* PLAYER LOCATION (GPS) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2">
              Player Location (GPS)
            </h2>

            {/* SVG Football Pitch */}
            <div className="relative bg-emerald-900/80 border-2 border-emerald-500/60 rounded-lg aspect-[16/10] w-full overflow-hidden">
              <svg viewBox="0 0 200 120" className="w-full h-full">
                <rect x="6" y="6" width="188" height="108" fill="none" stroke="#6ee7b7" strokeWidth="1.2" />
                <line x1="100" y1="6" x2="100" y2="114" stroke="#6ee7b7" strokeWidth="1.2" />
                <circle cx="100" cy="60" r="16" fill="none" stroke="#6ee7b7" strokeWidth="1.2" />
                <rect x="6" y="32" width="26" height="56" fill="none" stroke="#6ee7b7" strokeWidth="1.2" />
                <rect x="168" y="32" width="26" height="56" fill="none" stroke="#6ee7b7" strokeWidth="1.2" />
              </svg>

              {/* Selected Player GPS Pin */}
              <div
                style={{ left: `${selectedPlayer.x}%`, top: `${selectedPlayer.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              >
                <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white animate-ping absolute" />
                <MapPin className="w-6 h-6 text-red-500 fill-red-600 drop-shadow relative z-10" />
                <span className="bg-slate-950/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-700 mt-0.5">
                  {selectedPlayer.id}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
              <span>Last update: 16:23:08</span>
              <span>Accuracy: ±5 m (approx.)</span>
            </div>
          </div>

          {/* ENVIRONMENTAL CONDITIONS */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-3">
              Environmental Conditions
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2.5">
                <Sun className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400">Temp</div>
                  <div className="text-lg font-bold">{envData.temp}°C</div>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2.5">
                <Droplets className="w-6 h-6 text-sky-400 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400">Humidity</div>
                  <div className="text-lg font-bold">{envData.humidity}%</div>
                </div>
              </div>

              <div className="col-span-2 bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Wind className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs text-slate-400">Air Quality</span>
                </div>
                <span className="text-sm font-bold text-emerald-400">{envData.airQuality}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* BOTTOM NAVIGATION & REPORTING CONTROLS */}
      <footer className="grid grid-cols-5 gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
        <button className="flex items-center justify-center gap-2 bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-sky-200 py-2 px-4 rounded-lg text-xs font-semibold transition">
          <User className="w-4 h-4" /> Player Profile
        </button>
        <button className="flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 py-2 px-4 rounded-lg text-xs font-semibold transition">
          <Activity className="w-4 h-4" /> Baseline & Trends
        </button>
        <button className="flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 py-2 px-4 rounded-lg text-xs font-semibold transition">
          <RotateCcw className="w-4 h-4" /> Incident Replay
        </button>
        <button className="flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 py-2 px-4 rounded-lg text-xs font-semibold transition">
          <Download className="w-4 h-4" /> Export Report
        </button>
        <button className="flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 py-2 px-4 rounded-lg text-xs font-semibold transition">
          <Settings className="w-4 h-4" /> Settings
        </button>
      </footer>
    </div>
  );
}