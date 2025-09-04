import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/supabase';
import { 
  Building, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Settings,
  BarChart3,
  CreditCard,
  UserCheck
} from 'lucide-react';

interface FmcOrganization {
  id: string;
  name: string;
  description?: string;
  contactEmail: string;
  contactPhone?: string;
  isActive: boolean;
  stripeCustomerId?: string;
  createdAt: string;
}

interface SubscriptionTier {
  id: string;
  name: string;
  tier: string;
  price: number;
  currency: string;
  billingCycle: string;
  maxUsers?: number;
  maxBuildings?: number;
  maxRequestsPerMonth?: number;
  isActive: boolean;
}

interface UserSubscription {
  id: string;
  userId: string;
  tierId: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  tier: SubscriptionTier;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export default function MasterDashboard() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<FmcOrganization[]>([]);
  const [subscriptionTiers, setSubscriptionTiers] = useState<SubscriptionTier[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Form states
  const [newOrg, setNewOrg] = useState({
    name: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
  });

  const [newTier, setNewTier] = useState({
    name: '',
    tier: 'basic',
    price: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    maxUsers: 0,
    maxBuildings: 0,
    maxRequestsPerMonth: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [orgsRes, tiersRes] = await Promise.all([
        db.getFmcOrganizations(),
        db.getSubscriptionTiers(),
      ]);

      if (orgsRes.data) setOrganizations(orgsRes.data);
      if (tiersRes.data) setSubscriptionTiers(tiersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    try {
      const { error } = await db.createFmcOrganization(newOrg);
      if (error) {
        alert('Error creating organization: ' + error.message);
      } else {
        setNewOrg({ name: '', description: '', contactEmail: '', contactPhone: '' });
        loadData();
      }
    } catch (error) {
      console.error('Error creating organization:', error);
    }
  };

  const handleCreateTier = async () => {
    try {
      const { error } = await db.createSubscriptionTier(newTier);
      if (error) {
        alert('Error creating tier: ' + error.message);
      } else {
        setNewTier({
          name: '',
          tier: 'basic',
          price: 0,
          currency: 'USD',
          billingCycle: 'monthly',
          maxUsers: 0,
          maxBuildings: 0,
          maxRequestsPerMonth: 0,
        });
        loadData();
      }
    } catch (error) {
      console.error('Error creating tier:', error);
    }
  };

  const stats = {
    totalOrganizations: organizations.length,
    activeOrganizations: organizations.filter(org => org.isActive).length,
    totalTiers: subscriptionTiers.length,
    activeTiers: subscriptionTiers.filter(tier => tier.isActive).length,
    totalRevenue: userSubscriptions.reduce((sum, sub) => sum + (sub.tier.price || 0), 0),
    monthlyGrowth: 12.5, // Mock data
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Master Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">Admin</Badge>
              <span className="text-sm text-gray-600">{user?.email}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeOrganizations} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Subscription Tiers</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTiers}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeTiers} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    +{stats.monthlyGrowth}% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Platform Growth</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+{stats.monthlyGrowth}%</div>
                  <p className="text-xs text-muted-foreground">
                    Monthly growth rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform activities and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {organizations.slice(0, 5).map((org) => (
                    <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Building className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-gray-600">{org.contactEmail}</p>
                        </div>
                      </div>
                      <Badge variant={org.isActive ? "default" : "secondary"}>
                        {org.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="organizations" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">FMC Organizations</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Organization
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Organization</DialogTitle>
                    <DialogDescription>
                      Add a new FMC organization to the platform.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="orgName">Organization Name</Label>
                      <Input
                        id="orgName"
                        value={newOrg.name}
                        onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="orgDescription">Description</Label>
                      <Input
                        id="orgDescription"
                        value={newOrg.description}
                        onChange={(e) => setNewOrg({ ...newOrg, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="orgEmail">Contact Email</Label>
                      <Input
                        id="orgEmail"
                        type="email"
                        value={newOrg.contactEmail}
                        onChange={(e) => setNewOrg({ ...newOrg, contactEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="orgPhone">Contact Phone</Label>
                      <Input
                        id="orgPhone"
                        value={newOrg.contactPhone}
                        onChange={(e) => setNewOrg({ ...newOrg, contactPhone: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleCreateOrganization} className="w-full">
                      Create Organization
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-sm text-gray-600">{org.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{org.contactEmail}</p>
                            {org.contactPhone && (
                              <p className="text-sm text-gray-600">{org.contactPhone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.isActive ? "default" : "secondary"}>
                            {org.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(org.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Subscription Management</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tier
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Subscription Tier</DialogTitle>
                    <DialogDescription>
                      Add a new subscription tier with pricing and features.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="tierName">Tier Name</Label>
                      <Input
                        id="tierName"
                        value={newTier.name}
                        onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tierType">Tier Type</Label>
                      <Select value={newTier.tier} onValueChange={(value) => setNewTier({ ...newTier, tier: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tierPrice">Price</Label>
                      <Input
                        id="tierPrice"
                        type="number"
                        value={newTier.price}
                        onChange={(e) => setNewTier({ ...newTier, price: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tierCurrency">Currency</Label>
                      <Select value={newTier.currency} onValueChange={(value) => setNewTier({ ...newTier, currency: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tierBilling">Billing Cycle</Label>
                      <Select value={newTier.billingCycle} onValueChange={(value) => setNewTier({ ...newTier, billingCycle: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="maxUsers">Max Users</Label>
                        <Input
                          id="maxUsers"
                          type="number"
                          value={newTier.maxUsers}
                          onChange={(e) => setNewTier({ ...newTier, maxUsers: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxBuildings">Max Buildings</Label>
                        <Input
                          id="maxBuildings"
                          type="number"
                          value={newTier.maxBuildings}
                          onChange={(e) => setNewTier({ ...newTier, maxBuildings: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxRequests">Max Requests/Month</Label>
                        <Input
                          id="maxRequests"
                          type="number"
                          value={newTier.maxRequestsPerMonth}
                          onChange={(e) => setNewTier({ ...newTier, maxRequestsPerMonth: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <Button onClick={handleCreateTier} className="w-full">
                      Create Tier
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Subscription Tiers */}
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Tiers</CardTitle>
                  <CardDescription>Manage pricing tiers and features</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {subscriptionTiers.map((tier) => (
                      <div key={tier.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{tier.name}</p>
                          <p className="text-sm text-gray-600">{tier.tier}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${tier.price}/{tier.billingCycle}</p>
                          <Badge variant={tier.isActive ? "default" : "secondary"}>
                            {tier.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active Subscriptions */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Subscriptions</CardTitle>
                  <CardDescription>Current user subscriptions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userSubscriptions.slice(0, 5).map((subscription) => (
                      <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{subscription.user.firstName} {subscription.user.lastName}</p>
                          <p className="text-sm text-gray-600">{subscription.user.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{subscription.tier.name}</p>
                          <Badge variant={subscription.status === 'active' ? "default" : "secondary"}>
                            {subscription.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold">Platform Analytics</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                  <CardDescription>Monthly revenue trends and projections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Chart placeholder - Revenue analytics
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>Platform user growth and retention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Chart placeholder - User growth
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
                <CardDescription>System performance and uptime metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">99.9%</div>
                    <p className="text-sm text-gray-600">Uptime</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">2.1s</div>
                    <p className="text-sm text-gray-600">Avg Response Time</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">1.2k</div>
                    <p className="text-sm text-gray-600">Active Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
