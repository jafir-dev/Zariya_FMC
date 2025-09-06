import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Building, UserCheck, Phone, Mail, MapPin } from 'lucide-react';

interface ProfileCompletionProps {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  onComplete: () => void;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
  inviteCode?: string;
  // Additional fields for different roles
  buildingName?: string;
  unitNumber?: string;
  organizationName?: string;
  specialization?: string[];
}

export default function ProfileCompletion({ user, onComplete }: ProfileCompletionProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phoneNumber: '',
    role: 'tenant',
  });
  const [inviteValidation, setInviteValidation] = useState<{
    valid: boolean;
    role?: string;
    organizationName?: string;
  } | null>(null);

  const userRoles = [
    { value: 'tenant', label: 'Tenant/Resident', description: 'I live in a property managed by an FMC' },
    { value: 'building_owner', label: 'Building Owner', description: 'I own property managed by an FMC' },
    { value: 'fmc_head', label: 'FMC Head', description: 'I manage an FMC organization (requires invite)' },
    { value: 'fmc_supervisor', label: 'FMC Supervisor', description: 'I supervise maintenance operations (requires invite)' },
    { value: 'fmc_technician', label: 'FMC Technician', description: 'I perform maintenance work (requires invite)' },
    { value: 'fmc_procurement', label: 'FMC Procurement', description: 'I handle procurement for FMC (requires invite)' },
    { value: 'third_party_support', label: 'Third Party Vendor', description: 'I work for a vendor partner (requires invite)' },
  ];

  const specializations = [
    'hvac', 'plumbing', 'electrical', 'general', 'appliances', 
    'elevator', 'security', 'cleaning', 'other'
  ];

  const validateInviteCode = async (code: string) => {
    if (!code.trim()) {
      setInviteValidation(null);
      return;
    }

    try {
      const response = await fetch('/api/auth/validate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const result = await response.json();
      
      if (result.valid) {
        setInviteValidation({
          valid: true,
          role: result.role,
          organizationName: result.organizationName,
        });
        
        // Auto-set role based on invite
        setProfileData(prev => ({ ...prev, role: result.role }));
        toast.success('Invite code validated successfully!');
      } else {
        setInviteValidation({ valid: false });
        toast.error('Invalid or expired invite code');
      }
    } catch (error) {
      setInviteValidation({ valid: false });
      toast.error('Failed to validate invite code');
    }
  };

  const requiresInvite = (role: string) => {
    return ['fmc_head', 'fmc_supervisor', 'fmc_technician', 'fmc_procurement', 'third_party_support'].includes(role);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!profileData.firstName || !profileData.lastName || !profileData.phoneNumber) {
        toast.error('Please fill in all required fields');
        return;
      }
      if (!/^[\+]?[1-9][\d]{0,15}$/.test(profileData.phoneNumber.replace(/\s/g, ''))) {
        toast.error('Please enter a valid phone number');
        return;
      }
    }
    
    if (step === 2) {
      if (!profileData.role) {
        toast.error('Please select your role');
        return;
      }
      
      if (requiresInvite(profileData.role)) {
        if (!profileData.inviteCode) {
          toast.error('An invite code is required for this role');
          return;
        }
        if (!inviteValidation?.valid) {
          toast.error('Please enter a valid invite code');
          return;
        }
      }
    }
    
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          ...profileData,
        }),
      });

      if (response.ok) {
        toast.success('Profile completed successfully!');
        onComplete();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to complete profile');
      }
    } catch (error) {
      toast.error('Failed to complete profile');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <User className="h-12 w-12 text-primary mx-auto" />
        <h2 className="text-2xl font-semibold">Personal Information</h2>
        <p className="text-muted-foreground">Let's start with your basic details</p>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={profileData.firstName}
              onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="Enter your first name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={profileData.lastName}
              onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Enter your last name"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number *</Label>
          <Input
            id="phoneNumber"
            type="tel"
            value={profileData.phoneNumber}
            onChange={(e) => setProfileData(prev => ({ ...prev, phoneNumber: e.target.value }))}
            placeholder="+1 (555) 123-4567"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={user.email}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">Email cannot be changed</p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <UserCheck className="h-12 w-12 text-primary mx-auto" />
        <h2 className="text-2xl font-semibold">Your Role</h2>
        <p className="text-muted-foreground">Select your role to customize your experience</p>
      </div>
      
      <div className="space-y-3">
        {userRoles.map((role) => (
          <Card
            key={role.value}
            className={`cursor-pointer transition-all ${
              profileData.role === role.value ? 'ring-2 ring-primary' : 'hover:shadow-md'
            }`}
            onClick={() => setProfileData(prev => ({ ...prev, role: role.value }))}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  profileData.role === role.value ? 'bg-primary border-primary' : 'border-muted-foreground'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{role.label}</h3>
                    {requiresInvite(role.value) && (
                      <Badge variant="secondary" className="text-xs">Invite Required</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {requiresInvite(profileData.role) && (
        <div className="space-y-2">
          <Label htmlFor="inviteCode">Invite Code *</Label>
          <Input
            id="inviteCode"
            value={profileData.inviteCode || ''}
            onChange={(e) => {
              setProfileData(prev => ({ ...prev, inviteCode: e.target.value }));
              validateInviteCode(e.target.value);
            }}
            placeholder="Enter your invite code"
            className={inviteValidation?.valid === false ? 'border-destructive' : ''}
          />
          {inviteValidation?.valid && (
            <p className="text-sm text-green-600">✓ Valid invite code for {inviteValidation.role}</p>
          )}
          {inviteValidation?.valid === false && (
            <p className="text-sm text-destructive">Invalid or expired invite code</p>
          )}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Building className="h-12 w-12 text-primary mx-auto" />
        <h2 className="text-2xl font-semibold">Additional Details</h2>
        <p className="text-muted-foreground">Help us customize your experience</p>
      </div>
      
      {(profileData.role === 'tenant' || profileData.role === 'building_owner') && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="buildingName">Building Name (Optional)</Label>
            <Input
              id="buildingName"
              value={profileData.buildingName || ''}
              onChange={(e) => setProfileData(prev => ({ ...prev, buildingName: e.target.value }))}
              placeholder="e.g., Sunset Apartments"
            />
          </div>
          
          {profileData.role === 'tenant' && (
            <div className="space-y-2">
              <Label htmlFor="unitNumber">Unit Number (Optional)</Label>
              <Input
                id="unitNumber"
                value={profileData.unitNumber || ''}
                onChange={(e) => setProfileData(prev => ({ ...prev, unitNumber: e.target.value }))}
                placeholder="e.g., 101, 2B, etc."
              />
            </div>
          )}
        </div>
      )}
      
      {profileData.role === 'third_party_support' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization Name (Optional)</Label>
            <Input
              id="organizationName"
              value={profileData.organizationName || ''}
              onChange={(e) => setProfileData(prev => ({ ...prev, organizationName: e.target.value }))}
              placeholder="Your company name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Specializations (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {specializations.map((spec) => (
                <Badge
                  key={spec}
                  variant={profileData.specialization?.includes(spec) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const currentSpecs = profileData.specialization || [];
                    const newSpecs = currentSpecs.includes(spec)
                      ? currentSpecs.filter(s => s !== spec)
                      : [...currentSpecs, spec];
                    setProfileData(prev => ({ ...prev, specialization: newSpecs }));
                  }}
                >
                  {spec.charAt(0).toUpperCase() + spec.slice(1)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-muted p-4 rounded-lg">
        <h3 className="font-medium mb-2">Profile Summary</h3>
        <div className="space-y-1 text-sm">
          <p><Mail className="inline w-4 h-4 mr-2" />{user.email}</p>
          <p><User className="inline w-4 h-4 mr-2" />{profileData.firstName} {profileData.lastName}</p>
          <p><Phone className="inline w-4 h-4 mr-2" />{profileData.phoneNumber}</p>
          <p><UserCheck className="inline w-4 h-4 mr-2" />{userRoles.find(r => r.value === profileData.role)?.label}</p>
          {profileData.buildingName && (
            <p><MapPin className="inline w-4 h-4 mr-2" />{profileData.buildingName} {profileData.unitNumber}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Complete Your Profile</CardTitle>
              <CardDescription>
                Step {step} of 3 - Let's get you set up
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    i === step ? 'bg-primary text-primary-foreground' :
                    i < step ? 'bg-primary/20 text-primary' :
                    'bg-muted text-muted-foreground'
                  }`}
                >
                  {i}
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
            >
              Back
            </Button>
            
            {step < 3 ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'Completing...' : 'Complete Profile'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}