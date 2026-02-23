import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  classesApi, 
  sessionsApi, 
  attendanceApi, 
  Class, 
  AttendanceSession, 
  AttendanceRecord,
  User 
} from '@/lib/api';
import { ClassManagement } from '@/components/ClassManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  LogOut, 
  Plus, 
  Users, 
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  StopCircle,
  Wifi,
  ScanFace,
  BookOpen
} from 'lucide-react';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [windowDuration, setWindowDuration] = useState('10');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [overrideStatus, setOverrideStatus] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadClassData(selectedClass.id);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    setIsLoading(true);
    const { data, error } = await classesApi.getMyClasses();
    
    if (error) {
      setError(error);
    } else if (data?.classes) {
      setClasses(data.classes);
      if (data.classes.length > 0) {
        setSelectedClass(data.classes[0]);
      }
    }
    setIsLoading(false);
  };

  const loadClassData = async (classId: string) => {
    const [sessionsRes, attendanceRes] = await Promise.all([
      sessionsApi.getForClass(classId),
      attendanceApi.getClassAttendance(classId),
    ]);

    if (sessionsRes.data) {
      setSessions(sessionsRes.data.sessions || []);
    }
    if (attendanceRes.data) {
      setAttendanceRecords(attendanceRes.data.records || []);
    }
  };

  const handleCreateSession = async () => {
    if (!selectedClass) return;
    
    setIsCreatingSession(true);
    const { data, error } = await sessionsApi.create({
      classId: selectedClass.id,
      windowDurationMinutes: parseInt(windowDuration),
    });

    if (error) {
      setError(error);
    } else {
      setShowCreateSession(false);
      loadClassData(selectedClass.id);
    }
    setIsCreatingSession(false);
  };

  const handleEndSession = async (sessionId: string) => {
    const { error } = await sessionsApi.end(sessionId);
    if (error) {
      setError(error);
    } else if (selectedClass) {
      loadClassData(selectedClass.id);
    }
  };

  const handleOverride = async () => {
    if (!selectedRecord || !overrideStatus) return;

    const { error } = await attendanceApi.override(
      selectedRecord.id,
      overrideStatus,
      overrideReason
    );

    if (error) {
      setError(error);
    } else {
      setShowOverrideDialog(false);
      setSelectedRecord(null);
      setOverrideStatus('');
      setOverrideReason('');
      if (selectedClass) {
        loadClassData(selectedClass.id);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-500">Late</Badge>;
      case 'excused':
        return <Badge variant="secondary">Excused</Badge>;
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const pastSessions = sessions.filter(s => s.status !== 'active');

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold">Teacher Dashboard</h1>
            <p className="text-sm text-muted-foreground">{user?.fullName}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Class Selector */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Label>Select Class:</Label>
              <Select
                value={selectedClass?.id || ''}
                onValueChange={(value) => {
                  const cls = classes.find(c => c.id === value);
                  setSelectedClass(cls || null);
                }}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.class_name} - {cls.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedClass && loadClassData(selectedClass.id)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {selectedClass && (
          <Tabs defaultValue="classes" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="classes">
                <BookOpen className="mr-2 h-4 w-4" />
                Classes
              </TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </TabsList>

            <TabsContent value="classes">
              <ClassManagement onClassCreated={loadClasses} />
            </TabsContent>

            <TabsContent value="sessions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Attendance Sessions</h2>
                <Button onClick={() => setShowCreateSession(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Start New Session
                </Button>
              </div>

              {/* Active Sessions */}
              {activeSessions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-green-600">Active Sessions</h3>
                  {activeSessions.map((session) => (
                    <Card key={session.id} className="border-green-200 bg-green-50 dark:bg-green-950/20">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {getStatusBadge(session.status)}
                            <div>
                              <p className="font-medium">
                                {new Date(session.session_date).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Window: {session.window_duration_minutes} minutes
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleEndSession(session.id)}
                          >
                            <StopCircle className="mr-2 h-4 w-4" />
                            End Session
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Past Sessions */}
              <div className="space-y-2">
                <h3 className="font-medium">Past Sessions</h3>
                {pastSessions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No past sessions</p>
                    </CardContent>
                  </Card>
                ) : (
                  pastSessions.map((session) => (
                    <Card key={session.id}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {getStatusBadge(session.status)}
                            <div>
                              <p className="font-medium">
                                {new Date(session.session_date).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Started: {new Date(session.start_time).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-4">
              <h2 className="text-lg font-semibold">Attendance Records</h2>
              
              {attendanceRecords.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No attendance records yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {attendanceRecords.map((record) => (
                    <Card key={record.id}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-medium">{record.student_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {record.roll_number} • {record.session_date}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {record.wifi_verified && (
                              <Wifi className="h-4 w-4 text-green-500" aria-label="WiFi Verified" />
                            )}
                            {record.face_verified && (
                              <ScanFace className="h-4 w-4 text-green-500" aria-label="Face Verified" />
                            )}
                            {getStatusBadge(record.status)}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRecord(record);
                                setOverrideStatus(record.status);
                                setShowOverrideDialog(true);
                              }}
                            >
                              Override
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {classes.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No classes assigned yet</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Create Session Dialog */}
      <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Attendance Session</DialogTitle>
            <DialogDescription>
              Start a new attendance session for {selectedClass?.class_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Attendance Window (minutes)</Label>
              <Input
                type="number"
                value={windowDuration}
                onChange={(e) => setWindowDuration(e.target.value)}
                min="1"
                max="60"
              />
              <p className="text-sm text-muted-foreground">
                Students can mark attendance within this time window
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSession(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSession} disabled={isCreatingSession}>
              {isCreatingSession ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                'Start Session'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Attendance</DialogTitle>
            <DialogDescription>
              Update attendance status for {selectedRecord?.student_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={overrideStatus} onValueChange={setOverrideStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="excused">Excused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for override..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleOverride}>
              Save Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
