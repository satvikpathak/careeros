"use client";

import { motion, Variants } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  FileText,
  BarChart3,
  Briefcase,
  Sparkles,
  Zap,
  Globe,
  ChevronRight,
  Star,
  Users,
  TrendingUp,
  Target,
  Rocket,
} from "lucide-react";
import CloudBackground from "@/components/CloudBackground";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import AppNavbar from "@/components/navigation/AppNavbar";



const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  },
};

const revealChar: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(12px)" },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.03, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const buttonVariants: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.03, y: -2, transition: { type: "spring", stiffness: 400, damping: 10 } },
  tap: { scale: 0.97 },
};

const cardVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  hover: { y: -8, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.1)", transition: { type: "spring", stiffness: 400, damping: 17 } },
};

export default function LandingPage() {
  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it Works" },
    { href: "#testimonials", label: "Testimonials" },
  ];

  return (
    <div className="min-h-screen overflow-hidden relative">
      <CloudBackground />
      <AppNavbar
        links={navLinks}
        rightSlot={(
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-1 text-sm font-semibold text-gray-800 transition-colors hover:text-black">
                  Log in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedOut>
              <SignUpButton mode="modal">
                <span className="inline-flex h-10 items-center justify-center rounded-md bg-black px-4 text-sm font-semibold text-white shadow-md transition hover:shadow-lg">
                  Sign Up
                </span>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="mr-2 text-sm font-semibold text-gray-800 transition-colors hover:text-black">
                Dashboard
              </Link>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-9 h-9 border border-gray-200"
                  }
                }}
              />
            </SignedIn>
          </div>
        )}
      />

      {/* ========== Hero Section ========== */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              x: [0, 20, 0],
              y: [0, -20, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-black/10 blur-3xl" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, -30, 0],
              y: [0, 30, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-20 -left-40 w-80 h-80 rounded-full bg-black/10 blur-3xl" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.15, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/3 left-1/2 w-60 h-60 rounded-full bg-black/10 blur-3xl" 
          />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9] mb-8 drop-shadow-2xl"
            >
              {"Your Career,".split("").map((char, i) => (
                <motion.span
                  key={i}
                  custom={i}
                  variants={revealChar}
                  initial="hidden"
                  animate="visible"
                  className="inline-block"
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
              <br />
              <span className="bg-linear-to-r from-[#b7beff] via-[#ad9df6] to-[#8fb7ff] bg-clip-text text-transparent">
                {"Intelligently".split("").map((char, i) => (
                  <motion.span
                    key={i}
                    custom={i + 13}
                    variants={revealChar}
                    initial="hidden"
                    animate="visible"
                    className="inline-block"
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </span>
              <br />
              {"Guided by AI".split("").map((char, i) => (
                <motion.span
                  key={i}
                  custom={i + 26}
                  variants={revealChar}
                  initial="hidden"
                  animate="visible"
                  className="inline-block"
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeUp}
              className="text-xl sm:text-2xl text-black/70 max-w-2xl mx-auto mb-12 leading-relaxed font-medium"
            >
              The AI career execution engine. CareerOS conducts readiness audits, 
              generates weekly execution sprints, and builds your portfolio blueprints.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <SignedOut>
                <SignUpButton mode="modal">
                  <motion.button 
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    className="inline-flex h-16 items-center justify-center rounded-xl bg-black px-12 text-lg sm:text-xl font-semibold text-white shadow-lg shadow-black/30 transition hover:shadow-black/40"
                  >
                    Get Your Readiness Score <Target className="w-5 h-5 ml-2" />
                  </motion.button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Link
                    href="/dashboard"
                    className="inline-flex h-16 items-center justify-center rounded-xl bg-black px-12 text-lg sm:text-xl font-semibold text-white shadow-lg shadow-black/30 transition hover:shadow-black/40"
                  >
                    Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </motion.div>
              </SignedIn>

              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Link
                  href="/dashboard/chat"
                  className="inline-flex h-16 items-center justify-center rounded-xl border border-black/15 bg-white px-12 text-lg sm:text-xl font-semibold text-gray-900 shadow-md shadow-black/10 transition hover:border-black/25"
                >
                  Try Placement Mode
                </Link>
              </motion.div>
            </motion.div>


            {/* Social proof */}
            <motion.div
              variants={fadeUp}
              className="flex items-center justify-center gap-6 mt-12 text-sm text-gray-400"
            >
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>10,000+ users</span>
              </div>
              <div className="w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-yellow-500 text-gray-500" />
                ))}
                <span className="ml-1">4.9/5</span>
              </div>
              <div className="w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                <span>50+ countries</span>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ========== Logos / Trust Bar ========== */}
      <section className="py-16 px-6 border-t border-gray-100/50">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-8">
            Trusted by professionals at leading companies
          </p>
          <div className="flex items-center justify-center gap-12 opacity-30 flex-wrap">
            {["Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix"].map((company) => (
              <span key={company} className="text-lg font-semibold text-gray-400 tracking-tight">
                {company}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ========== Features Section ========== */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.p variants={fadeUp} className="mb-3 text-sm font-medium text-gray-600">
              FEATURES
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need for your career
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 max-w-xl mx-auto">
              A complete AI-powered career intelligence suite that helps you navigate
              every step of your professional journey.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
          >
            {[
              {
                icon: Target,
                title: "Intelligence Audit",
                description:
                  "Quantified readiness score based on deep AI analysis of your resume and GitHub profile complexity.",
                color: "#111111",
                bg: "bg-zinc-100",
              },
              {
                icon: Zap,
                title: "Weekly AI Sprints",
                description:
                  "5 actionable tasks every week designed to close your specific skill gaps and build your portfolio.",
                color: "#1f1f1f",
                bg: "bg-zinc-100",
              },
              {
                icon: Rocket,
                title: "Project Builder",
                description:
                  "Portfolio-grade project blueprints with architecture diagrams, tech stacks, and resume bullet points.",
                color: "#2d2d2d",
                bg: "bg-zinc-100",
              },
              {
                icon: TrendingUp,
                title: "Market Radar",
                description:
                  "Real-time demand analysis for tech stacks in your target role, helping you stay ahead of hiring trends.",
                color: "#2a2a2a",
                bg: "bg-zinc-100",
              },
              {
                icon: Bot,
                title: "Placement Mode",
                description:
                  "Specialized interview preparation for Indian tech companies with DSA topic heatmaps and HR prep.",
                color: "#0f0f0f",
                bg: "bg-zinc-100",
              },
              {
                icon: Briefcase,
                title: "Job Matching 2.0",
                description:
                  "Aggregates matching jobs and ranks them by semantic similarity to your latest career audit results.",
                color: "#333333",
                bg: "bg-zinc-100",
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover="hover"
                className="glass-card rounded-2xl p-6 transition-all duration-300 group cursor-default"
              >
                <div
                  className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center mb-4 transition-transform duration-300`}
                >
                  <feature.icon className="w-5 h-5" style={{ color: feature.color }} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========== How It Works ========== */}
  <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.p variants={fadeUp} className="mb-3 text-sm font-medium text-gray-600">
              HOW IT WORKS
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Three steps to your dream career
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1,
                transition: { staggerChildren: 0.2 }
              }
            }}
          >
            {[
              {
                step: "01",
                title: "Intelligence Audit",
                description:
                  "Upload your resume and GitHub to get your Career Readiness Score and detailed skill gap analysis.",
                icon: Target,
              },
              {
                step: "02",
                title: "Weekly AI Sprints",
                description:
                  "Execute your personalized 5-task sprint every week to close gaps and build your engineering presence.",
                icon: Zap,
              },
              {
                step: "03",
                title: "Placement Mode",
                description:
                  "Transition into hunt mode with company-specific prep, DSA frequency maps, and HR simulators.",
                icon: Rocket,
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                whileHover={{ y: -5 }}
                className="text-center group"
              >
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <motion.div 
                    whileHover={{ rotate: 12, scale: 1.1 }}
                    className="absolute inset-0 rounded-2xl bg-zinc-200 rotate-6 transition-transform" 
                  />
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="relative w-full h-full rounded-2xl border border-zinc-200 bg-white flex items-center justify-center shadow-sm"
                  >
                    <item.icon className="w-7 h-7 text-black group-hover:scale-110 transition-transform" />
                  </motion.div>
                </div>
                <div className="mb-2 text-xs font-mono text-gray-500">
                  STEP {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========== Testimonials ========== */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.p variants={fadeUp} className="mb-3 text-sm font-medium text-gray-600">
              TESTIMONIALS
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-gray-900">
              Loved by professionals
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {[
              {
                name: "Sarah Chen",
                role: "Software Engineer at Google",
                text: "CareerOS helped me identify skill gaps I didn't know I had. The AI interview felt like talking to a real career coach.",
              },
              {
                name: "Marcus Johnson",
                role: "Data Scientist at Meta",
                text: "The job matching is incredible. It found roles I wouldn't have discovered on my own, perfectly aligned with my skills.",
              },
              {
                name: "Priya Sharma",
                role: "Product Manager at Microsoft",
                text: "The salary simulation gave me confidence during negotiations. I secured a 20% higher offer thanks to the market data.",
              },
            ].map((testimonial) => (
              <motion.div
                key={testimonial.name}
                variants={cardVariants}
                whileHover="hover"
                className="glass-card rounded-2xl p-6"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-gray-500 text-gray-500" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-5">
                  &ldquo;{testimonial.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-medium text-white"
                  >
                    {testimonial.name.split(" ").map(n => n[0]).join("")}
                  </motion.div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========== Stats Section ========== */}
  <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              { value: "50K+", label: "Career analyses" },
              { value: "92%", label: "Match accuracy" },
              { value: "15K+", label: "Jobs matched" },
              { value: "4.9★", label: "User rating" },
            ].map((stat) => (
              <motion.div key={stat.label} variants={fadeUp} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========== CTA Section ========== */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div
            variants={fadeUp}
            className="glass-card relative overflow-hidden rounded-3xl border border-black/10 p-12"
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-black shadow-lg shadow-black/20"
            >
              <Sparkles className="w-7 h-7 text-white" />
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Ready to accelerate your career?
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Join thousands of professionals using AI to make smarter career decisions.
              Start your free analysis today.
            </p>
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="inline-block"
            >
              <Link
                href="/dashboard/chat"
                className="inline-flex h-14 items-center justify-center rounded-xl bg-black px-10 text-lg font-semibold text-white shadow-lg shadow-black/30 transition hover:shadow-black/40"
              >
                Start Free Analysis <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ========== Footer ========== */}
      <footer className="border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900">
                CareerOS
              </span>
            </div>

            <div className="flex items-center gap-8 text-sm text-gray-400">
              <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-gray-600 transition-colors">Contact</a>
            </div>

            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} CareerOS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
