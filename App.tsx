import { useCallback, useEffect, useReducer, useRef } from "react";
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
} from "./utils/automationScripts";
import {
  PreviousAttendanceResult,
  loadPreviousResult,
  savePreviousResult,
} from "./utils/storage";
import {
  shouldCheckOnMount,
  useUpdateManager,
} from "./utils/updateManager";

const COLORS = {
  primary: "#6366F1",
  primaryLight: "#EEF2FF",
  success: "#10B981",
  successDark: "#059669",
  danger: "#EF4444",
  dangerDark: "#DC2626",
  ink: "#0F172A",
  slate: "#64748B",
  slateLight: "#94A3B8",
  white: "#FFFFFF",
  bg: "#F8FAFC",
  border: "#E2E8F0",
  trackBg: "#F1F5F9",
  chipSafeBg: "#ECFDF5",
  chipDangerBg: "#FEF2F2",
  dangerSoftBg: "#FEF2F2",
  dangerSoftBorder: "#FECDD3",
  profileBg: "#334155",
  avatarBg: "#475569",
  profileBorder: "#475569",
  overlay: "rgba(15, 23, 42, 0.6)",
};

const STALL_TIMEOUT_MS = 15000;

interface AppState {
  webViewKey: number;
  isLoggedIn: boolean;
  studentInfo: StudentInfo | null;
  currentIndex: number;
  totalSubjects: number | null;
  fetchedIndices: number[];
  subjectsData: SubjectAttendanceData[];
  isScrapingFinished: boolean;
  selectedSubject: SubjectAttendanceData | null;
  hasPreviousResult: boolean;
  previousResult: PreviousAttendanceResult | null;
  isSelectionError: boolean;
}

const initialState: AppState = {
  webViewKey: 0,
  isLoggedIn: false,
  studentInfo: null,
  currentIndex: 0,
  totalSubjects: null,
  fetchedIndices: [],
  subjectsData: [],
  isScrapingFinished: false,
  selectedSubject: null,
  hasPreviousResult: false,
  previousResult: null,
  isSelectionError: false,
};

type AppAction =
  | { type: "RESET" }
  | { type: "SET_LOGGED_IN" }
  | { type: "SET_STUDENT_INFO"; data: StudentInfo }
  | { type: "SET_SUBJECT_COUNT"; count: number }
  | { type: "ADD_ATTENDANCE_ITEM"; data: SubjectAttendanceData }
  | { type: "SET_SCRAPING_FINISHED" }
  | { type: "SET_SELECTED_SUBJECT"; data: SubjectAttendanceData | null }
  | { type: "SET_PREVIOUS_RESULT"; result: PreviousAttendanceResult | null }
  | { type: "HYDRATE_PREVIOUS_RESULT"; data: PreviousAttendanceResult }
  | { type: "SET_SELECTION_ERROR" }
  | { type: "CLEAR_SELECTION_ERROR" };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "RESET":
      return {
        ...initialState,
        webViewKey: state.webViewKey + 1,
        hasPreviousResult: state.hasPreviousResult,
        previousResult: state.previousResult,
      };
    case "SET_LOGGED_IN":
      return { ...state, isLoggedIn: true };
    case "SET_STUDENT_INFO":
      return { ...state, studentInfo: action.data };
    case "SET_SUBJECT_COUNT":
      return { ...state, totalSubjects: action.count };
    case "ADD_ATTENDANCE_ITEM": {
      if (state.fetchedIndices.includes(state.currentIndex)) {
        return state;
      }
      const nextIndex = state.currentIndex + 1;
      const finished =
        state.totalSubjects !== null && nextIndex >= state.totalSubjects;
      return {
        ...state,
        fetchedIndices: [...state.fetchedIndices, state.currentIndex],
        subjectsData: [...state.subjectsData, action.data],
        currentIndex: finished ? state.currentIndex : nextIndex,
        isScrapingFinished: finished ? true : state.isScrapingFinished,
      };
    }
    case "SET_SCRAPING_FINISHED":
      return { ...state, isScrapingFinished: true };
    case "SET_SELECTION_ERROR":
      return { ...state, isSelectionError: true };
    case "CLEAR_SELECTION_ERROR":
      return {
        ...initialState,
        webViewKey: state.webViewKey,
        hasPreviousResult: state.hasPreviousResult,
        previousResult: state.previousResult,
      };
    case "SET_SELECTED_SUBJECT":
      return { ...state, selectedSubject: action.data };
    case "SET_PREVIOUS_RESULT":
      return {
        ...state,
        previousResult: action.result,
        hasPreviousResult: action.result !== null,
      };
    case "HYDRATE_PREVIOUS_RESULT":
      return {
        ...state,
        isLoggedIn: true,
        isScrapingFinished: true,
        studentInfo: action.data.studentInfo,
        subjectsData: action.data.subjectsData,
        currentIndex: 0,
        totalSubjects: action.data.subjectsData.length,
        fetchedIndices: action.data.subjectsData.map((_, i) => i),
      };
    default:
      return state;
  }
}

type MessagePayload =
  | { type: "STUDENT_INFO"; data: StudentInfo }
  | { type: "SUBJECT_COUNT"; count: number }
  | { type: "ATTENDANCE_ITEM"; data: SubjectAttendanceData }
  | { type: "SCRAPING_COMPLETE" };

export default function Index() {
  const webViewRef = useRef<WebViewType>(null);
  const [state, dispatch] = useReducer(appReducer, initialState);
  const update = useUpdateManager();

  useEffect(() => {
    if (shouldCheckOnMount()) {
      void update.checkForUpdate();
    }
  }, [update]);

  const {
    webViewKey,
    isLoggedIn,
    studentInfo,
    totalSubjects,
    fetchedIndices,
    subjectsData,
    isScrapingFinished,
    selectedSubject,
    hasPreviousResult,
    previousResult,
    isSelectionError,
  } = state;

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const lastActivityRef = useRef<number>(Date.now());
  const persistedSigRef = useRef<string | null>(null);

  const handleFullReset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const handlePreviousAttendance = useCallback(() => {
    if (previousResult) {
      dispatch({ type: "HYDRATE_PREVIOUS_RESULT", data: previousResult });
    }
  }, [previousResult]);

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      const { url, loading } = navState;
      const {
        isLoggedIn: loggedIn,
        isScrapingFinished: scrapingFinished,
        currentIndex,
      } = stateRef.current;

      if (url.includes("studenthome.php")) {
        if (!loggedIn) dispatch({ type: "SET_LOGGED_IN" });
        if (!loading && !scrapingFinished) {
          webViewRef.current?.injectJavaScript(autoSubmitFirstSemesterScript);
        }
      } else if (url.includes("studentsubjects.php")) {
        if (!loading && !scrapingFinished) {
          webViewRef.current?.injectJavaScript(
            selectSubjectByIndexScript(currentIndex)
          );
        }
      } else if (url.includes("studentsubatt.php")) {
        if (!loading && !scrapingFinished) {
          webViewRef.current?.injectJavaScript(
            parseDetailedAttendanceAndGoHomeScript
          );
        }
      }
    },
    []
  );

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as MessagePayload;
      lastActivityRef.current = Date.now();

      switch (payload.type) {
        case "STUDENT_INFO":
          dispatch({ type: "SET_STUDENT_INFO", data: payload.data });
          break;
        case "SUBJECT_COUNT":
          dispatch({ type: "SET_SUBJECT_COUNT", count: payload.count });
          break;
        case "ATTENDANCE_ITEM":
          dispatch({ type: "ADD_ATTENDANCE_ITEM", data: payload.data });
          break;
        case "SCRAPING_COMPLETE":
          dispatch({ type: "SET_SCRAPING_FINISHED" });
          break;
      }
    } catch (err) {
      console.warn("WebView Message Error:", err);
    }
  }, []);

  // Aggregation Math
  const overallClasses = subjectsData.reduce((sum, s) => sum + s.total, 0);
  const overallPresent = subjectsData.reduce((sum, s) => sum + s.present, 0);
  const overallAbsent = subjectsData.reduce((sum, s) => sum + s.absent, 0);
  const overallPercentageVal =
    overallClasses > 0 ? (overallPresent / overallClasses) * 100 : 0;
  const overallPercentage = overallPercentageVal.toFixed(1);
  const isShortage = overallPercentageVal < 75;

  // Maximum skippable classes across all combined subjects
  const maxOverallSkippable = Math.max(
    0,
    Math.floor((4 * overallPresent - 3 * overallClasses) / 3)
  );

  // Dual-constraint class skipping logic
  const calculateCanSkip = (subjectPresent: number, subjectTotal: number): number => {
    const subjectSkippable = Math.max(
      0,
      Math.floor((4 * subjectPresent - 3 * subjectTotal) / 3)
    );
    return Math.min(subjectSkippable, maxOverallSkippable);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await loadPreviousResult();
      if (!cancelled) dispatch({ type: "SET_PREVIOUS_RESULT", result });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !(isScrapingFinished && isLoggedIn && studentInfo && subjectsData.length > 0)
    ) {
      return;
    }
    const sig = `${studentInfo.name}|${subjectsData.length}|${overallClasses}|${overallPresent}`;
    if (persistedSigRef.current === sig) return;
    persistedSigRef.current = sig;
    // Persist only the most recently viewed result; writing overwrites any older stored entry.
    const latestResult: PreviousAttendanceResult = { studentInfo, subjectsData };
    void savePreviousResult(latestResult);
    // Keep in-memory previousResult in sync so the "Previous Attendance" button
    // shows the latest result after navigating back.
    dispatch({ type: "SET_PREVIOUS_RESULT", result: latestResult });
  }, [
    isScrapingFinished,
    isLoggedIn,
    studentInfo,
    subjectsData,
    overallClasses,
    overallPresent,
  ]);

  useEffect(() => {
    if (!isLoggedIn || isScrapingFinished) {
      return;
    }
    lastActivityRef.current = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > STALL_TIMEOUT_MS) {
        dispatch({ type: "SET_SELECTION_ERROR" });
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoggedIn, isScrapingFinished]);

  return (
    <View style={styles.container}>
      {update.status === "checking" || update.status === "applying" ? (
        <View style={styles.updateBanner}>
          <Text style={styles.updateBannerText}>
            {update.status === "applying"
              ? "Applying update…"
              : "Checking for updates…"}
          </Text>
        </View>
      ) : null}

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

        {!isLoggedIn && hasPreviousResult && (
          <TouchableOpacity
            style={styles.prevAttendanceBtn}
            onPress={handlePreviousAttendance}
          >
            <Text style={styles.prevAttendanceBtnText}>Previous Attendance</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sync Loader Overlay */}
      {isLoggedIn && !isScrapingFinished && !isSelectionError && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingTitle}>Syncing Attendance</Text>
            <Text style={styles.loadingSubtext}>
              {totalSubjects
                ? `Processed ${fetchedIndices.length} of ${totalSubjects} subjects`
                : "Authenticating session..."}
            </Text>
            <View style={styles.loaderBadge}>
              <Text style={styles.loaderBadgeText}>
                {totalSubjects
                  ? `${Math.round((fetchedIndices.length / totalSubjects) * 100)}% Complete`
                  : "Connecting..."}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Selection Error Overlay */}
      {isSelectionError && isLoggedIn && !isScrapingFinished && (
        <View style={styles.loadingContainer}>
          <View style={styles.errorCard}>
            <TouchableOpacity
              style={[styles.modalCloseIcon, styles.errorCloseIcon]}
              onPress={() => dispatch({ type: "CLEAR_SELECTION_ERROR" })}
            >
              <Text style={styles.closeIconText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.errorTitle}>Couldn’t load subjects right now</Text>
            <Text style={styles.errorBody}>
              The attendance portal was recently updated, so the app can’t detect
              your semester or subjects at the moment. This is a temporary issue
              — we’re working on a fix.
            </Text>
            <TouchableOpacity
              style={styles.errorTryAgainBtn}
              onPress={handleFullReset}
            >
              <Text style={styles.errorTryAgainText}>Try again</Text>
            </TouchableOpacity>
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
              <Text style={styles.brandSub}>by chanikya</Text>
            </View>
            <TouchableOpacity style={styles.resetBtn} onPress={handleFullReset}>
              <Text style={styles.resetBtnText}>Back</Text>
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
              isShortage ? styles.overallDangerBg : styles.overallSafeBg,
            ]}
          >
            <View style={styles.overallHeaderRow}>
              <Text style={styles.overallCardTitle}>Overall Status</Text>
              <View
                style={[
                  styles.statusChip,
                  isShortage ? styles.chipDanger : styles.chipSafe,
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    isShortage ? styles.chipDangerText : styles.chipSafeText,
                  ]}
                >
                  {isShortage ? "Shortage Warning" : "Good Standing"}
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
                  <Text style={[styles.miniGridNum, { color: COLORS.success }]}>
                    {overallPresent}
                  </Text>
                  <Text style={styles.miniGridLabel}>Attended</Text>
                </View>
                <View style={styles.miniGridBox}>
                  <Text style={[styles.miniGridNum, { color: COLORS.danger }]}>
                    {overallAbsent}
                  </Text>
                  <Text style={styles.miniGridLabel}>Missed</Text>
                </View>
              </View>
            </View>

            {/* Overall Capacity Banner */}
            <View style={styles.skipAllowanceBanner}>
              <Text style={styles.skipAllowanceLabel}>Overall Skip Capacity:</Text>
              <View
                style={[
                  styles.skipPill,
                  maxOverallSkippable > 0 ? styles.skipPillSafe : styles.skipPillMuted,
                ]}
              >
                <Text
                  style={[
                    styles.skipPillText,
                    maxOverallSkippable > 0
                      ? styles.skipPillTextSafe
                      : styles.skipPillTextMuted,
                  ]}
                >
                  can skip : {maxOverallSkippable}
                </Text>
              </View>
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
              const canSkip = calculateCanSkip(item.present, item.total);

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.modernSubjectCard,
                    isLow ? styles.cardLowBg : styles.cardNormalBg,
                  ]}
                  onPress={() => dispatch({ type: "SET_SELECTED_SUBJECT", data: item })}
                >
                  <View style={styles.cardHeaderLine}>
                    <Text style={styles.subjectTitle} numberOfLines={2}>
                      {item.subjectName}
                    </Text>

                    <Text
                      style={[
                        styles.percentageText,
                        isLow ? styles.badgeDangerText : styles.badgeSafeText,
                      ]}
                    >
                      {item.percentage}%
                    </Text>
                  </View>

                  {/* Stat Pills & Can Skip Indicator */}
                  <View style={styles.cardFooterStats}>
                    <View style={styles.statPillsContainer}>
                      <View style={styles.miniStatPill}>
                        <Text style={styles.miniStatPillLabel}>
                          Tot: <Text style={styles.boldDark}>{item.total}</Text>
                        </Text>
                      </View>
                      <View style={styles.miniStatPill}>
                        <Text style={styles.miniStatPillLabel}>
                          Att: <Text style={styles.footerPresentText}>{item.present}</Text>
                        </Text>
                      </View>
                      <View style={styles.miniStatPill}>
                        <Text style={styles.miniStatPillLabel}>
                          Abs: <Text style={styles.footerAbsentText}>{item.absent}</Text>
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.canSkipTag,
                        canSkip > 0 ? styles.canSkipSafe : styles.canSkipMuted,
                      ]}
                    >
                      <Text
                        style={[
                          styles.canSkipText,
                          canSkip > 0 ? styles.canSkipSafeText : styles.canSkipMutedText,
                        ]}
                      >
                        can skip : {canSkip}
                      </Text>
                    </View>
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
        onRequestClose={() => dispatch({ type: "SET_SELECTED_SUBJECT", data: null })}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {selectedSubject && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalSubjectTitle}>
                      {selectedSubject.subjectName}
                    </Text>
                    <Text style={styles.modalSubjectSub}>Attendance Log</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseIcon}
                    onPress={() => dispatch({ type: "SET_SELECTED_SUBJECT", data: null })}
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
                            : item.status === "Absent"
                              ? styles.logBadgeAbsent
                              : styles.logBadgeUnknown,
                        ]}
                      >
                        <Text
                          style={[
                            styles.logBadgeText,
                            item.status === "Present"
                              ? styles.logTextPresent
                              : item.status === "Absent"
                                ? styles.logTextAbsent
                                : styles.logTextUnknown,
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
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 40 },
  updateBanner: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  updateBannerText: { fontSize: 12, fontWeight: "600", color: COLORS.primary },
  hiddenWebView: { width: 0, height: 0, overflow: "hidden" },
  fullWebView: { flex: 1 },

  /* Previous Attendance Overlay Button */
  prevAttendanceBtn: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    alignSelf: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    elevation: 4,
    alignItems: "center",
  },
  prevAttendanceBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 13 },

  /* Loader */
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingCard: {
    width: "100%",
    backgroundColor: COLORS.white,
    padding: 28,
    borderRadius: 20,
    alignItems: "center",
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingTitle: { fontSize: 18, fontWeight: "700", color: COLORS.ink, marginTop: 16 },
  loadingSubtext: { fontSize: 13, color: COLORS.slate, marginTop: 6, marginBottom: 16 },
  loaderBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  loaderBadgeText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },

  /* Selection Error Overlay */
  errorCard: {
    width: "100%",
    backgroundColor: COLORS.white,
    padding: 28,
    borderRadius: 20,
    alignItems: "center",
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.dangerSoftBorder,
    borderLeftWidth: 6,
    borderLeftColor: COLORS.danger,
  },
  errorIcon: { fontSize: 28, color: COLORS.dangerDark, marginBottom: 8, textAlign: "center" },
  errorTitle: { fontSize: 17, fontWeight: "700", color: COLORS.ink, marginTop: 4, textAlign: "center" },
  errorBody: { fontSize: 13, color: COLORS.slate, marginTop: 8, textAlign: "center", lineHeight: 18 },
  errorCloseIcon: { position: "absolute", top: 12, right: 12 },
  errorTryAgainBtn: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    elevation: 4,
    alignItems: "center",
    marginTop: 16,
    width: "100%",
  },
  errorTryAgainText: { color: COLORS.white, fontWeight: "700", fontSize: 13 },

  /* Dashboard */
  dashboardContainer: { flex: 1, paddingHorizontal: 20 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  brandTitle: { fontSize: 20, fontWeight: "800", color: COLORS.ink },
  brandSub: { fontSize: 12, color: COLORS.slate, marginTop: 2, fontWeight: "600" },
  resetBtn: {
    backgroundColor: COLORS.chipDangerBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.dangerSoftBorder,
  },
  resetBtnText: { color: COLORS.dangerDark, fontWeight: "700", fontSize: 12 },

  /* Student Profile Card */
  profileHero: {
    backgroundColor: COLORS.profileBg,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.profileBorder,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.avatarBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: { color: COLORS.white, fontWeight: "800", fontSize: 18 },
  profileTextContainer: { flex: 1 },
  studentNameText: { color: COLORS.white, fontWeight: "700", fontSize: 16 },
  studentMetaText: { color: "#CBD5E1", fontSize: 12, marginTop: 2 },

  /* Overall Summary Card */
  overallCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    elevation: 1,
  },
  overallSafeBg: { backgroundColor: COLORS.white, borderColor: COLORS.border },
  overallDangerBg: { backgroundColor: COLORS.dangerSoftBg, borderColor: COLORS.dangerSoftBorder },
  overallHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overallCardTitle: { fontSize: 13, fontWeight: "600", color: COLORS.slate },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chipSafe: { backgroundColor: COLORS.chipSafeBg },
  chipDanger: { backgroundColor: COLORS.chipDangerBg },
  statusChipText: { fontSize: 11, fontWeight: "700" },
  chipSafeText: { color: COLORS.successDark },
  chipDangerText: { color: COLORS.dangerDark },
  overallMainStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 14,
  },
  overallScoreText: { fontSize: 32, fontWeight: "800", color: COLORS.ink },
  overallMiniGrid: { flexDirection: "row", gap: 14 },
  miniGridBox: { alignItems: "center" },
  miniGridNum: { fontSize: 15, fontWeight: "700", color: COLORS.ink },
  miniGridLabel: { fontSize: 11, color: COLORS.slate, marginTop: 2 },
  skipAllowanceBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  skipAllowanceLabel: { fontSize: 12, fontWeight: "600", color: COLORS.slate },
  skipPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  skipPillSafe: { backgroundColor: COLORS.chipSafeBg },
  skipPillMuted: { backgroundColor: COLORS.trackBg },
  skipPillText: { fontSize: 11, fontWeight: "800" },
  skipPillTextSafe: { color: COLORS.successDark },
  skipPillTextMuted: { color: COLORS.slate },

  /* Subject Card */
  modernSubjectCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 1,
  },
  cardNormalBg: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
  },
  cardLowBg: {
    backgroundColor: COLORS.dangerSoftBg,
    borderColor: COLORS.dangerSoftBorder,
  },
  cardHeaderLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  subjectTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: COLORS.ink, marginRight: 10 },
  percentageText: { fontSize: 18, fontWeight: "800" },
  badgeSafeText: { color: COLORS.successDark },
  badgeDangerText: { color: COLORS.dangerDark },
  cardFooterStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statPillsContainer: { flexDirection: "row", gap: 6 },
  miniStatPill: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  miniStatPillLabel: { fontSize: 11, color: COLORS.slate },
  footerPresentText: { color: COLORS.success, fontWeight: "700" },
  footerAbsentText: { color: COLORS.danger, fontWeight: "700" },
  boldDark: { color: COLORS.ink, fontWeight: "700" },
  canSkipTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  canSkipSafe: { backgroundColor: COLORS.chipSafeBg },
  canSkipMuted: { backgroundColor: COLORS.trackBg },
  canSkipText: { fontSize: 11, fontWeight: "800" },
  canSkipSafeText: { color: COLORS.successDark },
  canSkipMutedText: { color: COLORS.slate },

  /* Modal Sheet */
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.white,
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
    borderBottomColor: COLORS.trackBg,
    paddingBottom: 12,
  },
  modalTitleContainer: { flex: 1, marginRight: 10 },
  modalSubjectTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  modalSubjectSub: { fontSize: 12, color: COLORS.slate, marginTop: 2 },
  modalCloseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.trackBg,
    justifyContent: "center",
    alignItems: "center",
  },
  closeIconText: { fontSize: 14, color: COLORS.slate, fontWeight: "700" },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg,
  },
  logDate: { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  logTime: { fontSize: 12, color: COLORS.slate, marginTop: 2 },
  logBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  logBadgePresent: { backgroundColor: COLORS.chipSafeBg },
  logBadgeAbsent: { backgroundColor: COLORS.chipDangerBg },
  logBadgeUnknown: { backgroundColor: COLORS.trackBg },
  logBadgeText: { fontSize: 12, fontWeight: "700" },
  logTextPresent: { color: COLORS.successDark },
  logTextAbsent: { color: COLORS.dangerDark },
  logTextUnknown: { color: COLORS.slate },
});