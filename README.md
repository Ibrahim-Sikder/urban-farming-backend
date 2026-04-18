###  Urban Farming Platform API

> **Production-Ready Backend for an Interactive Urban Farming Ecosystem**  
> Built with scalability, performance, and real-world architecture in mind.

---

##  What This Project Solves 

###  Solution

A unified platform where users can:

-  Rent farming spaces  
-  Buy & sell organic produce  
-  Track plant growth in real-time  
-  Share knowledge via community  
-  Verify sustainability certifications  

---

##  Key Features

-  JWT Authentication + Role-based access
-  Vendor marketplace & product management
-  Farm rental booking system
-  Real-time plant tracking (Socket.IO)
-  Community forum system
-  Sustainability certification workflow
-  Redis caching + rate limiting
-  Benchmark & performance tracking

---

## System Design Philosophy

This project is built with:

- Modular architecture (feature-based)
- Scalable API design
- Consistent response structure
- Production-ready patterns


---

##  Tech Stack

| Layer        | Technology |
|-------------|-----------|
| Backend     | Node.js, Express, TypeScript |
| Database    | PostgreSQL + Prisma |
| Cache       | Redis |
| Realtime    | Socket.IO |
| Auth        | JWT |
| Validation  | Zod |


---
##  Quick Start

```bash
git clone https://github.com/Ibrahim-Sikder/urban-farming-backend
cd urban-farming-backend

npm install
cp .env.example .env

npx prisma migrate dev
npm run seed

npm run dev
