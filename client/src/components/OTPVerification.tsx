import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CheckCircle, Shield, Timer, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

interface OTPVerificationProps {
  requestId: string;
  onVerificationComplete?: () => void;
}

interface OTPStatus {
  hasOTP: boolean;
  isExpired: boolean;
  isApproved: boolean;
  expiresAt?: string;
}

export default function OTPVerification({ requestId, onVerificationComplete }: OTPVerificationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [otp, setOtp] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);

  // Query OTP status
  const { data: otpStatus, refetch: refetchStatus } = useQuery<OTPStatus>({
    queryKey: [`/api/maintenance-requests/${requestId}/otp-status`],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Generate OTP mutation
  const generateOTPMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/maintenance-requests/${requestId}/generate-otp`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'OTP Generated',
        description: 'Verification code has been sent to the customer.',
      });
      setIsGenerateDialogOpen(false);
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate OTP',
        variant: 'destructive',
      });
    },
  });

  // Verify OTP mutation
  const verifyOTPMutation = useMutation({
    mutationFn: async (otpCode: string) => {
      const response = await apiRequest('POST', `/api/maintenance-requests/${requestId}/verify-otp`, {
        otp: otpCode,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Work Approved',
        description: 'The customer has successfully approved the completed work.',
      });
      setOtp('');
      setIsVerifyDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/maintenance-requests/${requestId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-requests'] });
      refetchStatus();
      onVerificationComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid OTP code',
        variant: 'destructive',
      });
    },
  });

  // Resend OTP mutation
  const resendOTPMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/maintenance-requests/${requestId}/resend-otp`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'OTP Resent',
        description: 'A new verification code has been sent to the customer.',
      });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend OTP',
        variant: 'destructive',
      });
    },
  });

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (otpStatus?.hasOTP && otpStatus?.expiresAt && !otpStatus?.isExpired) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const expiry = new Date(otpStatus.expiresAt!).getTime();
        const remaining = Math.max(0, expiry - now);
        
        setTimeRemaining(Math.floor(remaining / 1000));
        
        if (remaining <= 0) {
          refetchStatus();
        }
      };
      
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpStatus, refetchStatus]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const canGenerateOTP = user?.role === 'fmc_technician';
  const canVerifyOTP = user?.role === 'tenant';

  // Already approved
  if (otpStatus?.isApproved) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <h4 className="font-medium text-green-800">Work Approved</h4>
              <p className="text-sm text-green-600">The customer has approved the completed work.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="w-5 h-5" />
          <span>Work Verification</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!otpStatus?.hasOTP ? (
          // No OTP generated yet
          <div className="text-center py-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              No verification code has been generated for this request.
            </p>
            {canGenerateOTP && (
              <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-generate-otp">
                    Generate Verification Code
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Verification Code</DialogTitle>
                    <DialogDescription>
                      This will send a 6-digit verification code to the customer for work approval.
                      The code will be valid for 10 minutes.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsGenerateDialogOpen(false)}
                      disabled={generateOTPMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => generateOTPMutation.mutate()}
                      disabled={generateOTPMutation.isPending}
                      data-testid="button-confirm-generate-otp"
                    >
                      {generateOTPMutation.isPending ? 'Generating...' : 'Generate Code'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        ) : otpStatus?.isExpired ? (
          // OTP expired
          <div className="text-center py-4">
            <Timer className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              The verification code has expired.
            </p>
            <Badge variant="destructive" className="mb-4">Expired</Badge>
            {canGenerateOTP && (
              <Button 
                variant="outline" 
                onClick={() => resendOTPMutation.mutate()}
                disabled={resendOTPMutation.isPending}
                data-testid="button-resend-otp"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${resendOTPMutation.isPending ? 'animate-spin' : ''}`} />
                {resendOTPMutation.isPending ? 'Generating New Code...' : 'Generate New Code'}
              </Button>
            )}
          </div>
        ) : (
          // Active OTP
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Verification Code Sent</h4>
                <p className="text-sm text-muted-foreground">
                  Code sent to customer for work approval
                </p>
              </div>
              <div className="text-right">
                <Badge variant="default">Active</Badge>
                {timeRemaining > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Expires in {formatTime(timeRemaining)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex space-x-2">
              {canVerifyOTP && (
                <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex-1" data-testid="button-verify-otp">
                      Enter Verification Code
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Verify Work Completion</DialogTitle>
                      <DialogDescription>
                        Enter the 6-digit verification code to approve the completed work.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="otp">Verification Code</Label>
                        <Input
                          id="otp"
                          type="text"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit code"
                          className="text-center text-lg tracking-widest"
                          data-testid="input-otp"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsVerifyDialogOpen(false);
                          setOtp('');
                        }}
                        disabled={verifyOTPMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => verifyOTPMutation.mutate(otp)}
                        disabled={verifyOTPMutation.isPending || otp.length !== 6}
                        data-testid="button-confirm-verify-otp"
                      >
                        {verifyOTPMutation.isPending ? 'Verifying...' : 'Approve Work'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {canGenerateOTP && (
                <Button 
                  variant="outline"
                  onClick={() => resendOTPMutation.mutate()}
                  disabled={resendOTPMutation.isPending}
                  data-testid="button-resend-existing-otp"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${resendOTPMutation.isPending ? 'animate-spin' : ''}`} />
                  Resend
                </Button>
              )}
            </div>
          </div>
        )}

        {canVerifyOTP && !otpStatus?.hasOTP && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Customer:</strong> You will receive a verification code once the technician completes the work.
            </p>
          </div>
        )}

        {canGenerateOTP && (
          <div className="bg-amber-50 p-3 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Technician:</strong> Generate a verification code after completing the work to get customer approval.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}