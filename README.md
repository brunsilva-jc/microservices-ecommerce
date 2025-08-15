# Microservices E-commerce Platform

A modern, scalable e-commerce platform built with microservices architecture using Node.js, Koa, MongoDB, and Docker.

## 🏗️ Architecture

This platform follows a microservices architecture pattern with the following services:

- **API Gateway** - Central entry point for all client requests
- **Auth Service** - Authentication and authorization (JWT, RBAC)
- **Product Service** - Product catalog management
- **Order Service** - Order processing and management
- **Cart Service** - Shopping cart functionality

## 🚀 Tech Stack

- **Backend Framework**: Koa.js with TypeScript
- **Database**: MongoDB 7.0
- **Caching**: Redis 7.0
- **Containerization**: Docker & Docker Compose
- **Testing**: Jest with MongoDB Memory Server
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet.js, JWT, bcrypt
- **CI/CD**: GitHub Actions

## 📋 Prerequisites

- Node.js 20+
- Docker & Docker Compose
- MongoDB (for local development without Docker)
- Redis (for local development without Docker)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/brunsilva-jc/ecommerce-platform.git
cd ecommerce-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## 🐳 Running with Docker

Start all services:
```bash
docker-compose up -d
```

Stop all services:
```bash
docker-compose down
```

View logs:
```bash
docker-compose logs -f [service-name]
```

## 💻 Local Development

### Running individual services:

Auth Service:
```bash
npm run dev:auth
```

Product Service:
```bash
npm run dev:product
```

API Gateway:
```bash
npm run dev:gateway
```

## 🧪 Testing

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run tests in watch mode:
```bash
npm run test:watch
```

## 📚 API Documentation

Once the services are running, Swagger documentation is available at:

- Auth Service: http://localhost:3001/swagger
- Product Service: http://localhost:3002/swagger
- API Gateway: http://localhost:3000/swagger

## 🔐 Security Features

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Security headers with Helmet.js
- Input validation with Joi
- MongoDB injection prevention

## 📦 Project Structure

```
ecommerce-platform/
├── services/              # Microservices
│   ├── auth/             # Authentication service
│   ├── product/          # Product catalog service
│   ├── order/            # Order management service
│   ├── cart/             # Shopping cart service
│   └── gateway/          # API Gateway
├── shared/               # Shared code and types
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Shared utilities
├── infrastructure/       # Infrastructure configuration
│   ├── docker/          # Docker configurations
│   ├── k8s/             # Kubernetes manifests
│   └── scripts/         # Utility scripts
├── docs/                # Documentation
├── docker-compose.yml   # Docker Compose configuration
└── package.json         # Root package.json
```

## 🚦 Health Checks

Each service exposes health check endpoints:

- `/health` - Basic health check
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe (checks DB connections)

## 🔄 CI/CD Pipeline

The project uses GitHub Actions for CI/CD with the following stages:

1. **Test** - Run linting and tests
2. **Build** - Build Docker images
3. **Deploy** - Deploy to staging/production (configure as needed)

## 📝 Environment Variables

Key environment variables:

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/ecommerce
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- Bruno Silva

## 🙏 Acknowledgments

- Built with Koa.js framework
- Inspired by microservices best practices
- Uses MongoDB for flexible data modeling