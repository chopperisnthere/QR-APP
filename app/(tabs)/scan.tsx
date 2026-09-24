import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { registerAttendance } from '@/lib/attendance';
import { parseQRPayload } from '@/lib/qr';

export default function ScanScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isUrl, setIsUrl] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Camera Permission Needed</Text>
        <Text style={styles.subtitle}>
          We need access to your camera to scan QR codes.
        </Text>
        <AppButton
          theme="primary"
          title="Grant Permission"
          icon="camera"
          onPress={requestPermission}
        />
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    setLastData(data);
    setIsUrl(isHttpUrl(data));

    const parsed = parseQRPayload(data);
    if (!parsed.ok) {
      setMessage('General QR code detected. No attendance was recorded.');
      setSuccess(false);
      return;
    }

    const studentId = user?.id;
    if (!studentId) {
      setMessage('You must be signed in to record attendance.');
      setSuccess(false);
      return;
    }

    registerAttendance(data, studentId).then((result) => {
      setMessage(result.message);
      setSuccess(result.success);
    }).catch(() => {
      setMessage('Could not process this attendance QR code.');
      setSuccess(false);
    });
  };

  const resetScanner = () => {
    setScanned(false);
    setLastData(null);
    setMessage(null);
    setSuccess(false);
    setIsUrl(false);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View style={styles.overlay}>
        <Text style={styles.overlayText}>
          {scanned ? 'QR Code detected!' : 'Point your camera at a QR code'}
        </Text>

        {scanned && message && (
          <Text
            style={[styles.scanResult, success ? styles.success : styles.error]}
          >
            {message}
          </Text>
        )}

        {scanned && lastData && (
          <Text style={styles.scanData}>{lastData}</Text>
        )}

        {scanned && isUrl && (
          <AppButton
            theme="primary"
            title="Open Link"
            icon="open-outline"
            onPress={() => Linking.openURL(lastData!).catch(() => {
              setMessage('Could not open this link.');
              setSuccess(false);
            })}
          />
        )}

        {scanned && (
          <AppButton
            theme="primary"
            title="Scan Again"
            icon="refresh"
            onPress={resetScanner}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  overlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 60,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  overlayText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  scanResult: { fontSize: 14, textAlign: 'center', marginBottom: 8, fontWeight: '600' },
  success: { color: COLORS.success },
  error: { color: COLORS.danger },
  scanData: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 12 },
});

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
