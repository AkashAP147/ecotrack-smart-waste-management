// Mobile utility functions for camera and location access

export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isSecureContext = (): boolean => {
  return window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
};

export const checkCameraSupport = async (): Promise<{ supported: boolean; reason?: string }> => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { supported: false, reason: 'Camera API not supported in this browser' };
  }

  if (isMobileDevice() && !isSecureContext()) {
    return { 
      supported: false, 
      reason: 'Camera requires HTTPS on mobile devices. Please use a secure connection or localhost.' 
    };
  }

  try {
    // Check if we can enumerate devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    if (videoDevices.length === 0) {
      return { supported: false, reason: 'No camera devices found' };
    }

    return { supported: true };
  } catch (error) {
    return { supported: false, reason: 'Unable to access camera devices' };
  }
};

export const checkLocationSupport = (): { supported: boolean; reason?: string } => {
  if (!navigator.geolocation) {
    return { supported: false, reason: 'Geolocation API not supported in this browser' };
  }

  if (isMobileDevice() && !isSecureContext()) {
    return { 
      supported: false, 
      reason: 'Location requires HTTPS on mobile devices. Please use a secure connection or localhost.' 
    };
  }

  return { supported: true };
};

export const getMobileInstructions = (): string => {
  const userAgent = navigator.userAgent;
  
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return `
iOS Instructions:
1. Use Safari browser (not Chrome)
2. Go to Settings → Safari → Privacy & Security
3. Turn OFF "Prevent Cross-Site Tracking"
4. Turn OFF "Block All Cookies"
5. Refresh the page and try again
    `;
  } else if (/Android/i.test(userAgent)) {
    return `
Android Instructions:
1. Use Chrome browser
2. Go to Chrome Settings → Site Settings
3. Allow Camera and Location for this site
4. Or try: chrome://flags/#unsafely-treat-insecure-origin-as-secure
5. Add this site's URL and restart Chrome
    `;
  }
  
  return 'Please ensure you have granted camera and location permissions to your browser.';
};

export const createFileInput = (): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment'; // Use back camera on mobile
  input.style.display = 'none';
  return input;
};

export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return permission.state === 'granted';
    }
    return false;
  } catch {
    return false;
  }
};

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state === 'granted';
    }
    return false;
  } catch {
    return false;
  }
};
