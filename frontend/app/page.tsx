'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  CheckCircle,
  Zap,
  Shield,
  Palette,
  ArrowRight,
  Github,
  Twitter,
  Sparkles,
} from 'lucide-react';

// =============================================================================
// Animation Variants
// =============================================================================

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// =============================================================================
// Components
// =============================================================================

function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-foreground">TaskFlow</span>
          </Link>

          {/* Navigation - Hidden on mobile */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
          </nav>

          {/* Auth Buttons & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle variant="dropdown" />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register" className="hidden sm:block">
              <Button size="sm" iconTrailing={<ArrowRight className="w-4 h-4" />}>
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Solid Dark Background with subtle glow accents */}
      <div className="absolute inset-0 -z-10 bg-background">
        {/* Subtle glow accents - less prominent in dark mode */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary-500/10 dark:bg-primary-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary-500/10 dark:bg-secondary-500/5 rounded-full blur-[120px]" />
        {/* Grid pattern overlay for dark mode */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] dark:opacity-100 opacity-0" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="space-y-8"
        >
          {/* Badge */}
          <motion.div variants={staggerItem} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Beautifully crafted task management</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={staggerItem}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight px-2"
          >
            <span className="text-foreground">Manage tasks with</span>
            <br />
            <span className="bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              elegance & simplicity
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={staggerItem}
            className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground"
          >
            The beautiful, modern way to organize your work and life.
            Stay focused, get more done, and enjoy the process.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/register">
              <Button size="lg" iconTrailing={<ArrowRight className="w-5 h-5" />}>
                Get Started Free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </motion.div>

          {/* Social Proof */}
          <motion.p
            variants={staggerItem}
            className="text-sm text-muted-foreground"
          >
            Join thousands of productive users
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built with Next.js for blazing fast performance. Your tasks load instantly.',
  },
  {
    icon: Shield,
    title: 'Secure by Design',
    description: 'JWT authentication with user isolation. Your data is always protected.',
  },
  {
    icon: Palette,
    title: 'Beautiful UI',
    description: 'Glassmorphism effects, smooth animations, and dark mode support.',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2
            variants={staggerItem}
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
          >
            Everything you need
          </motion.h2>
          <motion.p
            variants={staggerItem}
            className="max-w-2xl mx-auto text-lg text-muted-foreground"
          >
            Powerful features to help you stay organized and focused on what matters.
          </motion.p>
        </motion.div>

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={staggerItem}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: 'spring' as const, stiffness: 300 }}
              className="group p-8 rounded-2xl bg-card border border-border shadow-md hover:border-primary-400 hover:shadow-xl transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-primary-500/25">
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary-500 to-secondary-600 p-8 sm:p-12 md:p-16 text-center"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to get organized?
            </h2>
            <p className="max-w-xl mx-auto text-base sm:text-lg text-white/80 mb-6 sm:mb-8 px-4">
              Start managing your tasks today. It&apos;s free and takes less than a minute to sign up.
            </p>
            <Link href="/register">
              <Button
                variant="secondary"
                size="lg"
                className="bg-white text-primary-600 hover:bg-white/90"
                iconTrailing={<ArrowRight className="w-5 h-5" />}
              >
                Create Free Account
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-8 sm:py-12 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-foreground">TaskFlow</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
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

        <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} TaskFlow. Built for Panaversity Hackathon Phase II.</p>
        </div>
      </div>
    </footer>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function LandingPage() {
  return (
    <main id="main-content" className="min-h-screen" role="main">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <CTASection />
      <Footer />

      {/* CSS for gradient animation */}
      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          animation: gradient 6s ease infinite;
        }
      `}</style>
    </main>
  );
}
