// Lightweight rich text editor for WYSIWYG CPT fields (community's
// tentang_kami/syarat_bergabung/cara_bergabung, events' tentang_event). A
// WebView hosting a contentEditable div (no exotic native dependency — plain
// HTML/JS + execCommand, same "build it ourselves" convention as TimeInput),
// with a toolbar above it, producing/accepting the same HTML the backend's
// wp_kses_post()/html_to_blocks() pipeline already expects.
//
// Uncontrolled by design: `defaultValue` seeds the editor once at mount (form
// screens already gate rendering behind a loading spinner until fetched data
// is ready, so this is never stale) and `onChangeHtml` reports edits — there
// is no `value` prop, so typing never fights a re-render/cursor reset.
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts } from './theme';

type Props = {
  defaultValue?: string;
  onChangeHtml: (html: string) => void;
  onUploadImage?: (localUri: string) => Promise<string>;
  placeholder?: string;
  minHeight?: number;
};

function buildHtml(initial: string, placeholder: string) {
  // encodeURIComponent output has no quotes/angle-brackets, so it's safe to
  // splice directly into both the JS string literal and the HTML document.
  const encoded = encodeURIComponent(initial || '');
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; padding: 0; background: transparent; }
  body { font-family: -apple-system, Roboto, sans-serif; font-size: 15px; color: #2E3D36; line-height: 1.5; }
  #editor { padding: 12px 14px; min-height: 100%; outline: none; }
  #editor h1 { font-size: 22px; margin: 0 0 10px; }
  #editor h2 { font-size: 18px; margin: 14px 0 8px; }
  #editor p { margin: 0 0 10px; }
  #editor ul, #editor ol { margin: 0 0 10px; padding-left: 22px; }
  #editor img { max-width: 100%; border-radius: 8px; display: block; margin: 6px 0; }
  #editor:empty:before { content: attr(data-placeholder); color: #8A8F8A; }
</style>
</head><body>
<div id="editor" contenteditable="true" data-placeholder="${placeholder.replace(/"/g, '&quot;')}"></div>
<script>
  var editor = document.getElementById('editor');
  editor.innerHTML = decodeURIComponent("${encoded}");

  function postChange() {
    window.ReactNativeWebView.postMessage(editor.innerHTML);
  }
  editor.addEventListener('input', postChange);

  window.rteExec = function (cmd, val) {
    editor.focus();
    document.execCommand(cmd, false, val || null);
    postChange();
  };
  window.rteFormatBlock = function (tag) {
    editor.focus();
    document.execCommand('formatBlock', false, tag);
    postChange();
  };
  window.rteInsertImage = function (url) {
    editor.focus();
    document.execCommand('insertHTML', false, '<p><img src="' + url + '"></p><p><br></p>');
    postChange();
  };
  true;
</script>
</body></html>`;
}

export default function RichTextEditor({ defaultValue, onChangeHtml, onUploadImage, placeholder, minHeight = 220 }: Props) {
  const webRef = useRef<WebView>(null);
  const [uploading, setUploading] = useState(false);
  const html = useState(() => buildHtml(defaultValue || '', placeholder || 'Tulis di sini…'))[0];

  const run = (js: string) => webRef.current?.injectJavaScript(js);

  const onMessage = (e: WebViewMessageEvent) => {
    onChangeHtml(e.nativeEvent.data);
  };

  const insertImage = async () => {
    if (!onUploadImage) return;
    setUploading(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Izin akses galeri ditolak.');
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (res.canceled || !res.assets?.length) return;
      const url = await onUploadImage(res.assets[0].uri);
      run(`window.rteInsertImage(${JSON.stringify(url)});true;`);
    } catch (e: any) {
      Alert.alert('Upload gagal', e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <ToolBtn label="B" bold onPress={() => run('window.rteExec("bold");true;')} />
        <ToolBtn label="I" italic onPress={() => run('window.rteExec("italic");true;')} />
        <ToolBtn label="U" underline onPress={() => run('window.rteExec("underline");true;')} />
        <Sep />
        <ToolBtn label="H1" onPress={() => run('window.rteFormatBlock("H1");true;')} />
        <ToolBtn label="H2" onPress={() => run('window.rteFormatBlock("H2");true;')} />
        <ToolBtn label="P" onPress={() => run('window.rteFormatBlock("P");true;')} />
        <Sep />
        <ToolBtn label="•" onPress={() => run('window.rteExec("insertUnorderedList");true;')} />
        <ToolBtn label="1." onPress={() => run('window.rteExec("insertOrderedList");true;')} />
        {!!onUploadImage && (
          <>
            <Sep />
            <Pressable style={styles.toolBtn} onPress={insertImage} disabled={uploading}>
              {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.toolText}>🖼</Text>}
            </Pressable>
          </>
        )}
      </View>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onMessage}
        style={[styles.web, { minHeight }]}
        scrollEnabled
        bounces={false}
        overScrollMode="never"
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={false}
      />
    </View>
  );
}

function ToolBtn({ label, onPress, bold, italic, underline }: {
  label: string; onPress: () => void; bold?: boolean; italic?: boolean; underline?: boolean;
}) {
  return (
    <Pressable style={styles.toolBtn} onPress={onPress}>
      <Text style={[styles.toolText, bold && styles.tBold, italic && styles.tItalic, underline && styles.tUnderline]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Sep() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.card },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2,
    paddingHorizontal: 6, paddingVertical: 6, backgroundColor: colors.bgAlt, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  toolBtn: { minWidth: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 6, paddingHorizontal: 4 },
  toolText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.heading },
  tBold: { fontFamily: fonts.headingSemi },
  tItalic: { fontStyle: 'italic' },
  tUnderline: { textDecorationLine: 'underline' },
  sep: { width: 1, height: 18, backgroundColor: colors.border, marginHorizontal: 4 },
  web: { backgroundColor: colors.card },
});
