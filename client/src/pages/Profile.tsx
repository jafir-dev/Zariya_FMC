import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Bell, 
  Shield, 
  Building, 
  Save,
  Upload,
  Camera
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { useLocation } from 'wouter';

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    avatar: '',
  });

  // Shield settings state
  const [securityData, setShieldData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
  });

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: {
      requestUpdates: true,
      weeklyReport: false,
      marketing: false,
    },
    sms: {
      urgent: true,
      requestUpdates: false,
    },
    push: {
      requestUpdates: true,
      assignments: true,
      reminders: true,
    },
    whatsapp: {
      urgent: false,
      requestUpdates: false,
    },
  });

  // Multi-premise data (mock for now)
  const [premises] = useState([
    {
      id: '1',
      name: 'Apartment 4B, Skyline Towers',
      code: 'SKY001',
      status: 'active',
      contractExpiry: '2024-12-31',
    },
    {
      id: '2', 
      name: 'Office Suite 201, Business Park',
      code: 'BP002',
      status: 'active',
      contractExpiry: '2025-06-30',
    },
  ]);

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'tenant': 'Tenant',
      'building_owner': 'Building Owner',
      'fmc_head': 'FMC Head',
      'fmc_supervisor': 'FMC Supervisor',
      'fmc_technician': 'FMC Technician',
      'fmc_procurement': 'FMC Procurement',
      'third_party_support': 'Third-Party Support',
    };
    return roleMap[role] || role;
  };

  const handleProfileSave = async () => {
    try {
      // TODO: Implement API call to update profile
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePasswordChange = async () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New password and confirmation do not match.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // TODO: Implement password change API call
      toast({
        title: 'Password Changed',
        description: 'Your password has been successfully changed.',
      });
      setShieldData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        twoFactorEnabled: securityData.twoFactorEnabled,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change password. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleNotificationSave = async () => {
    try {
      // TODO: Implement API call to update notification preferences
      toast({
        title: 'Preferences Saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update preferences. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>
          <Button variant="outline" onClick={() => setLocation('/')}>
            Back to Dashboard
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Shield</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="premises">Properties</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information and profile picture</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profileData.avatar} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(profileData.firstName, profileData.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Role</p>
                    <p className="text-sm text-muted-foreground">{getRoleDisplayName(user?.role || '')}</p>
                  </div>
                </div>

                <Button onClick={handleProfileSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shield Tab */}
          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={securityData.currentPassword}
                      onChange={(e) => setShieldData({...securityData, currentPassword: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={securityData.newPassword}
                      onChange={(e) => setShieldData({...securityData, newPassword: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={securityData.confirmPassword}
                      onChange={(e) => setShieldData({...securityData, confirmPassword: e.target.value})}
                    />
                  </div>
                  <Button onClick={handlePasswordChange}>
                    <Shield className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        Secure your account with SMS or authenticator app
                      </p>
                    </div>
                    <Switch
                      checked={securityData.twoFactorEnabled}
                      onCheckedChange={(checked) => 
                        setShieldData({...securityData, twoFactorEnabled: checked})
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="flex items-center text-lg font-semibold mb-4">
                    <Mail className="w-5 h-5 mr-2" />
                    Email Notifications
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Request Updates</p>
                        <p className="text-sm text-muted-foreground">Status changes and progress updates</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.email.requestUpdates}
                        onCheckedChange={(checked) => 
                          setNotificationPrefs({
                            ...notificationPrefs,
                            email: {...notificationPrefs.email, requestUpdates: checked}
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Weekly Reports</p>
                        <p className="text-sm text-muted-foreground">Summary of weekly activity</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.email.weeklyReport}
                        onCheckedChange={(checked) => 
                          setNotificationPrefs({
                            ...notificationPrefs,
                            email: {...notificationPrefs.email, weeklyReport: checked}
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="flex items-center text-lg font-semibold mb-4">
                    <Phone className="w-5 h-5 mr-2" />
                    SMS Notifications
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Urgent Notifications</p>
                        <p className="text-sm text-muted-foreground">Critical updates only</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.sms.urgent}
                        onCheckedChange={(checked) => 
                          setNotificationPrefs({
                            ...notificationPrefs,
                            sms: {...notificationPrefs.sms, urgent: checked}
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Request Updates</p>
                        <p className="text-sm text-muted-foreground">All status updates</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.sms.requestUpdates}
                        onCheckedChange={(checked) => 
                          setNotificationPrefs({
                            ...notificationPrefs,
                            sms: {...notificationPrefs.sms, requestUpdates: checked}
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="flex items-center text-lg font-semibold mb-4">
                    <Bell className="w-5 h-5 mr-2" />
                    Push Notifications
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Request Updates</p>
                        <p className="text-sm text-muted-foreground">Real-time status updates</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.push.requestUpdates}
                        onCheckedChange={(checked) => 
                          setNotificationPrefs({
                            ...notificationPrefs,
                            push: {...notificationPrefs.push, requestUpdates: checked}
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Task Assignments</p>
                        <p className="text-sm text-muted-foreground">New task assignments</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.push.assignments}
                        onCheckedChange={(checked) => 
                          setNotificationPrefs({
                            ...notificationPrefs,
                            push: {...notificationPrefs.push, assignments: checked}
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Reminders</p>
                        <p className="text-sm text-muted-foreground">Scheduled reminders</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.push.reminders}
                        onCheckedChange={(checked) => 
                          setNotificationPrefs({
                            ...notificationPrefs,
                            push: {...notificationPrefs.push, reminders: checked}
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleNotificationSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Premises Tab */}
          <TabsContent value="premises">
            <Card>
              <CardHeader>
                <CardTitle>My Properties</CardTitle>
                <CardDescription>Manage your linked properties and access codes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {premises.map((premise) => (
                  <div key={premise.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Building className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-semibold">{premise.name}</h3>
                          <p className="text-sm text-muted-foreground">Code: {premise.code}</p>
                        </div>
                      </div>
                      <Badge variant={premise.status === 'active' ? 'default' : 'secondary'}>
                        {premise.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Contract expires: {new Date(premise.contractExpiry).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Building className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">Add a new property</p>
                  <Button variant="outline" size="sm">
                    Enter Invite Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>View your account details and status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">User ID</p>
                      <p className="text-sm text-muted-foreground">{user?.id}</p>
                    </div>
                    <div>
                      <p className="font-medium">Account Status</p>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div>
                      <p className="font-medium">Member Since</p>
                      <p className="text-sm text-muted-foreground">January 2024</p>
                    </div>
                    <div>
                      <p className="font-medium">Organization</p>
                      <p className="text-sm text-muted-foreground">{user?.fmcOrganizationId || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible and destructive actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive" disabled>
                    Delete Account
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Contact your administrator to delete your account
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}