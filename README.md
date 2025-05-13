<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

# Skill Exchange Platform 

This is the backend API for the **Skill Exchange Platform**, a web application that enables users to teach, learn, and exchange skills through a secure and dynamic system.

Developed as part of the coursework at **Esprit School of Engineering**, this project showcases a scalable and well-structured backend built using the **NestJS framework** and **PostgreSQL** database.

---

## 🚀 Overview

The backend serves as the core engine for managing authentication, user profiles, skill listings, messaging, session scheduling, and rating systems. It follows RESTful principles and provides a clean API for the frontend to interact with.

---

## 🌟 Features

- 🔐 **Authentication & Authorization** (JWT-based)
- 👤 **User & Profile Management**
- 🎓 **Skills & Categories CRUD**
- 💬 **Messaging System** (Socket.io ready)
- 📅 **Session Scheduling**
- ⭐ **Reputation & Ratings**
- 🧾 **Admin Panel Endpoints**
- 📦 **Dockerized** for easy deployment
- 🧪 **Test Coverage** using Jest

---

## 🛠️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + Bcrypt
- **Validation**: class-validator
- **Documentation**: Swagger
- **Environment**: Docker + Docker Compose

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/skill-exchange-2025/skill-exchange-api.git
cd skill-exchange-api
```

### 2. Set Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/skill_exchange
JWT_SECRET=your_jwt_secret
PORT=4000
```

### 3. Install Dependencies

```bash
yarn
```

### 4. Run Migrations

```bash
npx prisma migrate dev
```

### 5. Start the App

```bash
yarn start:dev
```

### 6. Open Swagger Docs

Visit: [http://localhost:4000/api](http://localhost:4000/api)

---

## 🐳 Docker Support

```bash
docker-compose up --build
```

---

## 🔑 Keywords

- `nestjs`
- `api`
- `backend`
- `typescript`
- `postgresql`
- `prisma`
- `authentication`
- `web-development`
- `skill-exchange`
- `Esprit School of Engineering`

---

## 📂 Project Structure

```
src/
├── auth/
├── users/
├── skills/
├── feedback/
├── marketplace/
├── sessions/
├── messages/
├── common/
├── config/
├── prisma/
└── main.ts
```

---

## 🤝 Contributing

We welcome contributions!

```bash
# Fork, clone, and set up your environment
git checkout -b feature/MyFeature
# Make your changes and commit
git commit -m "Add MyFeature"
# Push and open a pull request
```

---

## 🧪 Testing

```bash
yarn test
```

---

## 📜 License

This project is licensed under the MIT License.

---

## 🎓 Acknowledgments

- **Esprit School of Engineering** for academic guidance
- The NestJS and open-source communities
- All contributors involved in the backend system design

> 💡 *This backend was built as part of a full-stack project for the “Full-Stack Web Development” course at Esprit School of Engineering.*

