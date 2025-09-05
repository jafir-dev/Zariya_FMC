import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building,
  ChevronDown,
  Plus,
  MapPin,
  Calendar,
  Key,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Premise {
  id: string;
  name: string;
  code: string;
  address: string;
  status: 'active' | 'inactive' | 'expired' | 'pending';
  contractExpiry: string;
  type: 'residential' | 'commercial' | 'industrial';
  inviteCode?: string;
}

const mockPremises: Premise[] = [
  {
    id: '1',
    name: 'Apartment 4B',
    code: 'SKY001',
    address: 'Skyline Towers, Downtown',
    status: 'active',
    contractExpiry: '2024-12-31',
    type: 'residential',
  },
  {
    id: '2',
    name: 'Office Suite 201',
    code: 'BP002',
    address: 'Business Park, Tech District',
    status: 'active',
    contractExpiry: '2025-06-30',
    type: 'commercial',
  },
  {
    id: '3',
    name: 'Warehouse Unit A',
    code: 'IND003',
    address: 'Industrial Zone, North Area',
    status: 'expired',
    contractExpiry: '2024-01-15',
    type: 'industrial',
  },
];

interface PremiseSelectorProps {
  selectedPremiseId?: string;
  onPremiseChange: (premiseId: string) => void;
  showAll?: boolean;
}

export default function PremiseSelector({ 
  selectedPremiseId, 
  onPremiseChange,
  showAll = false 
}: PremiseSelectorProps) {
  const [premises] = useState<Premise[]>(mockPremises);
  const [selectedPremise, setSelectedPremise] = useState<Premise | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  // Filter premises based on showAll prop
  const availablePremises = showAll 
    ? premises 
    : premises.filter(p => p.status === 'active');

  useEffect(() => {
    if (selectedPremiseId) {
      const premise = premises.find(p => p.id === selectedPremiseId);
      setSelectedPremise(premise || null);
    } else if (availablePremises.length > 0) {
      const firstActive = availablePremises[0];
      setSelectedPremise(firstActive);
      onPremiseChange(firstActive.id);
    }
  }, [selectedPremiseId, premises]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'expired':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-3 h-3" />;
      case 'expired':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getPremiseTypeDisplay = (type: string) => {
    switch (type) {
      case 'residential':
        return 'Residential';
      case 'commercial':
        return 'Commercial';
      case 'industrial':
        return 'Industrial';
      default:
        return type;
    }
  };

  const handlePremiseSelect = (premiseId: string) => {
    const premise = premises.find(p => p.id === premiseId);
    if (premise && premise.status === 'active') {
      setSelectedPremise(premise);
      onPremiseChange(premiseId);
    }
  };

  const handleInviteCodeSubmit = async () => {
    if (!inviteCode.trim()) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a valid invite code.',
        variant: 'destructive',
      });
      return;
    }

    setIsValidating(true);
    
    try {
      // TODO: Implement API call to validate and link invite code
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: 'Property Added',
        description: 'The property has been successfully linked to your account.',
      });
      
      setInviteCode('');
      setInviteDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Invalid Code',
        description: 'The invite code is invalid or has expired.',
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };

  if (availablePremises.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Building className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center mb-4">
            No properties found. Add a property using an invite code.
          </p>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Property</DialogTitle>
                <DialogDescription>
                  Enter the invite code provided by your property manager to link a property to your account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code</Label>
                  <Input
                    id="inviteCode"
                    placeholder="Enter invite code (e.g., ABC123)"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setInviteDialogOpen(false)}
                  disabled={isValidating}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleInviteCodeSubmit}
                  disabled={isValidating}
                >
                  {isValidating ? 'Validating...' : 'Add Property'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  if (availablePremises.length === 1) {
    const premise = availablePremises[0];
    return (
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-sm">{premise.name}</h3>
                <Badge variant={getStatusColor(premise.status)} className="text-xs">
                  {getStatusIcon(premise.status)}
                  <span className="ml-1">{premise.status}</span>
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{premise.address}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-between min-w-[250px]">
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4" />
              <div className="text-left">
                <div className="text-sm font-medium">
                  {selectedPremise?.name || 'Select Property'}
                </div>
                {selectedPremise && (
                  <div className="text-xs text-muted-foreground">
                    {selectedPremise.code}
                  </div>
                )}
              </div>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="start">
          {availablePremises.map((premise) => (
            <DropdownMenuItem 
              key={premise.id}
              onClick={() => handlePremiseSelect(premise.id)}
              className="cursor-pointer p-3"
              disabled={premise.status !== 'active'}
            >
              <div className="flex items-start space-x-3 w-full">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Building className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{premise.name}</h4>
                    <Badge variant={getStatusColor(premise.status)} className="text-xs">
                      {getStatusIcon(premise.status)}
                      <span className="ml-1">{premise.status}</span>
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Key className="w-3 h-3" />
                      <span>{premise.code}</span>
                      <span>•</span>
                      <span>{getPremiseTypeDisplay(premise.type)}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{premise.address}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>Expires: {new Date(premise.contractExpiry).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Property</DialogTitle>
                <DialogDescription>
                  Enter the invite code provided by your property manager to link a property to your account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code</Label>
                  <Input
                    id="inviteCode"
                    placeholder="Enter invite code (e.g., ABC123)"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact your property manager if you don't have an invite code.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setInviteDialogOpen(false)}
                  disabled={isValidating}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleInviteCodeSubmit}
                  disabled={isValidating || !inviteCode.trim()}
                >
                  {isValidating ? 'Validating...' : 'Add Property'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}