import * as FileSystem from "expo-file-system/legacy";
import { StudentInfo, SubjectAttendanceData } from "./automationScripts";

export interface PreviousAttendanceResult {
  studentInfo: StudentInfo;
  subjectsData: SubjectAttendanceData[];
}

const FILE_NAME = "previous_attendance_result.json";

function getStorageUri(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error("FileSystem.documentDirectory is not available");
  }
  return `${FileSystem.documentDirectory}${FILE_NAME}`;
}

function isPreviousAttendanceResult(
  data: unknown
): data is PreviousAttendanceResult {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.studentInfo !== "object" || obj.studentInfo === null) {
    return false;
  }
  const info = obj.studentInfo as Record<string, unknown>;
  if (
    typeof info.name !== "string" ||
    typeof info.admissionNo !== "string" ||
    typeof info.className !== "string"
  ) {
    return false;
  }
  if (!Array.isArray(obj.subjectsData)) return false;
  return obj.subjectsData.every((item): item is SubjectAttendanceData => {
    if (typeof item !== "object" || item === null) return false;
    const rec = item as Record<string, unknown>;
    return (
      typeof rec.subjectName === "string" &&
      typeof rec.present === "number" &&
      typeof rec.absent === "number" &&
      typeof rec.total === "number" &&
      typeof rec.percentage === "string" &&
      Array.isArray(rec.records)
    );
  });
}

export async function savePreviousResult(
  result: PreviousAttendanceResult
): Promise<void> {
  const uri = getStorageUri();
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(result));
}

export async function loadPreviousResult(): Promise<PreviousAttendanceResult | null> {
  try {
    const uri = getStorageUri();
    const raw = await FileSystem.readAsStringAsync(uri);
    const parsed: unknown = JSON.parse(raw);
    if (!isPreviousAttendanceResult(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPreviousResult(): Promise<void> {
  try {
    const uri = getStorageUri();
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}
