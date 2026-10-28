// src/App.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity, AlertTriangle, Battery, CheckCircle2, Download,
  MapPin, Play, Pause, Radio, RotateCcw,
  Sun, Droplets, Wind, User, Users, CheckSquare, XCircle
} from 'lucide-react';
import { BaselineTrendEngine } from './utils/baselineEngine';
import { exportTelemetryToCSV, P07_INCIDENT_REPLAY_FRAMES } from './utils/incidentManager';

// Real-time GPS Coordinate-to-Pitch Mapper (105m x 68m field bounds)
export const PITCH_BOUNDS = {
  latMax: 6.525100, // North touchline
  latMin: 6.524300, // South touchline
  lngMin: 3.379100, // West goal line
  lngMax: 3.380100, // East goal line
};

export function gpsToPitchXY(lat, lng) {
  if (!lat || !lng) return { x: 50, y: 50 };
  const rawX = ((lng - PITCH_BOUNDS.lngMin) / (PITCH_BOUNDS.lngMax - PITCH_BOUNDS.lngMin)) * 100;
  const rawY = ((PITCH_BOUNDS.latMax - lat) / (PITCH_BOUNDS.latMax - PITCH_BOUNDS.latMin)) * 100;
  return {
    x: Math.max(5, Math.min(95, +(rawX.toFixed(1)))),
    y: Math.max(5, Math.min(95, +(rawY.toFixed(1)))),
  };
}

// Converts a player's rolling telemetry history into a live SVG path
function buildLiveSvgPath(history = [], key, minVal, maxVal) {
  if (!history || history.length === 0) return '';
  if (history.length === 1) {
    const clamped = Math.max(minVal, Math.min(maxVal, history[0][key]));
    const y = 110 - ((clamped - minVal) / (maxVal - minVal)) * 90;
    return `M 30 ${y.toFixed(1)} L 345 ${y.toFixed(1)}`;
  }
  return history
    .map((pt, idx) => {
      const x = 30 + (idx / (history.length - 1)) * 315;
      const clamped = Math.max(minVal, Math.min(maxVal, pt[key]));
      const y = 110 - ((clamped - minVal) / (maxVal - minVal)) * 90;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

// Builds initial 12-point chart history so the graph is populated on startup
function createSeedHistory(baseHr, baseTemp, isSOS = false) {
  const times = ['16:18', '16:19', '16:20', '16:21', '16:22', '16:23', '16:24'];
  return times.map((t, idx) => {
    const spike = isSOS && idx >= 4;
    return {
      time: t,
      hr: spike ? (idx === 4 ? 176 : 171) : baseHr + ((idx % 3) - 1) * 2,
      temp: spike ? 38.3 : +(baseTemp + idx * 0.03).toFixed(1),
      activityLevel: spike ? 2 : 35 + (idx % 2) * 5,
    };
  });
}

// Generate all 22 Players (P01 to P22) matching the poster's telemetry table
const buildInitialRoster = () => {
  const preset = {
    P01: { hr: 132, temp: 37.1, status: 'Normal', activity: 'Active', x: 25, y: 35, battery: 94, contact: true, bloodType: 'O+', allergies: 'None', baselineHR: 64 },
    P02: { hr: 128, temp: 36.9, status: 'Normal', activity: 'Active', x: 40, y: 22, battery: 91, contact: true, bloodType: 'A+', allergies: 'Penicillin', baselineHR: 62 },
    P03: { hr: 145, temp: 37.4, status: 'Review', activity: 'Active', x: 52, y: 48, battery: 89, contact: true, bloodType: 'B+', allergies: 'None', baselineHR: 66 },
    P04: { hr: 162, temp: 38.1, status: 'High Risk', activity: 'Reduced', x: 64, y: 60, battery: 86, contact: true, bloodType: 'O-', allergies: 'Asthma (Inhaler)', baselineHR: 68 },
    P05: { hr: 130, temp: 36.8, status: 'Normal', activity: 'Active', x: 30, y: 70, battery: 95, contact: true, bloodType: 'AB+', allergies: 'None', baselineHR: 60 },
    P06: { hr: 124, temp: 36.7, status: 'Normal', activity: 'Active', x: 48, y: 75, battery: 92, contact: true, bloodType: 'O+', allergies: 'None', baselineHR: 61 },
    P07: { hr: 171, temp: 38.3, status: 'SOS', activity: 'No movement', x: 74, y: 32, battery: 88, contact: true, bloodType: 'A-', allergies: 'Prior Heat Exhaustion (2025)', baselineHR: 65 },
    P08: { hr: 136, temp: 37.0, status: 'Normal', activity: 'Active', x: 60, y: 28, battery: 90, contact: true, bloodType: 'B+', allergies: 'None', baselineHR: 64 },
    P09: { hr: 126, temp: 36.9, status: 'Normal', activity: 'Active', x: 80, y: 50, battery: 93, contact: true, bloodType: 'O+', allergies: 'None', baselineHR: 63 },
    P10: { hr: 138, temp: 37.2, status: 'Normal', activity: 'Active', x: 18, y: 50, battery: 87, contact: true, bloodType: 'A+', allergies: 'None', baselineHR: 66 },
  };

  return Array.from({ length: 22 }, (_, i) => {
    const id = `P${String(i + 1).padStart(2, '0')}`;
    if (preset[id]) {
      const p = preset[id];
      return {
        id,
        name: `Player ${id}`,
        warnings: [],
        hrReservePct: 68,
        lastUpdate: '16:23:08',
        chartHistory: createSeedHistory(p.hr, p.temp, p.status === 'SOS'),
        ...p,
      };
    }
    const defaultHr = 125 + (i % 14);
    const defaultTemp = +(36.7 + (i % 5) * 0.1).toFixed(1);
    return {
      id,
      name: `Player ${id}`,
      hr: defaultHr,
      temp: defaultTemp,
      status: 'Normal',
      activity: 'Active',
      x: 15 + ((i * 17) % 72),
      y: 18 + ((i * 23) % 68),
      battery: 85 + (i % 15),
      contact: i !== 18, // Simulate 1 disconnected sensor on P19 (21/22 connected)
      bloodType: i % 2 === 0 ? 'O+' : 'A+',
      allergies: 'None',
      baselineHR: 62 + (i % 6),
      hrReservePct: 58,
      warnings: [],
      lastUpdate: '16:23:08',
      chartHistory: createSeedHistory(defaultHr, defaultTemp, false),
    };
  });
};

const STATUS_BADGE = {
  Normal: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/50',
  Review: 'text-amber-400 bg-amber-950/60 border-amber-700/50',
  'High Risk': 'text-orange-400 bg-orange-950/60 border-orange-700/50',
  SOS: 'text-white bg-red-600 border-red-400 animate-pulse font-bold',
};


export default function App() {
  const engineRef = useRef(new BaselineTrendEngine(12));
  const [players, setPlayers] = useState(buildInitialRoster);
  const [selectedId, setSelectedId] = useState('P07');
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'profile' | 'baseline' | 'replay' | 'readiness'
  const [envData, setEnvData] = useState({ temp: 32, humidity: 68, airQuality: 'Good' });
  const [simRunning, setSimRunning] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [currentDateTime, setCurrentDateTime]= useState(new Date())

  // Incident Replay State
  const [replayIndex, setReplayIndex] = useState(5); // Default to 16:23:10 SOS frame
  const [isReplaying, setIsReplaying] = useState(false);
  const [incidentLogs, setIncidentLogs] = useState([
    { time: '16:20:00', playerId: 'P03', type: 'Review', hr: 145, temp: 37.4, activity: 'Active', details: 'Elevated HR & temp trend' },
    { time: '16:21:30', playerId: 'P04', type: 'High Risk', hr: 162, temp: 38.1, activity: 'Reduced', details: 'Heat stress warning in 32°C ambient' },
    { time: '16:23:10', playerId: 'P07', type: 'SOS ALERT', hr: 171, temp: 38.3, activity: 'No movement', details: 'SOS triggered + zero movement on pitch' },
  ]);

 useEffect(() => {
  const timer = setInterval(() => {
    setCurrentDateTime(new Date());
  }, 1000);
  return () => clearInterval(timer);
}, []);

// Formatters for Time and Date
const formattedTime = currentDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const formattedDate = currentDateTime.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  // Register personal baselines on mount
  useEffect(() => {
    players.forEach((p) => {
      engineRef.current.registerPlayerBaseline(p.id, {
        baselineHR: p.baselineHR,
        maxHR: 195,
        baselineTemp: 36.6,
      });
    });
  }, []);

  // Connect to Local Node.js ESP-NOW Serial Bridge (ws://localhost:8080)
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket('ws://localhost:8080');
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'telemetry') {
          const nowTimeStr = new Date().toTimeString().slice(0, 8);

          setPlayers((prev) =>
            prev.map((p) => {
              if (p.id !== data.id) return p;

              const activityStr =
                data.activity === 0 ? 'No movement' : data.activity === 2 ? 'Fall Detected' : 'Active';

              const evalResult = engineRef.current.evaluateTelemetry(
                {
                  id: data.id,
                  hr: data.hr,
                  temp: data.temp,
                  activity: activityStr,
                  impactG: data.impactG,
                  sos: data.sos,
                  battery: data.battery,
                  contact: data.contact,
                },
                envData
              );

              if (evalResult.status === 'SOS') setSelectedId(data.id);

              const { x, y } = gpsToPitchXY(data.lat, data.lng);
              const nextHistory = [
                ...(p.chartHistory || []),
                {
                  time: nowTimeStr.slice(0, 5),
                  hr: data.hr,
                  temp: data.temp,
                  activityLevel: data.activity === 0 ? 2 : data.activity === 2 ? 95 : 38,
                },
              ].slice(-20);

              return {
                ...p,
                hr: data.hr,
                temp: data.temp,
                activity: activityStr,
                status: evalResult.status,
                hrReservePct: evalResult.hrReservePct,
                warnings: evalResult.warnings,
                battery: data.battery,
                contact: data.contact,
                x,
                y,
                lastUpdate: nowTimeStr,
                chartHistory: nextHistory,
              };
            })
          );
        } else if (data.type === 'env') {
          setEnvData({ temp: data.temp, humidity: data.humidity, airQuality: data.airQuality });
        }
      };
    } catch (err) {
      setWsConnected(false);
    }
    return () => ws && ws.close();
  }, [envData]);

  // Built-In Real-Time Telemetry Simulator (Updates HR, Temp, Chart, and GPS Pin)
  useEffect(() => {
    if (!simRunning) return;
    const interval = setInterval(() => {
      const nowTimeStr = new Date().toTimeString().slice(0, 8);

      setPlayers((prev) =>
        prev.map((p) => {
          const isSOS = p.status === 'SOS';
          const nextHr = isSOS
            ? Math.max(165, Math.min(178, p.hr + Math.floor(Math.random() * 5) - 2))
            : Math.max(115, Math.min(182, p.hr + Math.floor(Math.random() * 7) - 3));

          const nextTemp = isSOS
            ? 38.3
            : +(Math.max(36.6, Math.min(38.5, p.temp + (Math.random() * 0.1 - 0.045)))).toFixed(1);

          const evalResult = isSOS
            ? { status: 'SOS', hrReservePct: p.hrReservePct, warnings: p.warnings }
            : engineRef.current.evaluateTelemetry(
                { id: p.id, hr: nextHr, temp: nextTemp, activity: p.activity, battery: p.battery, contact: p.contact },
                envData
              );

          const nextX = isSOS ? p.x : Math.max(8, Math.min(92, +(p.x + (Math.random() * 3 - 1.5)).toFixed(1)));
          const nextY = isSOS ? p.y : Math.max(8, Math.min(92, +(p.y + (Math.random() * 3 - 1.5)).toFixed(1)));

          const nextHistory = [
            ...(p.chartHistory || []),
            {
              time: nowTimeStr.slice(0, 5),
              hr: nextHr,
              temp: nextTemp,
              activityLevel: isSOS ? 2 : 35 + Math.floor(Math.random() * 12),
            },
          ].slice(-20);

          return {
            ...p,
            hr: nextHr,
            temp: nextTemp,
            status: evalResult.status,
            hrReservePct: evalResult.hrReservePct,
            warnings: evalResult.warnings,
            x: nextX,
            y: nextY,
            lastUpdate: nowTimeStr,
            chartHistory: nextHistory,
          };
        })
      );
    }, 800);
    return () => clearInterval(interval);
  }, [simRunning, envData]);

  // Incident Replay Auto-Scrubber
  useEffect(() => {
    if (!isReplaying) return;
    const timer = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= P07_INCIDENT_REPLAY_FRAMES.length - 1) {
          setIsReplaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [isReplaying]);

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedId) || players[0],
    [players, selectedId]
  );

  const connectedCount = useMemo(() => players.filter((p) => p.contact).length, [players]);
  const alertCount = useMemo(() => players.filter((p) => p.status === 'SOS').length, [players]);

  const acknowledgeAlert = (id) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: 'Review', activity: 'Medical En Route', warnings: ['Incident acknowledged by medical team'] }
          : p
      )
    );
    setIncidentLogs((prev) => [
      {
        time: new Date().toTimeString().slice(0, 8),
        playerId: id,
        type: 'ACKNOWLEDGED',
        hr: selectedPlayer.hr,
        temp: selectedPlayer.temp,
        activity: 'Medical En Route',
        details: 'Medical response team dispatched and acknowledged alert',
      },
      ...prev,
    ]);
  };

  const activeReplayFrame = P07_INCIDENT_REPLAY_FRAMES[replayIndex];
  const historyLen = selectedPlayer.chartHistory?.length || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans select-none flex flex-col justify-between">
      {/* TOP STATUS BAR */}
      <header className="flex flex-wrap items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-5 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-red-500" />
          <div>
            <h1 className="text-xl font-extrabold tracking-wider text-sky-400">
              PRESERVE<span className="text-white">GUARD</span>
            </h1>
            <p className="text-[11px] uppercase tracking-widest text-slate-400">
              Team Safety Monitoring • {wsConnected ? 'ESP-NOW USB Receiver Live' : 'Offline Standalone Mode'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setSimRunning(!simRunning)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition ${
              simRunning
                ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {simRunning ? '● Live Sim Active' : '▶ Start Telemetry Sim'}
          </button>

          <div className="flex items-center gap-2 bg-slate-800/70 px-3.5 py-1.5 rounded-lg border border-slate-700">
            <Users className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-lg">{players.length}</span>
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
            <div className="text-lg font-bold leading-none">{formattedTime}</div>
            <div className="text-xs text-slate-400">{formattedDate}</div>
          </div>
        </div>
      </header>

      {/* MAIN 3-COLUMN GRID */}
      <div className="grid grid-cols-12 gap-4 my-4 flex-1">
        {/* LEFT COLUMN: 22-PLAYER TELEMETRY TABLE */}
        <section className="col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col max-h-[72vh]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Players (All 22 Nodes)
            </h2>
            <span className="text-[11px] text-slate-400">Click row to inspect</span>
          </div>
          <div className="overflow-y-auto flex-1 pr-1">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-900 z-10">
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
                          ? 'bg-sky-950/60'
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

        {/* CENTER COLUMN: DYNAMIC MODULE VIEW */}
        <section className="col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          {activeTab === 'dashboard' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Selected Player - {selectedPlayer.id}
                  </h2>
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Battery className="w-4 h-4 text-emerald-400" /> {selectedPlayer.battery}% | Sensor Contact:{' '}
                    <strong className={selectedPlayer.contact ? 'text-emerald-400' : 'text-red-400'}>
                      {selectedPlayer.contact ? 'OK' : 'LEAD OFF'}
                    </strong>
                  </span>
                </div>

                {/* SOS ALERT BANNER */}
                {selectedPlayer.status === 'SOS' ? (
                  <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg p-3.5 mb-4 flex items-center justify-between shadow-lg border border-red-400">
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
                      <div className="font-mono text-sm font-bold">{selectedPlayer.lastUpdate}</div>
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
                      Status: <span className="text-sky-400">{selectedPlayer.status}</span>
                    </span>
                    <span className="text-xs text-slate-400">
                      Resting Baseline: {selectedPlayer.baselineHR} bpm ({selectedPlayer.hrReservePct}% HRR)
                    </span>
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

              {/* REAL-TIME TIME-SERIES GRAPH */}
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
                  {[20, 50, 80, 110].map((y, idx) => (
                    <g key={idx}>
                      <line x1="30" y1={y} x2="350" y2={y} stroke="#1e293b" strokeWidth="1" />
                      <text x="5" y={y + 4} fill="#64748b" fontSize="9">
                        {200 - idx * 50}
                      </text>
                    </g>
                  ))}
                  {/* Live Heart Rate Curve (0 to 200 bpm scale) */}
                  <path
                    d={buildLiveSvgPath(selectedPlayer.chartHistory, 'hr', 0, 200)}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                  />
                  {/* Live Skin Temp Curve (Scaled so 36-39°C sits cleanly in the middle band) */}
                  <path
                    d={buildLiveSvgPath(selectedPlayer.chartHistory, 'temp', 30, 52)}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2"
                  />
                  {/* Live Activity Curve */}
                  <path
                    d={buildLiveSvgPath(selectedPlayer.chartHistory, 'activityLevel', 0, 200)}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                  />
                  {/* Dynamic Timestamps */}
                  <text x="30" y="126" fill="#94a3b8" fontSize="9">
                    {selectedPlayer.chartHistory?.[0]?.time || '16:18'}
                  </text>
                  <text x="175" y="126" fill="#94a3b8" fontSize="9">
                    {selectedPlayer.chartHistory?.[Math.floor(historyLen / 2)]?.time || '16:21'}
                  </text>
                  <text x="315" y="126" fill="#94a3b8" fontSize="9">
                    {selectedPlayer.chartHistory?.[historyLen - 1]?.time || '16:24'}
                  </text>
                </svg>
              </div>
            </>
          )}

          {/* MODULE: PERSONAL BASELINE & TREND WARNINGS */}
          {activeTab === 'baseline' && (
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Personal Baseline & Trend Warnings — {selectedPlayer.id}
                  </h2>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                    <div className="text-xs text-slate-400">Pre-Entry Resting Baseline</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1">
                      {selectedPlayer.baselineHR} bpm / 36.6°C
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                    <div className="text-xs text-slate-400">Current Exertion Load</div>
                    <div className="text-xl font-bold text-amber-400 mt-1">
                      +{selectedPlayer.hr - selectedPlayer.baselineHR} bpm above baseline
                    </div>
                  </div>
                </div>

                <h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">
                  Active Early-Warning Detections
                </h3>
                <div className="space-y-2">
                  {selectedPlayer.status === 'SOS' && (
                    <div className="bg-red-950/60 border border-red-600/60 p-3 rounded-lg text-xs text-red-200">
                      <strong>CRITICAL ANOMALY:</strong> Heart rate ({selectedPlayer.hr} bpm) and skin
                      temperature ({selectedPlayer.temp}°C) spiked while IMU reports{' '}
                      <strong>{selectedPlayer.activity}</strong>.
                    </div>
                  )}
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-slate-300">
                    <strong>Heat-Stress Correlation:</strong> Pitch ambient is {envData.temp}°C at{' '}
                    {envData.humidity}% humidity (High Thermal Risk). Player skin temp is{' '}
                    {(selectedPlayer.temp - 36.6).toFixed(1)}°C above baseline.
                  </div>
                </div>
              </div>

              <div className="bg-amber-950/40 border border-amber-700/50 rounded-lg p-3 text-[11px] text-amber-200">
                <strong>Important Notice:</strong> This system supports early warning and emergency response. It
                does not diagnose medical conditions; clinical decisions must be made by qualified healthcare
                professionals.
              </div>
            </div>
          )}

          {/* MODULE: INCIDENT REPLAY TIMELINE SCRUBBER */}
          {activeTab === 'replay' && (
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Incident Replay & Event Timeline (Player P07)
                  </h2>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-bold text-sky-400">
                      Frame Timestamp: {activeReplayFrame.time}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded border ${STATUS_BADGE[activeReplayFrame.status]}`}>
                      {activeReplayFrame.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center my-3">
                    <div className="bg-slate-900 p-2 rounded">
                      <div className="text-[11px] text-slate-400">HR</div>
                      <div className="text-lg font-bold text-white">{activeReplayFrame.hr} bpm</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded">
                      <div className="text-[11px] text-slate-400">Skin Temp</div>
                      <div className="text-lg font-bold text-white">{activeReplayFrame.temp}°C</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded">
                      <div className="text-[11px] text-slate-400">IMU Activity</div>
                      <div className="text-sm font-bold text-amber-400">{activeReplayFrame.activity}</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 bg-slate-900/90 p-2 rounded border border-slate-800">
                    <strong>Event Note:</strong> {activeReplayFrame.note}
                  </p>
                </div>

                {/* Scrubber Controls */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => {
                        if (replayIndex >= P07_INCIDENT_REPLAY_FRAMES.length - 1) setReplayIndex(0);
                        setIsReplaying(!isReplaying);
                      }}
                      className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"
                    >
                      {isReplaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {isReplaying ? 'Pause' : 'Play Incident'}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max={P07_INCIDENT_REPLAY_FRAMES.length - 1}
                      value={replayIndex}
                      onChange={(e) => {
                        setIsReplaying(false);
                        setReplayIndex(Number(e.target.value));
                      }}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    {P07_INCIDENT_REPLAY_FRAMES.map((f, i) => (
                      <span key={i} className={i === replayIndex ? 'text-sky-400 font-bold' : ''}>
                        {f.time.slice(0, 5)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <h3 className="text-xs font-semibold uppercase text-slate-400 mb-1.5">Session Incident Log</h3>
                <div className="space-y-1.5 max-h-28 overflow-y-auto text-xs">
                  {incidentLogs.map((log, index) => (
                    <div
                      key={index}
                      className="bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded flex justify-between"
                    >
                      <span>
                        <strong className="text-sky-400">{log.time}</strong> [{log.playerId}] {log.details}
                      </span>
                      <span className="font-mono text-slate-400">{log.hr} bpm</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MODULE: MEDICAL PROFILE & EMERGENCY INFO */}
          {activeTab === 'profile' && (
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Authorised Medical Profile — {selectedPlayer.id}
                  </h2>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    ✕ Close
                  </button>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Player ID / Squad Tag:</span>
                    <span className="font-bold text-white">{selectedPlayer.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Blood Group:</span>
                    <span className="font-bold text-emerald-400">{selectedPlayer.bloodType}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Allergies / Medical Notes:</span>
                    <span className="font-semibold text-amber-300">{selectedPlayer.allergies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Resting ECG Baseline:</span>
                    <span className="font-mono">{selectedPlayer.baselineHR} bpm (Sinus Rhythm)</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Access restricted to authorised team medical personnel for rapid pitch-side triage.
              </p>
            </div>
          )}

          {/* MODULE: PRE-ENTRY READINESS CHECK */}
          {activeTab === 'readiness' && (
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Pre-Entry Readiness Check (22 Jackets)
                  </h2>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    ✕ Close
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Verifies ECG chest contact, battery reserve, ESP-NOW RF link, and baseline readings before pitch entry.
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 text-xs">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className={`p-2 rounded border flex items-center justify-between ${
                        p.contact && p.battery > 20
                          ? 'bg-slate-950 border-slate-800'
                          : 'bg-red-950/40 border-red-700'
                      }`}
                    >
                      <span className="font-mono font-bold">{p.id}</span>
                      <span className="text-slate-400">{p.battery}% Bat</span>
                      {p.contact ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Check Leads
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-xs text-emerald-400 font-semibold">
                ✓ {connectedCount} of 22 Smart Jackets Verified & Streaming via RF (ESP-NOW)
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: GPS PITCH MAP & ENVIRONMENTAL CONDITIONS */}
        <section className="col-span-3 flex flex-col gap-4">
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

              {/* Selected Player GPS Pin (Updates during Incident Replay or Live View) */}
              <div
                style={{
                  left: `${activeTab === 'replay' ? activeReplayFrame.x : selectedPlayer.x}%`,
                  top: `${activeTab === 'replay' ? activeReplayFrame.y : selectedPlayer.y}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300"
              >
                <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white animate-ping absolute" />
                <MapPin className="w-6 h-6 text-red-500 fill-red-600 drop-shadow relative z-10" />
                <span className="bg-slate-950/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-700 mt-0.5">
                  {activeTab === 'replay' ? 'P07' : selectedPlayer.id}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
              <span>Last update: {activeTab === 'replay' ? activeReplayFrame.time : selectedPlayer.lastUpdate}</span>
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
        <button
          onClick={() => setActiveTab(activeTab === 'profile' ? 'dashboard' : 'profile')}
          className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold border transition ${
            activeTab === 'profile'
              ? 'bg-sky-600 border-sky-400 text-white'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
        >
          <User className="w-4 h-4" /> Player Profile
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'baseline' ? 'dashboard' : 'baseline')}
          className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold border transition ${
            activeTab === 'baseline'
              ? 'bg-sky-600 border-sky-400 text-white'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" /> Baseline & Trends
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'replay' ? 'dashboard' : 'replay')}
          className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold border transition ${
            activeTab === 'replay'
              ? 'bg-sky-600 border-sky-400 text-white'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
        >
          <RotateCcw className="w-4 h-4" /> Incident Replay
        </button>

        <button
          onClick={() => exportTelemetryToCSV(players, incidentLogs, envData)}
          className="flex items-center justify-center gap-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 py-2 px-4 rounded-lg text-xs font-semibold transition"
        >
          <Download className="w-4 h-4" /> Export Report (CSV)
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'readiness' ? 'dashboard' : 'readiness')}
          className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold border transition ${
            activeTab === 'readiness'
              ? 'bg-sky-600 border-sky-400 text-white'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> Pre-Entry Check
        </button>
      </footer>
    </div>
  );
}