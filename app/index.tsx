import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { WebView as WebViewType } from "react-native-webview";
import { WebView, WebViewMessageEvent, WebViewNavigation } from "react-native-webview";
import {
  autoSubmitFirstSemesterScript,
  parseDetailedAttendanceAndGoHomeScript,
  selectSubjectByIndexScript,
  StudentInfo,
  SubjectAttendanceData,
} from "../utils/automationScripts";

export default function Index() {
  const webViewRef = useRef<WebViewType>(null);

  // WebView Instance Key for hard resets
  const [webViewKey, setWebViewKey] = useState<number>(0);

  // Core App States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [totalSubjects, setTotalSubjects] = useState<number | null>(null);
  const [fetchedIndices, setFetchedIndices] = useState<number[]>([]);
  const [subjectsData, setSubjectsData] = useState<SubjectAttendanceData[]>([]);
  const [isScrapingFinished, setIsScrapingFinished] = useState<boolean>(false);

  // Modal State
  const [selectedSubject, setSelectedSubject] = useState<SubjectAttendanceData | null>(null);

  // Reset all state and destroy/re-mount WebView at the root URL
  const handleFullReset = () => {
    setIsLoggedIn(false);
    setStudentInfo(null);
    setCurrentIndex(0);
    setTotalSubjects(null);
    setFetchedIndices([]);
    setSubjectsData([]);
    setIsScrapingFinished(false);
    setSelectedSubject(null);
    setWebViewKey((prev) => prev + 1); // Forces webview to remount from root URL
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const { url, loading } = navState;

    if (url.includes("studenthome.php")) {
      if (!isLoggedIn) setIsLoggedIn(true);
      if (!loading && !isScrapingFinished) {
        webViewRef.current?.injectJavaScript(autoSubmitFirstSemesterScript);
      }
    } else if (url.includes("studentsubjects.php")) {
      if (!loading && !isScrapingFinished) {
        webViewRef.current?.injectJavaScript(selectSubjectByIndexScript(currentIndex));
      }
    } else if (url.includes("studentsubatt.php")) {
      if (!loading && !isScrapingFinished) {
        webViewRef.current?.injectJavaScript(parseDetailedAttendanceAndGoHomeScript);
      }
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);

      if (payload.type === "STUDENT_INFO") {
        setStudentInfo(payload.data);
      } else if (payload.type === "SUBJECT_COUNT") {
        setTotalSubjects(payload.count);
      } else if (payload.type === "ATTENDANCE_ITEM") {
        const newItem: SubjectAttendanceData = payload.data;

        if (!fetchedIndices.includes(currentIndex)) {
          setFetchedIndices((prev) => [...prev, currentIndex]);
          setSubjectsData((prev) => [...prev, newItem]);

          const nextIndex = currentIndex + 1;
          if (totalSubjects !== null && nextIndex >= totalSubjects) {
            setIsScrapingFinished(true);
          } else {
            setCurrentIndex(nextIndex);
          }
        }
      } else if (payload.type === "SCRAPING_COMPLETE") {
        setIsScrapingFinished(true);
      }
    } catch (err) {
      console.log("WebView Message Error:", err);
    }
  };

  // Aggregation Math
  const overallClasses = subjectsData.reduce((sum, s) => sum + s.total, 0);
  const overallPresent = subjectsData.reduce((sum, s) => sum + s.present, 0);
  const overallAbsent = subjectsData.reduce((sum, s) => sum + s.absent, 0);
  const overallPercentageVal =
    overallClasses > 0 ? (overallPresent / overallClasses) * 100 : 0;
  const overallPercentage = overallPercentageVal.toFixed(1);

  return (
    <View style={styles.container}>
      {/* Active WebView Component (Visible during login, hidden during dashboard display) */}
      <View style={!isLoggedIn ? styles.fullWebView : styles.hiddenWebView}>
        <WebView
          key={webViewKey}
          ref={webViewRef}
          source={{ uri: "https://jntuaceastudents.classattendance.in/" }}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          incognito={false}
        />
      </View>

      {/* Sync Loader Overlay */}
      {isLoggedIn && !isScrapingFinished && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingTitle}>Syncing Attendance</Text>
            <Text style={styles.loadingSubtext}>
              {totalSubjects
                ? `Processed ${fetchedIndices.length} of ${totalSubjects} subjects`
                : "Authenticating session..."}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: totalSubjects
                      ? `${(fetchedIndices.length / totalSubjects) * 100}%`
                      : "10%",
                  },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      {/* Final Dashboard View */}
      {isLoggedIn && isScrapingFinished && (
        <View style={styles.dashboardContainer}>
          {/* Header Bar */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.brandTitle}>Attendance Tracker</Text>
              <Text style={styles.brandSub}>Academic Portal Sync</Text>
            </View>
            <TouchableOpacity style={styles.resetBtn} onPress={handleFullReset}>
              <Text style={styles.resetBtnText}>Reset App</Text>
            </TouchableOpacity>
          </View>

          {/* Student Profile Banner */}
          {studentInfo && (
            <View style={styles.profileHero}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {studentInfo.name ? studentInfo.name.charAt(0) : "S"}
                </Text>
              </View>
              <View style={styles.profileTextContainer}>
                <Text style={styles.studentNameText}>{studentInfo.name}</Text>
                <Text style={styles.studentMetaText}>
                  {studentInfo.admissionNo} • {studentInfo.className}
                </Text>
              </View>
            </View>
          )}

          {/* Overall Summary Card */}
          <View
            style={[
              styles.overallCard,
              overallPercentageVal < 75 ? styles.overallDangerBg : styles.overallSafeBg,
            ]}
          >
            <View style={styles.overallHeaderRow}>
              <Text style={styles.overallCardTitle}>Overall Percentage</Text>
              <View
                style={[
                  styles.statusChip,
                  overallPercentageVal < 75 ? styles.chipDanger : styles.chipSafe,
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    overallPercentageVal < 75
                      ? styles.chipDangerText
                      : styles.chipSafeText,
                  ]}
                >
                  {overallPercentageVal < 75 ? "Shortage Warning" : "Good Standing"}
                </Text>
              </View>
            </View>

            <View style={styles.overallMainStatRow}>
              <Text style={styles.overallScoreText}>{overallPercentage}%</Text>
              <View style={styles.overallMiniGrid}>
                <View style={styles.miniGridBox}>
                  <Text style={styles.miniGridNum}>{overallClasses}</Text>
                  <Text style={styles.miniGridLabel}>Total</Text>
                </View>
                <View style={styles.miniGridBox}>
                  <Text style={[styles.miniGridNum, { color: "#10B981" }]}>
                    {overallPresent}
                  </Text>
                  <Text style={styles.miniGridLabel}>Attended</Text>
                </View>
                <View style={styles.miniGridBox}>
                  <Text style={[styles.miniGridNum, { color: "#EF4444" }]}>
                    {overallAbsent}
                  </Text>
                  <Text style={styles.miniGridLabel}>Missed</Text>
                </View>
              </View>
            </View>

            <View style={styles.overallTrack}>
              <View
                style={[
                  styles.overallTrackFill,
                  {
                    width: `${Math.min(overallPercentageVal, 100)}%`,
                    backgroundColor: overallPercentageVal < 75 ? "#EF4444" : "#10B981",
                  },
                ]}
              />
            </View>
          </View>

          {/* Subject Items List */}
          <FlatList
            data={subjectsData}
            keyExtractor={(item, index) => `${item.subjectName}-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const pVal = parseFloat(item.percentage);
              const isLow = pVal < 75;

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.modernSubjectCard}
                  onPress={() => setSelectedSubject(item)}
                >
                  <View style={styles.cardHeaderLine}>
                    <Text style={styles.subjectTitle} numberOfLines={2}>
                      {item.subjectName}
                    </Text>
                    <View
                      style={[
                        styles.percentBadge,
                        isLow ? styles.badgeDangerBg : styles.badgeSafeBg,
                      ]}
                    >
                      <Text
                        style={[
                          styles.percentBadgeText,
                          isLow ? styles.badgeDangerText : styles.badgeSafeText,
                        ]}
                      >
                        {item.percentage}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.subjectTrack}>
                    <View
                      style={[
                        styles.subjectTrackFill,
                        {
                          width: `${Math.min(pVal, 100)}%`,
                          backgroundColor: isLow ? "#EF4444" : "#10B981",
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.cardFooterStats}>
                    <Text style={styles.footerStatText}>
                      Classes: <Text style={styles.boldDark}>{item.total}</Text>
                    </Text>
                    <Text style={styles.footerStatText}>
                      Present: <Text style={{ color: "#10B981", fontWeight: "700" }}>{item.present}</Text>
                    </Text>
                    <Text style={styles.footerStatText}>
                      Absent: <Text style={{ color: "#EF4444", fontWeight: "700" }}>{item.absent}</Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Date Log Modal */}
      <Modal
        visible={!!selectedSubject}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedSubject(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {selectedSubject && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.modalSubjectTitle}>
                      {selectedSubject.subjectName}
                    </Text>
                    <Text style={styles.modalSubjectSub}>Attendance Log</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseIcon}
                    onPress={() => setSelectedSubject(null)}
                  >
                    <Text style={styles.closeIconText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={selectedSubject.records}
                  keyExtractor={(_, index) => index.toString()}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={styles.logRow}>
                      <View>
                        <Text style={styles.logDate}>{item.date}</Text>
                        <Text style={styles.logTime}>{item.time}</Text>
                      </View>
                      <View
                        style={[
                          styles.logBadge,
                          item.status === "Present"
                            ? styles.logBadgePresent
                            : styles.logBadgeAbsent,
                        ]}
                      >
                        <Text
                          style={[
                            styles.logBadgeText,
                            item.status === "Present"
                              ? styles.logTextPresent
                              : styles.logTextAbsent,
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>
                  )}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingTop: 40 },
  hiddenWebView: { width: 0, height: 0, overflow: "hidden" },
  fullWebView: { flex: 1 },

  /* Loader */
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    padding: 28,
    borderRadius: 20,
    alignItems: "center",
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  loadingTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginTop: 16 },
  loadingSubtext: { fontSize: 13, color: "#64748B", marginTop: 6, marginBottom: 20 },
  progressTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: "#6366F1", borderRadius: 3 },

  /* Dashboard */
  dashboardContainer: { flex: 1, paddingHorizontal: 20 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  brandTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  brandSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  resetBtn: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  resetBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 12 },

  /* Student Card */
  profileHero: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: { color: "#FFFFFF", fontWeight: "800", fontSize: 18 },
  profileTextContainer: { flex: 1 },
  studentNameText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  studentMetaText: { color: "#94A3B8", fontSize: 12, marginTop: 2 },

  /* Overall Summary Card */
  overallCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    elevation: 1,
  },
  overallSafeBg: { backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" },
  overallDangerBg: { backgroundColor: "#FFF5F5", borderColor: "#FECDD3" },
  overallHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overallCardTitle: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chipSafe: { backgroundColor: "#ECFDF5" },
  chipDanger: { backgroundColor: "#FEF2F2" },
  statusChipText: { fontSize: 11, fontWeight: "700" },
  chipSafeText: { color: "#059669" },
  chipDangerText: { color: "#DC2626" },
  overallMainStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 14,
  },
  overallScoreText: { fontSize: 32, fontWeight: "800", color: "#0F172A" },
  overallMiniGrid: { flexDirection: "row", gap: 14 },
  miniGridBox: { alignItems: "center" },
  miniGridNum: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  miniGridLabel: { fontSize: 11, color: "#64748B", marginTop: 2 },
  overallTrack: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  overallTrackFill: { height: "100%", borderRadius: 4 },

  /* Subject Card */
  modernSubjectCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
  },
  cardHeaderLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  subjectTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#0F172A", marginRight: 10 },
  percentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeSafeBg: { backgroundColor: "#ECFDF5" },
  badgeDangerBg: { backgroundColor: "#FEF2F2" },
  percentBadgeText: { fontSize: 13, fontWeight: "800" },
  badgeSafeText: { color: "#059669" },
  badgeDangerText: { color: "#DC2626" },
  subjectTrack: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    marginVertical: 12,
    overflow: "hidden",
  },
  subjectTrackFill: { height: "100%", borderRadius: 3 },
  cardFooterStats: { flexDirection: "row", justifyContent: "space-between" },
  footerStatText: { fontSize: 12, color: "#64748B" },
  boldDark: { color: "#0F172A", fontWeight: "700" },

  /* Modal Sheet */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
  },
  modalSubjectTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  modalSubjectSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  modalCloseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  closeIconText: { fontSize: 14, color: "#64748B", fontWeight: "700" },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  logDate: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  logTime: { fontSize: 12, color: "#64748B", marginTop: 2 },
  logBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  logBadgePresent: { backgroundColor: "#ECFDF5" },
  logBadgeAbsent: { backgroundColor: "#FEF2F2" },
  logBadgeText: { fontSize: 12, fontWeight: "700" },
  logTextPresent: { color: "#059669" },
  logTextAbsent: { color: "#DC2626" },
});