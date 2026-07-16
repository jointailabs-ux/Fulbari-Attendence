# fix-mantra-service.ps1
# This script must be run as Administrator in PowerShell.
# It fixes two critical biometric issues:
# 1. Trusts the expired Mantra certificate and completely reinstalls the driver to clear cached blocks (Code 52).
# 2. Replaces the 64-bit DLL with the correct 32-bit DLL to prevent service crashes.

# Determine log path dynamically
$logPath = Join-Path $PSScriptRoot "fix-log.txt"
"Starting fix script at $(Get-Date)" | Out-File -FilePath $logPath

function Log($msg, $color="White") {
    Write-Host $msg -ForegroundColor $color
    "$(Get-Date): $msg" | Out-File -FilePath $logPath -Append
}

# Self-elevation check
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Log "This script MUST be run as Administrator." "Red"
    Log "Please close this window, right-click PowerShell, select 'Run as Administrator', and run this script again." "Yellow"
    Log "Press any key to exit..." "Yellow"
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

Log "--- Mantra MFS500 MorFin Service & Driver Fixer ---" "Cyan"

# 1. Stop the service and kill running processes holding the DLL
Log "Stopping service 'MorFinAuthClientSvc'..." "Yellow"
Stop-Service -Name "MorFinAuthClientSvc" -Force -ErrorAction SilentlyContinue

Log "Closing running Mantra/MorFin test tools and service processes to release file locks..." "Yellow"
Get-Process | Where-Object { $_.Name -like "*MorFin*" -or $_.Name -like "*Mantra*" } | ForEach-Object {
    Log "Stopping process: $($_.Name) (ID: $($_.Id))" "Cyan"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

# Wait for processes to exit
Log "Waiting 3 seconds for processes to fully exit..." "Yellow"
Start-Sleep -Seconds 3

# 2. Driver Signature Fix: Export and trust the expired signature certificate
Log "Checking for MFS500 driver package in DriverStore..." "Yellow"
$driverDir = Get-ChildItem -Path C:\Windows\System32\DriverStore\FileRepository -Filter *m0023.inf* -ErrorAction SilentlyContinue | Select-Object -First 1
if ($driverDir) {
    $catFile = Join-Path $driverDir.FullName "M0023.cat"
    if (Test-Path $catFile) {
        Log "Found driver catalog file at: $catFile" "White"
        try {
            $sig = Get-AuthenticodeSignature $catFile
            if ($sig.SignerCertificate) {
                Log "Exporting driver certificate: $($sig.SignerCertificate.Subject)..." "Yellow"
                $tempCer = [System.IO.Path]::GetTempFileName() + ".cer"
                [System.IO.File]::WriteAllBytes($tempCer, $sig.SignerCertificate.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))
                
                Log "Importing certificate into Trusted Root Certification Authorities..." "Yellow"
                Import-Certificate -FilePath $tempCer -CertStoreLocation Cert:\LocalMachine\Root -ErrorAction Stop | Out-Null
                
                Log "Importing certificate into Trusted Publishers..." "Yellow"
                Import-Certificate -FilePath $tempCer -CertStoreLocation Cert:\LocalMachine\TrustedPublisher -ErrorAction Stop | Out-Null
                
                Remove-Item $tempCer -Force -ErrorAction SilentlyContinue
                Log "Driver certificate successfully trusted!" "Green"
            }
        } catch {
            Log "Failed to trust driver certificate: $_" "Red"
        }
    }
}

# 3. Force Uninstall and Reinstall Driver Package to clear cached "unsigned" status
Log "Re-installing driver package to clear Windows signature cache..." "Yellow"
# Search for active oem INF name
$oemInf = Get-WindowsDriver -Online -All | Where-Object { $_.ProviderName -like "*Mantra*" -or $_.OriginalName -like "*m0023.inf*" } -ErrorAction SilentlyContinue | Select-Object -First 1
if ($oemInf) {
    Log "Found registered OEM INF: $($oemInf.DriverName) ($($oemInf.OriginalName))" "White"
    try {
        pnputil /delete-driver $oemInf.DriverName /uninstall /force | Out-Null
        Log "Uninstalled old driver package $($oemInf.DriverName)" "Green"
    } catch {
        Log "Failed to uninstall old driver: $_" "Red"
    }
}

if ($driverDir) {
    $storeInf = Join-Path $driverDir.FullName "m0023.inf"
    Log "Re-adding driver package from DriverStore to re-verify signature..." "Yellow"
    try {
        pnputil /add-driver $storeInf /install | Out-Null
        Log "Driver package reinstalled successfully!" "Green"
    } catch {
        Log "Failed to reinstall driver package: $_" "Red"
    }
}

# 4. Reset the USB device to clear signature block state
Log "Resetting the MANTRA_MFS500 USB device..." "Yellow"
$device = Get-PnpDevice | Where-Object { $_.FriendlyName -like "*MANTRA_MFS500*" -or $_.InstanceId -like "*VID_2C0F&PID_1100*" } -ErrorAction SilentlyContinue | Select-Object -First 1
if ($device) {
    Log "Found device: $($device.FriendlyName) ($($device.InstanceId))" "White"
    try {
        pnputil /restart-device $device.InstanceId | Out-Null
        Log "USB device reset triggered successfully." "Green"
    } catch {
        Log "Failed to restart device via pnputil: $_" "Red"
    }
} else {
    Log "MANTRA_MFS500 USB scanner is not currently plugged in." "Yellow"
}

# 5. Service Architecture DLL Fix
$serviceDir = "C:\Program Files\Mantra\MorFinAuth\MorFinAuthClientService"
$targetDll = Join-Path $serviceDir "Morfin_Auth_Core.dll"
$backupDll = Join-Path $serviceDir "Morfin_Auth_Core.dll.bak"
$sourceDll = "C:\Program Files\Mantra\MorFin\Driver\MorFinAuthTest\Morfin_Auth_Core.dll"

Log "Target DLL path: $targetDll" "White"
Log "Source DLL path: $sourceDll" "White"

# Check if files exist
Log "Source file exists: $(Test-Path $sourceDll)" "White"
Log "Target file exists: $(Test-Path $targetDll)" "White"

# Backup current DLL if not already backed up
if (Test-Path $targetDll) {
    if (-not (Test-Path $backupDll)) {
        Log "Backing up original DLL to: $backupDll" "Yellow"
        Copy-Item -Path $targetDll -Destination $backupDll -Force -ErrorAction SilentlyContinue
    } else {
        Log "Backup already exists at: $backupDll" "White"
    }
}

# Copy the correct 32-bit DLL
if (Test-Path $sourceDll) {
    $copied = $false
    for ($i = 1; $i -le 5; $i++) {
        try {
            Log "Copying correct 32-bit DLL (Attempt $i/5)..." "Yellow"
            Copy-Item -Path $sourceDll -Destination $targetDll -Force -ErrorAction Stop
            $copied = $true
            Log "Copy command completed successfully!" "Green"
            break
        } catch {
            Log "Attempt $i failed: $_" "Red"
            Start-Sleep -Seconds 2
        }
    }

    if ($copied) {
        Log "DLL successfully copied!" "Green"
    } else {
        Log "Failed to copy DLL. A process may still have it locked." "Red"
        Log "Press any key to exit..." "Yellow"
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit
    }
} else {
    Log "Source 32-bit DLL not found at: $sourceDll" "Red"
    Log "Please make sure the Mantra MFS500 driver / MorFin SDK is properly installed." "Yellow"
    Read-Host "Press Enter to exit"
    exit
}

# Verify target DLL architecture
Log "Verifying target DLL architecture..." "Yellow"
try {
    $bytes = [System.IO.File]::ReadAllBytes($targetDll)
    $peOffset = [System.BitConverter]::ToUInt32($bytes, 0x3C)
    $machine = [System.BitConverter]::ToUInt16($bytes, $peOffset + 4)
    if ($machine -eq 0x14c) {
        Log "SUCCESS: Target DLL is now correct 32-bit!" "Green"
    } elseif ($machine -eq 0x8664) {
        Log "ERROR: Target DLL is still 64-bit! The copy did not apply." "Red"
    } else {
        Log "Target DLL has unknown machine type: $machine" "Yellow"
    }
} catch {
    Log "Could not verify DLL architecture: $_" "Red"
}

# 6. Start the service
Log "Starting service 'MorFinAuthClientSvc'..." "Yellow"
Start-Service -Name "MorFinAuthClientSvc"

# Verify service status
$svc = Get-Service -Name "MorFinAuthClientSvc" -ErrorAction SilentlyContinue
if ($svc.Status -eq "Running") {
    Log "MorFinAuthClientSvc is now RUNNING!" "Green"
} else {
    Log "Failed to start MorFinAuthClientSvc service. Status: $($svc.Status)" "Red"
}

# Wait 3 seconds for service initialization
Log "Waiting 3 seconds for service initialization..." "Yellow"
Start-Sleep -Seconds 3

# 7. Check device connectivity via local endpoint
Log "Checking local device connectivity (port 8030)..." "Yellow"
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:8030/morfinauth/connecteddevicelist" -Method Post -ContentType "application/json" -TimeoutSec 5
    Log "Endpoint Response: $($res | ConvertTo-Json -Depth 2)" "Cyan"
    if ($res.ErrorCode -eq 0 -or $res.ErrorCode -eq "0") {
        Log "SUCCESS: The fingerprint scanner is connected and responded successfully!" "Green"
        
        # Test initialization
        Log "Testing device initialization..." "Yellow"
        $initRes = Invoke-RestMethod -Uri "http://127.0.0.1:8030/morfinauth/initdevice" -Method Post -ContentType "application/json" -Body '{"ConnectedDvc":"MFS500","ClientKey":""}' -TimeoutSec 5
        Log "Init Response: $($initRes | ConvertTo-Json -Depth 2)" "Cyan"
        if ($initRes.ErrorCode -eq 0 -or $initRes.ErrorCode -eq "0") {
            Log "SUCCESS: Device is initialized and fully ready to scan!" "Green"
        } else {
            Log "Warning: Device failed to initialize: $($initRes.ErrorDescription)" "Yellow"
        }
    } else {
        Log "Warning: Service responded, but returned an error: $($res.ErrorDescription)" "Yellow"
    }
} catch {
    Log "Failed to query local endpoint: $_" "Red"
}

Log "`nBiometric repair completed. Press any key to exit..." "Yellow"
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
