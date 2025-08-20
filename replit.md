# Overview

This is a comprehensive license management system for business licenses with encrypted key generation and expiration tracking. The application provides a complete dashboard for creating, managing, and monitoring software licenses with automatic Discord notifications and revenue analytics. Built as a full-stack TypeScript application with React frontend and Express backend.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for development and build tooling
- **UI Components**: Shadcn/ui component library with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom design system and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Data Layer**: In-memory storage implementation with interface-based design for future database integration
- **Schema Validation**: Drizzle ORM schema definitions with Zod for runtime validation
- **License Generation**: Custom AES-128-CBC encryption service for secure license key creation
- **API Design**: RESTful endpoints for CRUD operations on licenses and analytics

## Data Storage Solutions
- **Current**: In-memory storage with Map-based collections for development/testing
- **Configured**: Drizzle ORM with PostgreSQL dialect ready for production deployment
- **Database Schema**: 
  - Licenses table with business info, expiration tracking, and encrypted keys
  - Split people table for revenue distribution management
  - Automatic UUID generation and epoch day calculations for date handling

## Authentication and Authorization
- **Current State**: No authentication implemented - open system
- **Session Management**: Express session configuration present but not actively used
- **Security**: License keys are AES-encrypted with fixed keys (not production-ready)

## External Service Integrations

### Discord Notifications
- **Purpose**: Automated notifications for license creation, renewal, and expiration events
- **Implementation**: Webhook-based integration with formatted embed messages
- **Features**: Rich embeds with license details, revenue tracking, and status updates

### Development Tools
- **Replit Integration**: Custom Vite plugins for Replit development environment
- **Error Handling**: Runtime error overlay for development debugging
- **Hot Reload**: Vite HMR with Express middleware integration

## Key Design Patterns

### Repository Pattern
- Storage interface abstraction allows swapping between in-memory and database implementations
- Clean separation between data access and business logic

### Service Layer Architecture
- Dedicated services for license encryption/decryption
- Discord notification service with error handling and retry logic
- Centralized business logic separate from HTTP handling

### Type-Safe Data Flow
- Shared TypeScript schemas between frontend and backend
- Zod validation at API boundaries
- Drizzle ORM for type-safe database operations

### Component Architecture
- Modular React components with single responsibility principle
- Custom hooks for data fetching and state management
- Reusable UI components with consistent design system

The system prioritizes developer experience with hot reload, TypeScript throughout, and comprehensive error handling while providing a scalable architecture for license management workflows.