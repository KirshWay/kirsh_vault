# Kirsh Vault

A Progressive Web App (PWA) collection management system with offline storage capabilities, built with modern web technologies.

🚀 **Live Demo**: [https://kirshway.github.io/kirsh_vault/](https://kirshway.github.io/kirsh_vault/)

## Features

- **Offline Support**: Store your collection items locally using IndexedDB
- **PWA Ready**: Install on your device as a native-like app
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Animations**: Smooth transitions and interactions
- **Modern UI**: Clean and intuitive interface

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/)
- **Forms**: [React Hook Form](https://react-hook-form.com/)
- **Notifications**: [React Hot Toast](https://react-hot-toast.com/)

## Getting Started

### Development

First, run the development server:

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

```bash
# Build the application
bun run build

# Start production server
bun run start
```

## Project Structure

- `/app` - Next.js app router components and pages
- `/components` - Reusable UI components
- `/lib` - Utilities, database configuration, and context providers
- `/public` - Static assets including PWA icons and manifest
- `/types` - TypeScript type definitions

## PWA Features

The application works offline and can be installed on your device. It uses a service worker to cache assets and API responses, allowing for a seamless offline experience.

## Deployment

This project is configured to deploy automatically to GitHub Pages using GitHub Actions workflow. Any push to the main branch will trigger a new build and deployment.

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.
