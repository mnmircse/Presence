const API_BASE = 'http://localhost:3001/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Request failed' };
    }

    return { data };
  } catch (error) {
    return { error: 'Network error. Is the backend running?' };
  }
}

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (data: RegisterData) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<{ user: User }>('/auth/me'),
};

// Sessions API
export const sessionsApi = {
  getActive: () => request<{ sessions: AttendanceSession[] }>('/sessions/active'),
  
  getForClass: (classId: string) =>
    request<{ sessions: AttendanceSession[] }>(`/sessions/history/${classId}`),

  getDetails: (sessionId: string) =>
    request<{ session: AttendanceSession; records: AttendanceRecord[] }>(`/sessions/${sessionId}`),
  
  create: (data: CreateSessionData) =>
    request<{ message: string; session: AttendanceSession }>('/sessions/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  end: (sessionId: string) =>
    request('/sessions/stop/' + sessionId, { method: 'POST' }),
};

// Attendance API
export const attendanceApi = {
  verifyWifi: (sessionId: string, wifiData: WifiData[]) =>
    request<WifiVerifyResponse>('/attendance/verify-wifi', {
      method: 'POST',
      body: JSON.stringify({ sessionId, wifiData }),
    }),

  verifyFace: (sessionId: string, faceEmbedding: number[]) =>
    request<FaceVerifyResponse>('/attendance/verify-face', {
      method: 'POST',
      body: JSON.stringify({ sessionId, faceEmbedding }),
    }),

  getMyRecords: () =>
    request<{ records: AttendanceRecord[]; stats: AttendanceStats[] }>('/attendance/my-records'),

  getClassAttendance: (classId: string, date?: string) =>
    request<{ records: AttendanceRecord[] }>(
      `/attendance/class/${classId}${date ? `?date=${date}` : ''}`
    ),

  override: (recordId: string, status: string, reason?: string) =>
    request('/attendance/' + recordId + '/override', {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    }),
};

// Classes API
export const classesApi = {
  getMyClasses: () => request<{ classes: Class[] }>('/classes'),
  
  getEnrolledStudents: (classId: string) =>
    request<{ students: User[] }>(`/classes/${classId}/students`),

  getClassDetails: (classId: string) =>
    request<{ class: Class; students: User[]; wifiAPs: any[] }>(`/classes/${classId}`),

  createClass: (data: CreateClassData) =>
    request<{ message: string; classId: string }>('/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  enrollStudent: (classId: string, studentId: string) =>
    request('/classes/' + classId + '/enroll', {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    }),

  removeStudent: (classId: string, studentId: string) =>
    request('/classes/' + classId + '/students/' + studentId, {
      method: 'DELETE',
    }),

  getAllStudents: () =>
    request<{ students: User[] }>('/classes/students/all'),
};

// Types
export interface User {
  id: string;
  username: string;
  role: 'student' | 'teacher' | 'admin';
  fullName: string;
  rollNumber?: string;
  department?: string;
}

export interface RegisterData {
  username: string;
  password: string;
  fullName: string;
  role: 'student' | 'teacher';
  rollNumber?: string;
  email?: string;
  department?: string;
}

export interface Class {
  id: string;
  class_name: string;
  class_code?: string;
  subject: string;
  room_number?: string;
  teacher_id: string;
  teacher_name?: string;
  student_count?: number;
  semester?: number;
  academic_year?: string;
}

export interface CreateClassData {
  className: string;
  classCode: string;
  subject: string;
  roomNumber?: string;
  semester?: number;
  academicYear?: string;
}

export interface AttendanceSession {
  id: string;
  class_id: string;
  class_name?: string;
  subject?: string;
  teacher_id: string;
  session_date: string;
  start_time: string;
  status: 'active' | 'completed' | 'cancelled';
  window_duration_minutes: number;
}

export interface CreateSessionData {
  classId: string;
  windowDurationMinutes?: number;
}

export interface WifiData {
  bssid: string;
  rssi: number;
  ssid?: string;
}

export interface WifiVerifyResponse {
  success: boolean;
  matchedAPs: number;
  requiredAPs: number;
  message: string;
}

export interface FaceVerifyResponse {
  success: boolean;
  confidence: number;
  status: string;
  message: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  student_name?: string;
  roll_number?: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  wifi_verified: boolean;
  face_verified: boolean;
  session_date?: string;
  class_name?: string;
  subject?: string;
}

export interface AttendanceStats {
  id: string;
  class_name: string;
  subject: string;
  total_sessions: number;
  present_count: number;
  percentage: number;
}
