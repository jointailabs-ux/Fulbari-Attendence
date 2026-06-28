#!/usr/bin/env node
// scripts/test-morfin.mjs
// Standalone diagnostic script for MorFin Auth Client Service
// Run: node scripts/test-morfin.mjs

const MORFIN_BASE = "http://127.0.0.1:8030/morfinauth";

import net from 'net';

async function post(endpoint, body = {}) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const req = `POST /morfinauth/${endpoint} HTTP/1.1\r\nHost: 127.0.0.1:8030\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(payload)}\r\nConnection: close\r\n\r\n${payload}`;
    
    const client = new net.Socket();
    let responseData = "";
    client.connect(8030, '127.0.0.1', () => { client.write(req); });
    client.on('data', data => { responseData += data.toString(); });
    client.on('close', () => {
      const parts = responseData.split('\r\n\r\n');
      const bodyStr = parts.length > 1 ? parts[1] : "";
      const statusMatch = responseData.match(/HTTP\/1\.[01] (\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 500;
      
      let data = {};
      if (bodyStr) {
        try { data = JSON.parse(bodyStr); }
        catch (e) { data = { ErrorCode: status, ErrorDescription: `Non-JSON Response: ${bodyStr}` }; }
      } else {
        data = { ErrorCode: status, ErrorDescription: `HTTP ${status} Empty Response` };
      }
      resolve({ status, data });
    });
    client.on('error', () => {
      resolve({ status: 500, data: { ErrorCode: 500, ErrorDescription: "Connection refused. Is MorFin service running?" }});
    });
  });
}

function hr() {
  console.log("\n" + "═".repeat(60) + "\n");
}

async function main() {
  console.log("🔬 MorFin Auth Client Service — Diagnostic Test");
  console.log("   Base URL:", MORFIN_BASE);
  hr();

  // 1. Connected device list
  console.log("📡 Step 1: Get connected devices...");
  let deviceName;
  try {
    const { data } = await post("connecteddevicelist", {});
    console.log("   Response:", JSON.stringify(data, null, 2));

    if (data.ErrorCode !== "0" && data.ErrorCode !== 0) {
      console.log("   ❌ Error response:", data.ErrorDescription);
      return;
    }

    // Parse device name from DeviceList array or ErrorDescription string
    if (data.DeviceList && data.DeviceList.length > 0) {
      deviceName = data.DeviceList[0];
    } else if (data.ErrorDescription) {
      const parts = data.ErrorDescription.split(":");
      if (parts.length > 1) {
        const devices = parts[1].trim().split(",").map(d => d.trim()).filter(Boolean);
        if (devices.length > 0) deviceName = devices[0];
      }
    }

    if (deviceName) {
      console.log("   ✅ Device found:", deviceName);
    } else {
      console.log("   ❌ No devices found. Is your MFS500 plugged in?");
      return;
    }
  } catch (e) {
    console.log("   ❌ Cannot reach MorFin service:", e.message);
    console.log("   → Make sure MorFinAuthClientService is running (check Windows Services).");
    return;
  }

  hr();

  // 1.5 Uninit device just in case it's in a bad state
  console.log("🔧 Step 1.5: Uninitialize device (cleanup)...");
  await post("uninitdevice");

  // 2. Init device
  console.log("🔧 Step 2: Initialize device:", deviceName);
  try {
    const { data } = await post("initdevice", { ConnectedDvc: deviceName, ClientKey: "" });
    console.log("   Response:", JSON.stringify(data, null, 2));
    if (data.ErrorCode === 0 || data.ErrorCode === "0") {
      console.log("   ✅ Device initialized successfully.");
    } else {
      console.log("   ⚠️ Init returned error code:", data.ErrorCode);
    }
  } catch (e) {
    console.log("   ❌ Init failed:", e.message);
    return;
  }

  hr();

  // 3. Capture fingerprint #1
  console.log("🖐️  Step 3: Capture fingerprint #1");
  console.log("   👉 Place your finger on the scanner NOW... (scanner light should turn on)");
  
  let template1;
  let capSuccess = false;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`   ⏳ Retry attempt ${attempt}/3: Place finger firmly on scanner...`);
      }
      
      // Use Quality: 40 (more lenient for dry fingers) and TimeOut: 15
      const { data: capData } = await post("capture", { Quality: 40, TimeOut: 15 });
      console.log(`   Capture response (Attempt ${attempt}):`, JSON.stringify(capData, null, 2));

      if (capData.ErrorCode === "-2019" || capData.ErrorDescription === "Capture timeout.") {
        console.log("   ⚠️ Capture timed out. Finger was not detected quickly enough or quality was too low.");
        if (attempt === 3) return;
        continue; // Retry
      }

      if ((capData.ErrorCode !== 0 && capData.ErrorCode !== "0") || (capData.Status && capData.Status !== "CAPTURE SUCCESS")) {
        console.log("   ❌ Capture failed:", capData.Status || capData.ErrorDescription);
        return;
      }

      console.log("   ✅ Capture successful! Quality:", capData.Quality);

      // Get template
      const { data: tplData } = await post("gettemplate", { TmpFormat: 0 });
      template1 = tplData.TemplateBase64 || tplData.TemplateData;
      if (template1) {
        console.log("   ✅ Template received:");
        console.log("      First 50 chars:", template1.substring(0, 50) + "...");
        console.log("      Total length:", template1.length, "chars");
        capSuccess = true;
        break;
      } else {
        console.log("   ❌ Empty template. Full response:", JSON.stringify(tplData, null, 2));
        return;
      }
    } catch (e) {
      console.log("   ❌ Capture error:", e.message);
      return;
    }
  }

  if (!capSuccess) return;

  hr();

  // 4. Capture fingerprint #2 for verification
  console.log("🖐️  Step 4: Capture fingerprint #2 (for verification)");
  console.log("   👉 LIFT and REPLACE the SAME finger on the scanner...");

  // Small delay to let the user lift and replace finger
  await new Promise(r => setTimeout(r, 1500));

  let template2;
  let cap2Success = false;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`   ⏳ Retry attempt ${attempt}/3: Place finger firmly on scanner...`);
      }
      const { data: capData } = await post("capture", { Quality: 40, TimeOut: 15 });
      console.log(`   Capture response (Attempt ${attempt}):`, JSON.stringify(capData, null, 2));

      if (capData.ErrorCode === "-2019" || capData.ErrorDescription === "Capture timeout.") {
        console.log("   ⚠️ Capture timed out.");
        if (attempt === 3) return;
        continue; // Retry
      }

      if ((capData.ErrorCode !== 0 && capData.ErrorCode !== "0") || (capData.Status && capData.Status !== "CAPTURE SUCCESS")) {
        console.log("   ❌ Second capture failed:", capData.Status || capData.ErrorDescription);
        return;
      }

      console.log("   ✅ Second capture successful! Quality:", capData.Quality);

      const { data: tplData } = await post("gettemplate", { TmpFormat: 0 });
      template2 = tplData.TemplateBase64 || tplData.TemplateData;
      if (template2) {
        console.log("   ✅ Template received, length:", template2.length, "chars");
        cap2Success = true;
        break;
      } else {
        console.log("   ❌ Empty template.");
        return;
      }
    } catch (e) {
      console.log("   ❌ Second capture error:", e.message);
      return;
    }
  }

  if (!cap2Success) return;

  hr();

  // 5. Verify templates
  console.log("🔍 Step 5: Verify templates against each other...");
  try {
    const { data } = await post("verify", {
      GalleryTemplate: template1,
      ProbeTemplate: template2,
    });
    console.log("   Verify response:", JSON.stringify(data, null, 2));

    const match = data.Match === true || data.Match === "true" || data.Match === "True" ||
                  data.Status === true || data.Status === "True";
    const score = data.MatchScore ?? data.Score ?? "N/A";

    if (match) {
      console.log(`   ✅ MATCH! Score: ${score}`);
    } else {
      console.log(`   ❌ NO MATCH. Score: ${score}`);
      console.log("   → If you used the same finger, check if the device is working correctly.");
    }
  } catch (e) {
    console.log("   ❌ Verify error:", e.message);
  }

  hr();

  // 6. Uninit device
  console.log("🧹 Step 6: Uninitializing device...");
  try {
    await post("uninitdevice", {});
    console.log("   ✅ Device uninitialized.");
  } catch {
    console.log("   (skipped — non-critical)");
  }

  console.log("\n🏁 Test complete!");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
