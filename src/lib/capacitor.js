// Helper utilitas untuk integrasi Capacitor Android (Kamera & Geolocation)
// dengan fallback otomatis ke Web Browser API

let Camera = null;
let CameraResultType = null;
let CameraSource = null;
let Geolocation = null;
let Capacitor = null;

// Dynamic import safely for SSR/Next.js
async function loadCapacitorPlugins() {
  if (typeof window === 'undefined') return;
  try {
    const capCore = await import('@capacitor/core');
    Capacitor = capCore.Capacitor;

    const capCamera = await import('@capacitor/camera');
    Camera = capCamera.Camera;
    CameraResultType = capCamera.CameraResultType;
    CameraSource = capCamera.CameraSource;

    const capGeo = await import('@capacitor/geolocation');
    Geolocation = capGeo.Geolocation;
  } catch (err) {
    console.warn('Capacitor plugins not available, using Web API fallback:', err);
  }
}

/**
 * Cek apakah aplikasi berjalan di perangkat native (Android/iOS) via Capacitor
 */
export function isNativePlatform() {
  if (typeof window === 'undefined') return false;
  try {
    return Capacitor ? Capacitor.isNativePlatform() : false;
  } catch {
    return false;
  }
}

/**
 * Ambil foto bukti drop kerupuk menggunakan Kamera HP atau Galeri
 * Menggunakan @capacitor/camera jika native, fallback ke input kamera web
 */
export async function captureDropPhoto() {
  await loadCapacitorPlugins();

  // 1. Coba gunakan Capacitor Camera Plugin jika tersedia
  if (Camera && CameraResultType && CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 75,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        promptLabelHeader: 'Foto Bukti Drop Kerupuk',
        promptLabelPhoto: 'Pilih dari Galeri',
        promptLabelPicture: 'Ambil Foto dari Kamera'
      });
      return { success: true, dataUrl: image.dataUrl, format: image.format };
    } catch (err) {
      // Jika user menekan cancel
      if (err.message && (err.message.includes('User cancelled') || err.message.includes('cancelled'))) {
        return { success: false, cancelled: true };
      }
      console.warn('Capacitor Camera gagal, fallback ke input file:', err.message);
    }
  }

  // 2. Fallback untuk Browser Web / Mobile
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Buka kamera belakang langsung jika di mobile browser

    input.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        resolve({ success: false, cancelled: true });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ success: true, dataUrl: reader.result, format: file.type });
      };
      reader.onerror = (err) => {
        resolve({ success: false, error: err.message });
      };
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

/**
 * Dapatkan koordinat lokasi GPS saat drop kerupuk di warung
 * Menggunakan @capacitor/geolocation dengan fallback ke navigator.geolocation
 */
export async function getDropLocation() {
  await loadCapacitorPlugins();

  // 1. Coba gunakan Capacitor Geolocation jika native
  if (Geolocation) {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000
      });
      return {
        success: true,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp || Date.now()
      };
    } catch (err) {
      console.warn('Capacitor Geolocation error, fallback ke web:', err.message);
    }
  }

  // 2. Fallback Web Geolocation API
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            success: true,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp || Date.now()
          });
        },
        (err) => {
          resolve({
            success: false,
            error: err.message || 'Gagal membaca koordinat GPS perangkat'
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
    });
  }

  return { success: false, error: 'Fitur Geolocation tidak didukung di perangkat ini' };
}
