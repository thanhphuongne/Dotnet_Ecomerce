# EcomShop - Clothing Store E-commerce

Full-stack e-commerce application for a clothing store with 3 roles (Admin, Staff, Customer).

## Tech Stack

- **Backend**: ASP.NET Core 8 Web API · Entity Framework Core · MySQL
- **Frontend**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · React Query · Zustand
- **Infrastructure**: Docker & Docker Compose

## Quick Start with Docker

```bash
# Start all services (MySQL + Backend + Frontend)
docker compose up -d

# Wait ~30 seconds, then open:
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Swagger: http://localhost:5000/swagger
```

## Manual Setup

### Prerequisites
- .NET 8 SDK
- Node.js 18+
- MySQL 8.0

### Backend

```bash
cd backend/EcomShop.API

# Update connection string in appsettings.json
# "Server=localhost;Database=ecomshop_db;User=root;Password=your_password"

dotnet restore
dotnet run
# Database is auto-created and seeded on first run
```

### Frontend

```bash
cd frontend

npm install
# Copy .env.local.example to .env.local
cp .env.local.example .env.local

npm run dev
# Open http://localhost:3000
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ecomshop.com | Admin@123 |
| Staff | staff@ecomshop.com | Staff@123 |
| Customer | user@ecomshop.com | User@123 |

## Features

### Customer
- Browse products with filters (category, size, color, price range)
- Product detail with variant selection (size & color)
- Shopping cart with coupon codes
- Order placement with address management
- Order tracking with status history
- User profile & address book

### Staff
- View and process orders (confirm → ship → deliver)
- Manage products (view, edit inventory)

### Admin
- Dashboard with revenue charts and statistics
- Full product CRUD (create, edit, images, variants)
- Order management with status updates
- User management (role assignment, activate/deactivate)
- Category management (hierarchical)
- Coupon management
- Banner management

## Project Structure

```
Dotnet_Ecomerce/
├── backend/
│   └── EcomShop.API/
│       ├── Controllers/       # API endpoints
│       ├── Data/              # DbContext + Seeder
│       ├── DTOs/              # Request/Response models
│       ├── Middleware/        # Exception handling
│       ├── Models/            # Database entities
│       ├── Services/          # Business logic
│       ├── Program.cs         # DI & middleware setup
│       └── appsettings.json
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/        # Login, Register
│       │   ├── (shop)/        # Customer pages
│       │   └── (dashboard)/   # Admin & Staff pages
│       ├── components/
│       │   ├── admin/         # Dashboard layout
│       │   ├── layout/        # Header, Footer
│       │   └── shop/          # ProductCard, etc.
│       └── lib/               # API client, stores, utils
└── docker-compose.yml
```

## API Endpoints

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/products | Public |
| GET | /api/products/{slug} | Public |
| POST | /api/products | Admin/Staff |
| GET | /api/cart | Customer |
| POST | /api/orders | Customer |
| GET | /api/orders | Admin/Staff |
| PUT | /api/orders/{id}/status | Admin/Staff |
| GET | /api/users | Admin |
| GET | /api/orders/dashboard-stats | Admin |

Full API docs: http://localhost:5000/swagger
