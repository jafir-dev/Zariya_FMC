import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { Check, Star, Building, Users, Clock, Shield, Zap } from 'lucide-react';

export default function Landing() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('tenant');
  const [inviteCode, setInviteCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isSignUp) {


        const { error } = await signUp(email, password, {
          firstName,
          lastName,
          role,
          inviteCode,
        });
        
        if (error) {
          setError(error.message);
        } else {
          setError('');
          setShowModal(false);
          setShowSuccessPopup(true);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('email-not-verified') || error.message.includes('not verified')) {
            setError('Please verify your email address before signing in. Check your inbox for the verification link.');
          } else if (error.message.includes('user-not-found') || error.message.includes('wrong-password')) {
            setError('Invalid email or password. Please check your credentials and try again.');
          } else {
            setError(error.message);
          }
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('Failed to connect to authentication service. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        alert(error.message);
        setIsLoading(false);
      }
      // Note: If successful, the redirect will handle the rest and page will reload
    } catch (error) {
      console.error('Google sign-in error:', error);
      alert('Failed to connect to Google sign-in service. Please check your internet connection and try again.');
      setIsLoading(false);
    }
  };

  const pricingTiers = [
    {
      name: 'Basic',
      price: '$29',
      period: '/month',
      description: 'Perfect for small FMCs',
      features: [
        'Up to 5 buildings',
        'Up to 10 users',
        'Basic maintenance tracking',
        'Email notifications',
        'Mobile app access',
      ],
      popular: false,
    },
    {
      name: 'Professional',
      price: '$79',
      period: '/month',
      description: 'Ideal for growing FMCs',
      features: [
        'Up to 25 buildings',
        'Up to 50 users',
        'Advanced analytics',
        'Push notifications',
        'WhatsApp integration',
        'Custom workflows',
        'Priority support',
      ],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/month',
      description: 'For large FMC organizations',
      features: [
        'Unlimited buildings',
        'Unlimited users',
        'Advanced reporting',
        'API access',
        'Custom integrations',
        'Dedicated support',
        'SLA guarantees',
      ],
      popular: false,
    },
  ];

  const features = [
    {
      icon: Building,
      title: 'Multi-Building Management',
      description: 'Manage multiple properties from a single dashboard with ease.',
    },
    {
      icon: Users,
      title: 'Role-Based Access',
      description: 'Secure access control for tenants, technicians, and supervisors.',
    },
    {
      icon: Clock,
      title: 'Real-Time Tracking',
      description: 'Track maintenance requests in real-time with status updates.',
    },
    {
      icon: Shield,
      title: 'Quality Assurance',
      description: 'Photo/video documentation and OTP verification for work completion.',
    },
    {
      icon: Zap,
      title: 'Smart Notifications',
      description: 'Multi-channel notifications via email, SMS, WhatsApp, and push.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Zariya FMC</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => { setIsSignUp(false); setShowModal(true); }}>
                Sign In
              </Button>
              <Button onClick={() => { setIsSignUp(true); setShowModal(true); }}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
            Transform Your
            <span className="text-blue-600"> Facility Management</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline maintenance workflows, improve response times, and enhance transparency 
            with our comprehensive facility management platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => { setIsSignUp(true); setShowModal(true); }}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById('pricing')?.scrollIntoView()}>
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Facilities
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features designed for modern facility management companies
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your organization's needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => (
              <Card key={index} className={`relative ${tier.popular ? 'border-blue-500 shadow-lg' : ''}`}>
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-gray-600 ml-1">{tier.period}</span>
                  </div>
                  <CardDescription className="text-base">
                    {tier.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full mt-6" 
                    variant={tier.popular ? 'default' : 'outline'}
                    onClick={() => { setIsSignUp(true); setShowModal(true); }}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowModal(false)}
        >
        <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <CardHeader className="text-center relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute right-0 top-0 p-2 hover:bg-gray-100 rounded-full"
              aria-label="Close modal"
            >
              ✕
            </button>
            <CardTitle className="text-2xl">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </CardTitle>
            <CardDescription>
              {isSignUp ? 'Join Zariya FMC to streamline your facility management' : 'Welcome back to Zariya FMC'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}
              
              {isSignUp && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required={isSignUp}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required={isSignUp}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tenant">Tenant</SelectItem>
                        <SelectItem value="fmc_supervisor">FMC Supervisor</SelectItem>
                        <SelectItem value="fmc_technician">FMC Technician</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="master">Master Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Invite Code Field - Show for tenant role */}
                  {role === 'tenant' && (
                    <div>
                      <Label htmlFor="inviteCode">Invite Code (Optional)</Label>
                      <Input
                        id="inviteCode"
                        placeholder="Enter invite code from your property manager"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Contact your property manager if you don't have an invite code.
                      </p>
                    </div>
                  )}

                </>
              )}
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </Button>
            </form>
            
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                Continue with Google
              </Button>
            </div>
            
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-600 hover:underline"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowSuccessPopup(false)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="text-center relative">
              <button 
                onClick={() => setShowSuccessPopup(false)}
                className="absolute right-0 top-0 p-2 hover:bg-gray-100 rounded-full"
                aria-label="Close popup"
              >
                ✕
              </button>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">
                Account Created Successfully!
              </CardTitle>
              <CardDescription>
                Please check your email to verify your account before signing in.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={() => setShowSuccessPopup(false)}
                className="w-full"
              >
                Got it!
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Building className="h-8 w-8 text-blue-400" />
                <span className="ml-2 text-xl font-bold">Zariya FMC</span>
              </div>
              <p className="text-gray-400">
                Transforming facility management with modern technology and seamless workflows.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Zariya FMC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
