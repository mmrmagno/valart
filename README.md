
# VALART - ASCII Art for Valorant Fans

<div align="center">
  <img src="public/favicon.svg" width="100" alt="Valart Logo">
</div>

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Uptime Status](https://uptime.marc-os.com/api/badge/13/status?style=for-the-badge)


A modern, Valorant-themed website for creating, sharing, and exploring ASCII art.

Try it out [here](https://val.marc-os.com)!

## ✨ Features

- 🖌️ ASCII art drawing tool with adjustable grid size and drawing modes
- 🖼️ Gallery of ASCII art
- 📋 Copy and download for created art
- 📤 Submission system for adding new art to the gallery

## 🛠️ Tech Stack

- Frontend: React, TypeScript, Styled Components
- Backend: Node.js, Express
- Email: Nodemailer
- Containerization: Docker, Docker Compose

## 🚀 Getting Started

### Prerequisites

- 🐳 Docker and Docker Compose

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mmrmagno/valart.git
   cd valart
   ```

2. Create a `.env` file based on the provided `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file with your email settings and other configuration.

4. Build and start the Docker container:
   ```bash
   docker-compose up -d
   ```

5. Configure Nginx Proxy Manager to forward traffic to the container:
   - Add a new proxy host in Nginx Proxy Manager
   - Set the domain name to your preferred domain
   - Set the scheme to `http`
   - Set the forward hostname/IP to `valart`
   - Set the forward port to `3001`
   - Enable SSL if desired

## 🎯 Usage

### Creating ASCII Art

1. Navigate to the "Create" page
2. Set your desired resolution and height using the controls
3. Choose between click or drag drawing mode
4. Create your ASCII art by clicking or dragging on the grid cells
5. Use the buttons below to copy, download, or submit your creation

### Submitting Art for the Gallery

1. After creating your ASCII art, fill in your name in the submission form
2. Click "Submit for Publication"
3. Your submission will be sent to the admin for review
4. If approved, it will be added to the gallery

## 👨‍💼 Administration

When a user submits ASCII art, an email will be sent to the admin email configured in the `.env` file. The email will contain:

- The author's name
- The ASCII art
- The grid size used

To add approved submissions to the gallery, you'll need to update the default examples in the code. (Will improve enventually)

## 📝 License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- 🎮 Inspired by the Valorant game by Riot Games
- 💡 Project inspired by [VALORANT-Oekaki-Chat](https://github.com/RUNFUNRUN/VALORANT-Oekaki-Chat)

## 🔧 Build Error Fix

If you encounter the following TypeScript error during build:

```
TS2339: Property 'value' does not exist on type 'ExecutionContext & FastOmit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, never>'.
    width: ${props => `${(props.value - 1) / 12 * 100}%`};
```

There are two ways to fix it:

### Option 1: Add TypeScript interfaces for styled components

Add proper type definitions for styled component props in `src/pages/CreatorPage.tsx`:

```typescript
interface SliderTrackProps {
  value: number;
  theme: any;
}

const SliderTrack = styled.div<SliderTrackProps>`
  // existing styling
`;

interface SliderTickProps {
  active: boolean;
  value: number;
  showLabel: boolean;
  theme: any;
}

const SliderTick = styled.div<SliderTickProps>`
  // existing styling
`;
```

### Option 2: Disable TypeScript checking for the file

Add `// @ts-nocheck` at the top of the `src/pages/CreatorPage.tsx` file:

```typescript
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
```

## 🏃‍♂️ Running the Application

1. Build and run the container:
```bash
docker compose down && docker compose up --build -d
```

2. Access the application at http://localhost:3000

## 📧 Email Notification

The application now includes email notification functionality. When submitting ASCII art, provide your email address to receive a confirmation notification.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://marc-os.com">Marc Magno</a></sub>
</div> 
