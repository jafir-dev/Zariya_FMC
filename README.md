# Zariya FMC Platform

A comprehensive facility management platform that streamlines maintenance workflows, improves response times, and enhances transparency for Facility Management Companies (FMCs).

## 🚀 Features

### Core Functionality
- **Multi-tenant Architecture**: Support for multiple FMC organizations with complete data isolation
- **Role-based Access Control**: 7 user types (tenant, building owner, FMC head, supervisor, technician, procurement, third-party support)
- **Maintenance Request Management**: Complete lifecycle from creation to completion
- **Real-time Notifications**: Multi-channel notifications (push, WhatsApp, SMS, email) ✅
- **Visual Documentation**: Photo/video upload with before/after comparison ✅
- **Quality Control**: OTP verification system for work completion approval ✅
- **WebSocket Real-time Updates**: Live status updates without page refresh ✅
- **Cloud File Storage**: S3-compatible storage with CDN support ✅
- **Comprehensive Security**: Rate limiting, input sanitization, SQL injection protection ✅
- **Health Monitoring**: Detailed system health checks and metrics ✅

### Subscription Management
- **Tiered Pricing**: Basic, Professional, and Enterprise plans
- **Stripe Integration**: Secure payment processing
- **Usage Limits**: Configurable limits for users, buildings, and requests
- **Billing Automation**: Automatic subscription management

### Admin Features
- **Master Dashboard**: Comprehensive platform management
- **Analytics & Reporting**: Performance metrics and business intelligence
- **User Management**: Complete user lifecycle management
- **Organization Management**: FMC onboarding and configuration

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **React Query** for data fetching
- **Wouter** for routing

### Backend
- **Node.js** with Express
- **Supabase** for database and authentication
- **Drizzle ORM** for database operations
- **Firebase** for push notifications
- **Stripe** for payment processing

### Infrastructure
- **PostgreSQL** database
- **Redis** for caching (optional)
- **Docker** for containerization
- **Vercel/Netlify** for deployment

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Supabase account
- Firebase project
- Stripe account

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd FMCProduct
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the environment template and configure your variables:

```bash
cp env.example .env
```

Fill in the required environment variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 4. Database Setup

#### Supabase Setup
1. Create a new Supabase project
2. Get your project URL and API keys
3. Run database migrations:

```bash
npm run db:push
```

#### Seed Sample Data
Populate the database with sample data:

```bash
npm run db:seed
```

This creates:
- 3 FMC organizations
- Subscription tiers (Basic, Professional, Enterprise)
- Sample users for each role
- Sample buildings and properties
- Sample maintenance requests
- Invite codes for testing

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 🏗 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility libraries
│   │   ├── pages/         # Page components
│   │   └── main.tsx       # Application entry point
├── server/                # Backend Express application
│   ├── db.ts             # Database configuration
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   └── seed.ts           # Database seeding
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema definitions
└── uploads/              # File upload directory
```

## 👥 User Roles & Access

### Admin
- Platform-wide management
- Organization onboarding
- Subscription tier management
- Analytics and reporting

### FMC Head
- Organization management
- Staff management
- Performance monitoring
- Strategic oversight

### FMC Supervisor
- Request assignment and management
- Technician oversight
- Quality control
- Performance tracking

### FMC Technician
- Task execution
- Status updates
- Photo/video documentation
- Work completion

### Tenant
- Maintenance request creation
- Request tracking
- Work approval
- Communication

### Building Owner
- Property oversight
- Request monitoring
- Financial tracking

### FMC Procurement
- Material management
- Supplier coordination
- Cost tracking

### Third-Party Support
- Specialized service delivery
- External vendor integration

## 🔧 Configuration

### Supabase Setup
1. Enable Row Level Security (RLS)
2. Configure authentication providers
3. Set up database policies
4. Configure storage buckets

### Firebase Setup
1. Create Firebase project
2. Enable Cloud Messaging
3. Generate VAPID key
4. Configure web app

### Stripe Setup
1. Create Stripe account
2. Set up products and pricing
3. Configure webhooks
4. Test payment flows

## 📊 Database Schema

The application uses a comprehensive schema with the following main entities:

- **FMC Organizations**: Multi-tenant isolation
- **Users**: Role-based access control
- **Buildings & Properties**: Physical asset management
- **Maintenance Requests**: Core workflow entity
- **Subscriptions**: Billing and usage management
- **Notifications**: Communication system
- **Attachments**: File management
- **Timeline**: Audit trail

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Environment Variables
Ensure all production environment variables are set:
- Database connection strings
- API keys and secrets
- Domain configurations
- SSL certificates

### Deployment Platforms
- **Vercel**: Frontend deployment
- **Railway/Render**: Backend deployment
- **Supabase**: Database hosting
- **Firebase**: Push notifications

## 🔒 Security

- **SOC 2 Compliance**: Data encryption at rest and in transit
- **Row Level Security**: Database-level access control
- **JWT Authentication**: Secure session management
- **Input Validation**: Comprehensive data validation
- **Rate Limiting**: API protection
- **CORS Configuration**: Cross-origin security

## 📈 Monitoring & Analytics

- **Performance Monitoring**: Response time tracking
- **Error Tracking**: Comprehensive error logging
- **Usage Analytics**: User behavior insights
- **Business Metrics**: KPI tracking
- **Health Checks**: System monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🗺 Roadmap

### Phase 2 Features
- Native mobile applications
- Advanced analytics dashboard
- AI-powered insights
- Third-party integrations
- Advanced reporting
- Multi-language support

### Phase 3 Features
- IoT device integration
- Predictive maintenance
- Advanced automation
- Enterprise SSO
- Custom workflows
- API marketplace

---

**Built with ❤️ for modern facility management**
