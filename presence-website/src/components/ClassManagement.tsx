import { useState, useEffect } from 'react';
import { classesApi, Class, User } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Users, 
  BookOpen,
  AlertCircle,
  Loader2,
  UserPlus,
  Trash2
} from 'lucide-react';

interface ClassManagementProps {
  onClassCreated?: () => void;
}

export function ClassManagement({ onClassCreated }: ClassManagementProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<User[]>([]);
  
  // Form fields
  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [subject, setSubject] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [semester, setSemester] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setIsLoading(true);
    const { data, error } = await classesApi.getMyClasses();
    
    if (error) {
      setError(error);
    } else if (data?.classes) {
      setClasses(data.classes);
    }
    setIsLoading(false);
  };

  const handleCreateClass = async () => {
    if (!className || !classCode || !subject) {
      setError('Please fill all required fields');
      return;
    }

    setIsCreating(true);
    setError('');

    const { data, error } = await classesApi.createClass({
      className,
      classCode,
      subject,
      roomNumber: roomNumber || undefined,
      semester: semester ? parseInt(semester) : undefined,
    });

    if (error) {
      setError(error);
    } else {
      setShowCreateDialog(false);
      resetForm();
      loadClasses();
      onClassCreated?.();
    }
    setIsCreating(false);
  };

  const resetForm = () => {
    setClassName('');
    setClassCode('');
    setSubject('');
    setRoomNumber('');
    setSemester('');
  };

  const openEnrollDialog = async (cls: Class) => {
    setSelectedClass(cls);
    setShowEnrollDialog(true);
    
    // Load all students and enrolled students
    const [allRes, enrolledRes] = await Promise.all([
      classesApi.getAllStudents(),
      classesApi.getClassDetails(cls.id),
    ]);

    if (allRes.data?.students) {
      setAllStudents(allRes.data.students);
    }
    if (enrolledRes.data?.students) {
      setEnrolledStudents(enrolledRes.data.students);
    }
  };

  const handleEnrollStudent = async (studentId: string) => {
    if (!selectedClass) return;
    
    setIsEnrolling(true);
    const { error } = await classesApi.enrollStudent(selectedClass.id, studentId);
    
    if (error) {
      setError(error);
    } else {
      // Refresh enrolled list
      const res = await classesApi.getClassDetails(selectedClass.id);
      if (res.data?.students) {
        setEnrolledStudents(res.data.students);
      }
    }
    setIsEnrolling(false);
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClass) return;
    
    const { error } = await classesApi.removeStudent(selectedClass.id, studentId);
    
    if (error) {
      setError(error);
    } else {
      const res = await classesApi.getClassDetails(selectedClass.id);
      if (res.data?.students) {
        setEnrolledStudents(res.data.students);
      }
    }
  };

  const isEnrolled = (studentId: string) => {
    return enrolledStudents.some(s => s.id === studentId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Classes</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Class
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No classes created yet</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setShowCreateDialog(true)}
            >
              Create your first class
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.map((cls) => (
            <Card key={cls.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{cls.class_name}</CardTitle>
                    <CardDescription>{cls.subject}</CardDescription>
                  </div>
                  <Badge variant="outline">{cls.class_code || 'N/A'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{cls.student_count || 0} students</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEnrollDialog(cls)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Manage Students
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Class Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>
              Add a new class to your teaching schedule
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="className">Class Name *</Label>
              <Input
                id="className"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g., Computer Science 101"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classCode">Class Code *</Label>
                <Input
                  id="classCode"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  placeholder="e.g., CS101"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Input
                  id="semester"
                  type="number"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="e.g., 3"
                  min="1"
                  max="12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Introduction to Programming"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roomNumber">Room Number</Label>
              <Input
                id="roomNumber"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g., Room 204"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateClass} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Class'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll Students Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Students - {selectedClass?.class_name}</DialogTitle>
            <DialogDescription>
              Add or remove students from this class
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Enrolled Students */}
            <div>
              <h4 className="font-medium mb-2">Enrolled Students ({enrolledStudents.length})</h4>
              {enrolledStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students enrolled yet</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {enrolledStudents.map((student) => (
                    <div 
                      key={student.id} 
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <div>
                        <p className="font-medium text-sm">{student.fullName}</p>
                        <p className="text-xs text-muted-foreground">{student.rollNumber}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStudent(student.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Students */}
            <div>
              <h4 className="font-medium mb-2">Available Students</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {allStudents.filter(s => !isEnrolled(s.id)).map((student) => (
                  <div 
                    key={student.id} 
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div>
                      <p className="font-medium text-sm">{student.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.rollNumber} {student.department && `• ${student.department}`}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isEnrolling}
                      onClick={() => handleEnrollStudent(student.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
                {allStudents.filter(s => !isEnrolled(s.id)).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    All registered students are already enrolled
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrollDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
