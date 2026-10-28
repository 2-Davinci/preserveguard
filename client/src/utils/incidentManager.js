// src/utils/incidentManager.js

/**
 * Generates and downloads a clinical CSV report of all 22 players or a specific incident log.
 */
export function exportTelemetryToCSV(players, incidentLogs = [], envData = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const headers = [
    'Player_ID',
    'Heart_Rate_BPM',
    'Skin_Temp_C',
    'Activity_State',
    'Status_Alert',
    'HR_Reserve_Pct',
    'Battery_Pct',
    'Sensor_Contact',
    'Pitch_X_Pct',
    'Pitch_Y_Pct',
    'Ambient_Temp_C',
    'Ambient_Humidity_Pct',
    'Air_Quality',
    'Clinical_Warnings',
  ];

  const rows = players.map((p) => [
    p.id,
    p.hr,
    p.temp.toFixed(1),
    `"${p.activity}"`,
    `"${p.status}"`,
    p.hrReservePct || 65,
    p.battery,
    p.contact ? 'OK' : 'LEAD_OFF',
    p.x,
    p.y,
    envData.temp ?? 32,
    envData.humidity ?? 68,
    `"${envData.airQuality ?? 'Good'}"`,
    `"${(p.warnings || []).join('; ')}"`,
  ]);

  let csvContent = '# PULSEGUARD SMART FOOTBALLER SAFETY JACKET - SESSION REPORT\n';
  csvContent += `# Generated: ${new Date().toLocaleString()}\n`;
  csvContent += headers.join(',') + '\n';
  csvContent += rows.map((r) => r.join(',')).join('\n');

  if (incidentLogs.length > 0) {
    csvContent += '\n\n# INCIDENT REPLAY TIMELINE LOGS\n';
    csvContent += 'Time,Player_ID,Event_Type,HR_BPM,Skin_Temp_C,Activity,Details\n';
    incidentLogs.forEach((log) => {
      csvContent += `${log.time},${log.playerId},"${log.type}",${log.hr},${log.temp},"${log.activity}","${log.details}"\n`;
    });
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `PULSEGUARD_Report_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Pre-recorded Incident Replay sequence for Player P07 (16:18 to 16:24)
 * Allows medical staff to scrub frame-by-frame through the collapse event.
 */
export const P07_INCIDENT_REPLAY_FRAMES = [
  { time: '16:18:00', hr: 134, temp: 37.2, activity: 'Active', status: 'Normal', x: 58, y: 44, note: 'Normal training intensity' },
  { time: '16:19:00', hr: 138, temp: 37.3, activity: 'Active', status: 'Normal', x: 62, y: 39, note: 'Sprint recovery phase' },
  { time: '16:20:00', hr: 146, temp: 37.5, activity: 'Active', status: 'Review', x: 67, y: 36, note: 'Personal baseline warning: rising temp trend' },
  { time: '16:21:00', hr: 158, temp: 37.9, activity: 'Reduced', status: 'High Risk', x: 71, y: 34, note: 'Heat-stress threshold approached' },
  { time: '16:22:00', hr: 174, temp: 38.2, activity: 'Fall Detected', status: 'SOS', x: 74, y: 32, note: 'High-G impact / sudden collapse detected' },
  { time: '16:23:10', hr: 171, temp: 38.3, activity: 'No movement', status: 'SOS', x: 74, y: 32, note: 'SOS button pressed / zero movement confirmed' },
  { time: '16:24:00', hr: 166, temp: 38.3, activity: 'No movement', status: 'SOS', x: 74, y: 32, note: 'Medical team dispatched to pitch coordinates' },
];