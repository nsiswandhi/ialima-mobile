// Shared "Report" action — an Alert-based reason picker, mirroring the
// confirmBlock() pattern in chat/ChatThreadScreen.tsx. Kept as a plain
// function (not a component) so any screen can wire a Report button to it
// with one call, no bottom-sheet UI needed for v1.
import { Alert } from 'react-native';
import { reportApi, ReportContentType, ReportReason } from './api';

const REASON_LABELS: [ReportReason, string][] = [
  ['spam', 'Spam'],
  ['harassment', 'Pelecehan'],
  ['inappropriate', 'Konten tidak pantas'],
  ['other', 'Lainnya'],
];

export function promptReport(token: string, contentType: ReportContentType, contentId: number) {
  Alert.alert(
    'Laporkan konten ini?',
    'Pilih alasan pelaporan.',
    [
      ...REASON_LABELS.map(([reason, label]) => ({
        text: label,
        onPress: () => submit(token, contentType, contentId, reason),
      })),
      { text: 'Batal', style: 'cancel' as const },
    ],
  );
}

async function submit(token: string, contentType: ReportContentType, contentId: number, reason: ReportReason) {
  try {
    await reportApi.submit(token, contentType, contentId, reason);
    Alert.alert('Terima kasih', 'Laporan Anda telah dikirim ke Pengurus IA Lima.');
  } catch (e: any) {
    Alert.alert('Gagal mengirim laporan', e.message || 'Silakan coba lagi.');
  }
}
