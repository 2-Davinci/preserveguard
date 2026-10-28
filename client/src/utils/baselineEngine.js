// src/utils/baselineEngine.js

/**
 * Evaluates a player's live telemetry against their personal baseline
 * and ambient environmental conditions to generate early warnings.
 */
export class BaselineTrendEngine {
  constructor(windowSize = 12) {
    this.windowSize = windowSize; // Rolling window of recent samples (~6-12 seconds)
    this.playerProfiles = new Map();
  }

  /**
   * Initializes or updates a player's personal baseline during Pre-Entry Readiness Check
   */
  registerPlayerBaseline(playerId, { baselineHR = 68, maxHR = 195, baselineTemp = 36.6 } = {}) {
    this.playerProfiles.set(playerId, {
      baselineHR,
      maxHR,
      baselineTemp,
      history: [], // Rolling telemetry buffer
    });
  }

  /**
   * Computes Heat Stress Index using ambient pitch Temp (°C) and Relative Humidity (%)
   */
  computeAmbientHeatStress(ambientTempC, humidityPct) {
    // Simplified Steadman Heat Index approximation in Celsius
    const hi =
      -8.78469475556 +
      1.61139411 * ambientTempC +
      2.33854883889 * humidityPct +
      -0.14611605 * ambientTempC * humidityPct +
      -0.012308094 * Math.pow(ambientTempC, 2) +
      -0.0164248277778 * Math.pow(humidityPct, 2) +
      0.002211732 * Math.pow(ambientTempC, 2) * humidityPct +
      0.00072546 * ambientTempC * Math.pow(humidityPct, 2) +
      -0.000003582 * Math.pow(ambientTempC, 2) * Math.pow(humidityPct, 2);

    if (hi >= 40) return { index: hi, riskLevel: 'Extreme' };
    if (hi >= 32) return { index: hi, riskLevel: 'High' };
    if (hi >= 27) return { index: hi, riskLevel: 'Moderate' };
    return { index: hi, riskLevel: 'Low' };
  }

  /**
   * Processes incoming ESP-NOW packet and returns status classification + clinical warnings
   */
  evaluateTelemetry(sample, env = { temp: 32, humidity: 68 }) {
    const { id, hr, temp, activity, impactG = 1.0, sos = false, battery = 100, contact = true } = sample;

    if (!this.playerProfiles.has(id)) {
      this.registerPlayerBaseline(id);
    }

    const profile = this.playerProfiles.get(id);
    const now = Date.now();

    // Push sample into player's rolling window
    profile.history.push({ timestamp: now, hr, temp, activity, impactG });
    if (profile.history.length > this.windowSize) {
      profile.history.shift();
    }

    const warnings = [];
    let status = 'Normal';

    // 1. Hardware / Pre-Entry Readiness Checks
    if (!contact) warnings.push('ECG chest sensor contact lost');
    if (battery <= 15) warnings.push(`Low jacket battery (${battery}%)`);

    // 2. Calculate Personal Baseline Deviations & Trend Slopes
    const firstSample = profile.history[0];
    const hrDelta = hr - firstSample.hr;
    const tempDelta = +(temp - firstSample.temp).toFixed(2);
    const hrReservePct = Math.round(
      ((hr - profile.baselineHR) / (profile.maxHR - profile.baselineHR)) * 100
    );

    // 3. Ambient Heat-Stress Correlation
    const heatStress = this.computeAmbientHeatStress(env.temp, env.humidity);
    const thermalThreshold = heatStress.riskLevel === 'High' || heatStress.riskLevel === 'Extreme' ? 37.9 : 38.2;

    // 4. Multi-Factor Anomaly Classification
    if (sos) {
      status = 'SOS';
      warnings.push('Manual SOS or critical post-impact inactivity triggered');
    } else if (activity === 'No movement' && hr >= 160) {
      status = 'SOS';
      warnings.push('Critical: High HR with zero player movement detected');
    } else if (temp >= thermalThreshold || hr >= profile.maxHR * 0.88 || impactG >= 4.2) {
      status = 'High Risk';
      if (temp >= thermalThreshold) {
        warnings.push(`Heat stress risk: Skin temp ${temp.toFixed(1)}°C in ${env.temp}°C ambient`);
      }
      if (hr >= profile.maxHR * 0.88) {
        warnings.push(`Heart rate at ${hrReservePct}% of personal reserve`);
      }
      if (impactG >= 4.2) {
        warnings.push(`High-G collision detected (${impactG.toFixed(1)}G)`);
      }
    } else if (hr >= 145 || temp >= 37.4 || hrDelta >= 18 || tempDelta >= 0.4) {
      status = 'Review';
      if (hrDelta >= 18) warnings.push(`Rapid HR spike (+${hrDelta} bpm over window)`);
      if (tempDelta >= 0.4) warnings.push(`Rising skin temperature trend (+${tempDelta}°C)`);
      if (warnings.length === 0) warnings.push('Elevated exertion — monitor baseline trend');
    }

    return {
      status,
      hrReservePct: Math.max(0, Math.min(100, hrReservePct)),
      hrTrendDelta: hrDelta,
      tempTrendDelta: tempDelta,
      heatIndex: Math.round(heatStress.index),
      heatRiskLevel: heatStress.riskLevel,
      warnings,
    };
  }
}