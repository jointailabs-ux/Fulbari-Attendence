async function test() {
  const PORT = 11100;
  const BASE = `http://127.0.0.1:${PORT}`;

  // Try multiple PidOptions variations
  const variants = [
    // Variant 1: Minimal with XML declaration
    `<?xml version="1.0"?><PidOptions ver="1.0"><Opts fCount="1" fType="0" iCount="0" iType="0" pCount="0" pType="0" format="0" pidVer="2.0" timeout="10000" posh="UNKNOWN" /></PidOptions>`,
    
    // Variant 2: Without XML declaration
    `<PidOptions ver="1.0"><Opts fCount="1" fType="0" iCount="0" iType="0" pCount="0" pType="0" format="0" pidVer="2.0" timeout="10000" posh="UNKNOWN" /></PidOptions>`,
    
    // Variant 3: With env attribute
    `<?xml version="1.0"?><PidOptions ver="1.0"><Opts fCount="1" fType="0" iCount="0" iType="0" pCount="0" pType="0" format="0" pidVer="2.0" timeout="10000" posh="UNKNOWN" env="P" /></PidOptions>`,
    
    // Variant 4: With wadh and otp empty
    `<?xml version="1.0"?><PidOptions ver="1.0"><Opts fCount="1" fType="0" iCount="0" iType="0" pCount="0" pType="0" format="0" pidVer="2.0" timeout="10000" posh="UNKNOWN" env="P" wadh="" otp="" /></PidOptions>`,
    
    // Variant 5: With CustOpts
    `<?xml version="1.0"?><PidOptions ver="1.0"><Opts fCount="1" fType="0" iCount="0" iType="0" pCount="0" pType="0" format="0" pidVer="2.0" timeout="10000" posh="UNKNOWN" env="P" wadh="" otp="" /><CustOpts><Param name="mantrakey" value="" /></CustOpts></PidOptions>`,

    // Variant 6: fType=2 (ISO 19794-2)
    `<?xml version="1.0"?><PidOptions ver="1.0"><Opts fCount="1" fType="2" iCount="0" iType="0" pCount="0" pType="0" format="0" pidVer="2.0" timeout="10000" posh="UNKNOWN" env="P" wadh="" otp="" /></PidOptions>`,

    // Variant 7: Minimal with just required attributes
    `<?xml version="1.0"?><PidOptions ver="1.0"><Opts fCount="1" fType="0" format="0" pidVer="2.0" timeout="10000" posh="UNKNOWN" env="P" /></PidOptions>`,
  ];

  for (let i = 0; i < variants.length; i++) {
    console.log(`\n--- Variant ${i + 1} ---`);
    try {
      const res = await fetch(`${BASE}/rd/capture`, {
        method: 'CAPTURE',
        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        body: variants[i]
      });
      const text = await res.text();
      const errMatch = text.match(/errCode="([^"]+)"/);
      const infoMatch = text.match(/errInfo="([^"]+)"/);
      if (errMatch && errMatch[1] !== '0') {
        console.log(`Error ${errMatch[1]}: ${infoMatch ? infoMatch[1] : 'unknown'}`);
      } else {
        console.log('SUCCESS! Full response:');
        console.log(text);
      }
    } catch (e) {
      console.log('Network error:', e.message);
    }
  }
}

test();
