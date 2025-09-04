# Zariya FMC - Facility Management Platform

## Overview

Zariya FMC is a comprehensive facility management platform designed to digitize and streamline maintenance workflows across multiple stakeholders. The system connects tenants, building associations, and facility management company (FMC) staff through a unified platform that orchestrates the complete maintenance lifecycle. Built as a full-stack web application, it features role-based dashboards, real-time request tracking, file upload capabilities, and multi-channel notification systems to improve response times and operational efficiency.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built using **React 18** with **TypeScript** in a single-page application (SPA) architecture. The UI leverages **shadcn/ui** components built on top of **Radix UI** primitives and styled with **Tailwind CSS**. State management is handled through **TanStack Query (React Query)** for server state, with **Wouter** providing lightweight client-side routing. The application features role-based views with dedicated dashboards for tenants, supervisors, and technicians.

### Backend Architecture
The server uses **Express.js** with **TypeScript** running on **Node.js**. The architecture follows a RESTful API design pattern with modular route handlers. Authentication is implemented using **Replit's OpenID Connect** integration with **Passport.js** for session management. File uploads are handled through **Multer** middleware with support for images and videos up to 50MB.

### Database Design
Data persistence is managed through **Drizzle ORM** configured for **PostgreSQL**. The database schema supports multi-tenancy with role-based access control across 7 user types (tenant, building_owner, fmc_head, fmc_supervisor, fmc_technician, fmc_procurement, third_party_support). Core entities include users, buildings, properties, maintenance requests, attachments, and request timelines with proper relational constraints.

### Authentication & Authorization
The system implements **session-based authentication** using Replit's OAuth2/OpenID Connect flow. Sessions are persisted in PostgreSQL using **connect-pg-simple**. Role-based access control is enforced at both the API and UI levels, with middleware protecting sensitive endpoints and conditional rendering based on user roles.

### File Management
File uploads support images and videos with client-side validation and server-side processing through Multer. Files are stored locally with UUID-based naming to prevent conflicts. The system includes drag-and-drop upload interfaces and preview capabilities for different media types.

### Development Architecture
The project uses **Vite** for development with hot module replacement and **esbuild** for production bundling. TypeScript compilation is handled separately from bundling, with shared types between client and server through a dedicated `shared` directory. The development setup includes Replit-specific plugins for enhanced debugging and error overlay.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database hosting with connection pooling
- **PostgreSQL**: Primary database engine using connection strings via `DATABASE_URL`

### Authentication Services  
- **Replit Auth**: OpenID Connect authentication provider integrated through `@replit/auth`
- **Session Storage**: PostgreSQL-backed session persistence using `connect-pg-simple`

### UI Component Libraries
- **Radix UI**: Headless component primitives for accessibility and interactions
- **shadcn/ui**: Pre-built component system with Tailwind CSS integration
- **Lucide React**: Icon library for consistent iconography

### Development Tools
- **Replit Platform**: Development environment with integrated deployment and debugging tools
- **Vite Plugins**: Runtime error overlays and development cartographer for enhanced debugging
- **TypeScript**: Static type checking across the full stack

### Runtime Dependencies
- **TanStack Query**: Server state management and caching for React
- **Wouter**: Lightweight routing library for single-page navigation
- **date-fns**: Date manipulation and formatting utilities
- **WebSocket**: Real-time communication capabilities through native WebSocket API