'use client';

import Link from 'next/link';
import { CheckCircle, Github, Twitter } from 'lucide-react';

// =============================================================================
// Dashboard Footer Component
// =============================================================================

interface FooterProps {
  variant?: 'landing' | 'app';
  className?: string;
}

export function Footer({ variant = 'app', className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  if (variant === 'app') {
    return (
      <footer className={`py-6 border-t border-border ${className || ''}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-sm text-foreground">TaskFlow</span>
            </div>

            {/* Links */}
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Help
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
            </nav>

            {/* Copyright */}
            <p className="text-xs text-muted-foreground">
              &copy; {currentYear} TaskFlow
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // Landing page footer (full version)
  return (
    <footer className={`py-12 border-t border-border ${className || ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-foreground">TaskFlow</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </nav>

          {/* Social */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} TaskFlow. Built for Panaversity Hackathon Phase II.</p>
        </div>
      </div>
    </footer>
  );
}
