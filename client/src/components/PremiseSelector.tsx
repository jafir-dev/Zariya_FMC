import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
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

interface Property {
  id: string;
  unitNumber: string;
  building: {
    id: string;
    name: string;
    address: string;
  };
  contractExpiryDate?: string;
  isActive: boolean;
}

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPremise, setSelectedPremise] = useState<Property | null>(null);

  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties'],
    enabled: !!user,
  });
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  // Filter properties based on showAll prop
  const availableProperties = showAll 
    ? properties 
    : properties.filter((p: Property) => p.isActive);

  useEffect(() => {
    if (selectedPremiseId) {
      const property = properties.find((p: Property) => p.id === selectedPremiseId);
      setSelectedPremise(property || null);
    } else if (availableProperties.length > 0) {
      const firstActive = availableProperties[0];
      setSelectedPremise(firstActive);
      onPremiseChange(firstActive.id);
    }
  }, [selectedPremiseId, properties]);

  const getStatusColor = (isActive: boolean, contractExpiry?: string) => {
    if (!isActive) return 'destructive';
    if (contractExpiry && new Date(contractExpiry) < new Date()) return 'destructive';
    return 'default';
  };

  const getStatusIcon = (isActive: boolean, contractExpiry?: string) => {
    if (!isActive || (contractExpiry && new Date(contractExpiry) < new Date())) {
      return <AlertTriangle className="w-3 h-3" />;
    }
    return <CheckCircle className="w-3 h-3" />;
  };

  const getStatusText = (isActive: boolean, contractExpiry?: string) => {
    if (!isActive) return 'inactive';
    if (contractExpiry && new Date(contractExpiry) < new Date()) return 'expired';
    return 'active';
  };

  const handlePremiseSelect = (premiseId: string) => {
    const property = properties.find((p: Property) => p.id === premiseId);
    if (property && property.isActive) {
      setSelectedPremise(property);
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
      // First validate the invite code
      const validateResponse = await fetch('/api/auth/validate-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: inviteCode.trim() }),
        credentials: 'include',
      });

      if (!validateResponse.ok) {
        throw new Error('Invalid or expired invite code');
      }

      const validationData = await validateResponse.json();

      // If validation successful, the user will need to register or link their account
      // For now, we'll show success and refresh the properties
      toast({
        title: 'Invite Code Validated',
        description: `Valid invite code for ${validationData.role} role. Contact support to complete property linking.`,
      });
      
      setInviteCode('');
      setInviteDialogOpen(false);
      
      // Refresh properties query to get any newly linked properties
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      
    } catch (error) {
      toast({
        title: 'Invalid Code',
        description: error instanceof Error ? error.message : 'The invite code is invalid or has expired.',
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };

  if (availableProperties.length === 0) {
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

  if (availableProperties.length === 1) {
    const property = availableProperties[0];
    return (
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-sm">{property.building.name} - {property.unitNumber}</h3>
                <Badge variant={getStatusColor(property.isActive, property.contractExpiryDate)} className="text-xs">
                  {getStatusIcon(property.isActive, property.contractExpiryDate)}
                  <span className="ml-1">{getStatusText(property.isActive, property.contractExpiryDate)}</span>
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{property.building.address}</p>
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
                  {selectedPremise ? `${selectedPremise.building.name} - ${selectedPremise.unitNumber}` : 'Select Property'}
                </div>
                {selectedPremise && (
                  <div className="text-xs text-muted-foreground">
                    {selectedPremise.building.address}
                  </div>
                )}
              </div>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="start">
          {availableProperties.map((property: Property) => (
            <DropdownMenuItem 
              key={property.id}
              onClick={() => handlePremiseSelect(property.id)}
              className="cursor-pointer p-3"
              disabled={!property.isActive}
            >
              <div className="flex items-start space-x-3 w-full">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Building className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{property.building.name} - {property.unitNumber}</h4>
                    <Badge variant={getStatusColor(property.isActive, property.contractExpiryDate)} className="text-xs">
                      {getStatusIcon(property.isActive, property.contractExpiryDate)}
                      <span className="ml-1">{getStatusText(property.isActive, property.contractExpiryDate)}</span>
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{property.building.address}</span>
                    </div>
                    {property.contractExpiryDate && (
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Expires: {new Date(property.contractExpiryDate).toLocaleDateString()}</span>
                      </div>
                    )}
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