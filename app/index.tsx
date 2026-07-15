import React, { useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StatusBar, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { SCRAPER_SCRIPT } from '../lib/scraperScript';
import AttendanceScreen from '../components/AttendanceScreen';

export default function Index() {
  const webViewRef = useRef<WebView>(null);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('🔹 Please log in below');
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [scraped, setScraped] = useState(false);

  const onNavStateChange = (navState: any) => {
    const url = navState.url.toLowerCase();
    console.log('📍 Navigation to:', url);
    if ((url.includes('studenthome') || url.includes('home')) && !scraped) {
      console.log('✅ Student home detected – injecting scraper');
      setScraped(true);
      setStatus('⏳ Scraping attendance…');
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(SCRAPER_SCRIPT);
      }
    }
    if (url.includes('logout')) {
      console.log('🔁 Logout detected – resetting state');
      setScraped(false);
      setAttendanceData(null);
      setStatus('🔹 Please log in below');
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      console.log('📩 Message from WebView:', payload.type);
      if (payload.type === 'debug') {
        console.log('🔍', payload.message);
      } else if (payload.type === 'attendance_complete') {
        console.log('✅ Attendance data received');
        setAttendanceData(payload);
        setStatus(`✅ Attendance loaded (${payload.subjects?.length || 0} subjects)`);
      } else if (payload.type === 'error') {
        Alert.alert('Scraper Error', payload.message);
        setStatus('❌ Error: ' + payload.message);
        setScraped(false);
      }
    } catch (e) {
      console.warn('Message error:', e);
    }
  };

  const handleBack = () => {
    console.log('🔙 Back to login');
    setAttendanceData(null);
    setScraped(false);
    setStatus('🔹 Please log in below');
  };

  const retryScraper = () => {
    if (webViewRef.current) {
      console.log('🔄 Manual retry of scraper');
      setScraped(false);
      setStatus('⏳ Retrying scraper…');
      webViewRef.current.injectJavaScript(SCRAPER_SCRIPT);
    }
  };

  if (attendanceData) {
    return <AttendanceScreen data={attendanceData} onBack={handleBack} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: '#374151' }}>{status}</Text>
        {scraped && !attendanceData && (
          <TouchableOpacity onPress={retryScraper} style={{ backgroundColor: '#7C3AED', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://jntuaceastudents.classattendance.in/' }}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled={false}
        onMessage={handleMessage}
        onNavigationStateChange={onNavStateChange}
        onLoadStart={() => console.log('🔄 WebView load start')}
        onLoadEnd={() => console.log('✅ WebView load end')}
        renderLoading={() => (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={{ marginTop: 8, color: '#6b7280' }}>Loading college portal…</Text>
          </View>
        )}
        onError={(e) => {
          console.error('❌ WebView error:', e.nativeEvent);
          setError(true);
        }}
        style={{ flex: 1, backgroundColor: '#fff' }}
      />
      {error && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 12, maxWidth: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#dc2626', marginBottom: 8 }}>Connection Error</Text>
            <Text style={{ textAlign: 'center', color: '#6b7280' }}>Failed to load the page. Check your internet connection.</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}