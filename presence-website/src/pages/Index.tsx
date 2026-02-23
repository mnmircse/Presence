import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else if (user?.role === 'student') {
        navigate('/student');
      } else if (user?.role === 'teacher' || user?.role === 'admin') {
        navigate('/teacher');
      }
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <h1 className="mb-2 text-2xl font-bold">Presence</h1>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
