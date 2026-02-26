// Test the audio-helper.ps1 script approach
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

const helperPath = path.join(
  __dirname,
  'apps',
  'server',
  'data',
  'audio-helper.ps1',
)

// Delete old helper to force recreation
if (fs.existsSync(helperPath)) {
  fs.unlinkSync(helperPath)
  console.log('Deleted old helper')
}

const script = `param([string]$Action, [float]$Level = 0)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int RegisterAudioEndpointVolumeCallback(IntPtr p);
    int UnregisterAudioEndpointVolumeCallback(IntPtr p);
    int GetChannelCount(out int c);
    int SetMasterVolumeLevel(float l, Guid g);
    int SetMasterVolumeLevelScalar(float l, Guid g);
    int GetMasterVolumeLevel(out float l);
    int GetMasterVolumeLevelScalar(out float l);
    int SetChannelVolumeLevel(int n, float l, Guid g);
    int SetChannelVolumeLevelScalar(int n, float l, Guid g);
    int GetChannelVolumeLevel(int n, out float l);
    int GetChannelVolumeLevelScalar(int n, out float l);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool m, Guid g);
    int GetMute(out bool m);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams,
                 [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IntPtr ppDevices);
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject { }

public class Audio {
    static IAudioEndpointVolume GetVol() {
        var e = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
        IMMDevice d; e.GetDefaultAudioEndpoint(0, 1, out d);
        var iid = typeof(IAudioEndpointVolume).GUID;
        object o; d.Activate(ref iid, 1, IntPtr.Zero, out o);
        return (IAudioEndpointVolume)o;
    }
    public static float GetVolume() { var v = GetVol(); float l; v.GetMasterVolumeLevelScalar(out l); return l; }
    public static bool GetMute() { var v = GetVol(); bool m; v.GetMute(out m); return m; }
    public static void SetVolume(float l) { GetVol().SetMasterVolumeLevelScalar(l, Guid.Empty); }
    public static void SetMute(bool m) { GetVol().SetMute(m, Guid.Empty); }
    public static bool ToggleMute() { var v = GetVol(); bool m; v.GetMute(out m); v.SetMute(!m, Guid.Empty); return !m; }
}
"@

switch ($Action) {
    'get' {
        $vol = [Math]::Round([Audio]::GetVolume() * 100)
        $muted = [Audio]::GetMute()
        Write-Output "$vol|$muted"
    }
    'set' {
        [Audio]::SetVolume($Level / 100)
    }
    'mute' {
        $muted = [Audio]::ToggleMute()
        Write-Output $muted
    }
}
`

fs.writeFileSync(helperPath, script, 'utf-8')
console.log('Wrote helper to:', helperPath)

// Test GET
console.log('\n--- Testing GET volume ---')
exec(
  `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${helperPath}" -Action get`,
  { timeout: 15000 },
  (err, stdout, stderr) => {
    if (err) {
      console.log('ERROR:', err.message)
      console.log('STDERR:', stderr)
    } else {
      console.log('STDOUT:', JSON.stringify(stdout.trim()))
      const parts = stdout.trim().split('|')
      console.log('Volume:', parseInt(parts[0]) || 0)
      console.log('Muted:', parts[1]?.toLowerCase() === 'true')
    }
  },
)
