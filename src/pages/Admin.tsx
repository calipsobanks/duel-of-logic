import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Shield, Mail, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  religion: string | null;
  political_view: string | null;
  university_degree: string | null;
}

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [sendingReset, setSendingReset] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (error || !data) {
        setIsAdmin(false);
        navigate('/discussions');
        toast.error('Access denied. Admin privileges required.');
      } else {
        setIsAdmin(true);
      }
      setChecking(false);
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!isAdmin) return;

      setLoadingProfiles(true);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('username');

      if (profilesError) {
        toast.error('Failed to load users');
        setLoadingProfiles(false);
        return;
      }

      setProfiles(profilesData || []);
      setLoadingProfiles(false);
    };

    if (isAdmin) {
      fetchProfiles();
    }
  }, [isAdmin]);

  const handleSendPasswordReset = async (userId: string, username: string) => {
    const newPassword = prompt(`Enter new password for ${username} (min 6 characters):`);
    
    if (!newPassword || !newPassword.trim()) {
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSendingReset(userId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId, newPassword: newPassword.trim() },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) {
        toast.error(`Failed to reset password: ${error.message}`);
      } else {
        toast.success(`Password updated for ${username}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }

    setSendingReset(null);
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage users and system settings</p>
            </div>
          </div>
          <Button onClick={() => navigate('/discussions')} variant="outline">
            Back to Discussions
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              View all users and directly set their passwords
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProfiles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Religion</TableHead>
                    <TableHead>Political View</TableHead>
                    <TableHead>University</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.username}</TableCell>
                      <TableCell>{profile.religion || 'Not set'}</TableCell>
                      <TableCell>{profile.political_view || 'Not set'}</TableCell>
                      <TableCell>{profile.university_degree || 'Not set'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendPasswordReset(profile.id, profile.username)}
                          disabled={sendingReset === profile.id}
                        >
                          {sendingReset === profile.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Mail className="h-4 w-4 mr-2" />
                              Set Password
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
