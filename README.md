# Kirsh Vault

A collection management system with offline storage capabilities, built with modern web technologies.

🚀 **Live Demo**: [Application](https://kirshway.github.io/kirsh_vault/)

## Features

- **Offline Support**: Store your collection items locally using IndexedDB
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Animations**: Smooth transitions and interactions
- **Modern UI**: Clean and intuitive interface
- **Pagination**: Efficient browsing through large collections
- **Search & Filtering**: Find items quickly by name, category, or rating
- **Category Management**: Organize items by books, movies, games, and more
- **Comprehensive Testing**: Robust test coverage for components and functionality

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/)
- **Forms**: [React Hook Form](https://react-hook-form.com/)
- **Notifications**: [React Hot Toast](https://react-hot-toast.com/)
- **Testing**: [Vitest](https://vitest.dev/) and [Testing Library](https://testing-library.com/)
- **Runtime**: [Bun](https://bun.sh/) for fast development and testing

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

### Testing

Run the tests with:

```bash
# Run tests
bun run test

# Run tests with coverage
bun run test:coverage

# Run tests in watch mode
bun run test:watch
```

### Building for Production

```bash
# Build the application
bun run build

# Start production server
bun run start
```

## Application Features

### Main Collection View

- View all your collection items with pagination
- Search and filter by various criteria
- Add, edit, or delete items

### Category Pages

- Browse items by specific categories
- Filtered views for books, movies, games, etc.
- Category-specific display options

### Item Management

- Create detailed entries with descriptions and ratings
- Expand items to see full details
- Quick edit and delete functionality

## Project Structure

- `/app` - Next.js app router components and pages
- `/components` - Reusable UI components
  - `/ui` - Generic UI components based on shadcn/ui
  - `/templates` - Page layout templates
- `/lib` - Utilities, database configuration, and context providers
  - `/context` - React context providers
  - `/hooks` - Custom React hooks for data and UI logic
  - `/db` - Database configuration and operations
- `/public` - Static assets
- `/types` - TypeScript type definitions

## Performance Optimizations

- Pagination for efficient data loading and rendering
- Optimized IndexedDB queries for faster data retrieval
- Lazy loading of components to reduce initial load time
- Debounced search to prevent excessive database queries

## Deployment

This project is configured to deploy automatically to GitHub Pages using GitHub Actions workflow. Any push to the main branch will trigger a new build and deployment.

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Ensure tests pass (`bun run test`)
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request
