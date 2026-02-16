"use client";

import { motion } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SplineScene from "@/components/SplineScene";
import CloudBackground from "@/components/CloudBackground";
import GlossyButton from "@/components/GlossyButton";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";



const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden relative">
      <CloudBackground />

      {/* ========== Navbar ========== */}
      <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-6">
        <div className="max-w-7xl w-full h-16 glass-premium glass-liquid rounded-full flex items-center justify-between px-8 shadow-2xl">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white drop-shadow-md">
              Career<span className="text-indigo-300">OS</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              How it Works
            </a>
            <a href="#testimonials" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              Testimonials
            </a>
          </div>

          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                  Log in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <GlossyButton variant="liquid" className="h-10 px-6 text-sm">
                  Sign Up <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </GlossyButton>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="text-sm font-medium text-white/70 hover:text-white transition-colors mr-2">
                Dashboard
              </Link>
              <UserButton 
                afterSignOutUrl="/" 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-9 h-9 border border-white/20"
                  }
                }}
              />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* ========== Hero Section ========== */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-40 w-80 h-80 bg-purple-100/30 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/2 w-60 h-60 bg-blue-100/20 rounded-full blur-3xl" />
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
                <span key={i} className="text-reveal-char" style={{ animationDelay: `${i * 0.03}s` }}>
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300">
                {"Intelligently".split("").map((char, i) => (
                  <span key={i} className="text-reveal-char" style={{ animationDelay: `${(i + 13) * 0.03}s` }}>
                    {char === " " ? "\u00A0" : char}
                  </span>
                ))}
              </span>
              <br />
              {"Guided by AI".split("").map((char, i) => (
                <span key={i} className="text-reveal-char" style={{ animationDelay: `${(i + 26) * 0.03}s` }}>
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeUp}
              className="text-xl sm:text-2xl text-white/70 max-w-2xl mx-auto mb-12 leading-relaxed font-medium"
            >
              The intelligent career copilot. CareerOS conducts AI interviews, 
              parses resumes, and simulates your growth trajectory.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <SignedOut>
                <SignUpButton mode="modal">
                  <GlossyButton variant="liquid" className="h-16 px-12 text-xl">
                    Start AI Analysis <Bot className="w-5 h-5 ml-2" />
                  </GlossyButton>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <GlossyButton variant="liquid" className="h-16 px-12 text-xl" asChild>
                  <Link href="/dashboard/chat">
                    Start AI Analysis <Bot className="w-5 h-5 ml-2" />
                  </Link>
                </GlossyButton>
              </SignedIn>
              
              <Button
                variant="ghost"
                size="lg"
                className="text-white hover:bg-white/10 h-16 px-12 text-xl font-medium border border-white/10 backdrop-blur-sm rounded-full"
                asChild
              >
                <Link href="/dashboard">
                  Explore Dashboard
                </Link>
              </Button>
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
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
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

          {/* Hero Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
            className="mt-20 max-w-5xl mx-auto"
          >
            <div className="glass-card rounded-3xl p-2 shadow-2xl shadow-indigo-200/40 bg-[#07072E] border-0 overflow-hidden">
               <div className="h-[600px] w-full relative">
                  <SplineScene />
                  <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end pointer-events-none">
                    <div className="space-y-1">
                      <p className="text-white/40 text-xs font-mono tracking-widest uppercase">System Status</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-white text-sm font-medium">Core Intelligence Online</span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-white/40 text-xs font-mono tracking-widest uppercase">Visualization</p>
                      <p className="text-white text-sm font-medium">Career Trajectory 3.0</p>
                    </div>
                  </div>
               </div>
            </div>
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
            <motion.p variants={fadeUp} className="text-sm font-medium text-indigo-500 mb-3">
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
                icon: Bot,
                title: "AI Career Agent",
                description:
                  "Conversational AI conducts structured career interviews and generates personalized analysis with role recommendations.",
                color: "#6366f1",
                bg: "bg-indigo-50",
              },
              {
                icon: FileText,
                title: "Resume Intelligence",
                description:
                  "Upload your resume for AI-powered parsing, skill extraction, ATS scoring, and improvement recommendations.",
                color: "#a855f7",
                bg: "bg-purple-50",
              },
              {
                icon: Briefcase,
                title: "Smart Job Matching",
                description:
                  "Aggregates jobs from LinkedIn, Indeed, and Naukri, then ranks them using semantic similarity with your profile.",
                color: "#10b981",
                bg: "bg-emerald-50",
              },
              {
                icon: BarChart3,
                title: "Career Simulations",
                description:
                  "Interactive salary projections, market demand charts, and risk indicators to visualize your career trajectory.",
                color: "#f59e0b",
                bg: "bg-amber-50",
              },
              {
                icon: Target,
                title: "Skill Gap Analysis",
                description:
                  "Identify missing skills for your target roles and get a step-by-step learning roadmap with resource suggestions.",
                color: "#f43f5e",
                bg: "bg-rose-50",
              },
              {
                icon: TrendingUp,
                title: "Career Roadmaps",
                description:
                  "AI-generated career progression paths with timelines, milestones, and actionable steps for each career goal.",
                color: "#06b6d4",
                bg: "bg-cyan-50",
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="glass-card rounded-2xl p-6 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300 group cursor-default"
              >
                <div
                  className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
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
      <section id="how-it-works" className="py-24 px-6 bg-gradient-to-b from-transparent via-indigo-50/30 to-transparent">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.p variants={fadeUp} className="text-sm font-medium text-indigo-500 mb-3">
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
                title: "Talk to AI",
                description:
                  "Start a conversation with our AI agent. It asks intelligent questions about your skills, experience, and goals.",
                icon: Bot,
              },
              {
                step: "02",
                title: "Upload Resume",
                description:
                  "Upload your resume for AI parsing. Get ATS scores, skill extraction, and personalized improvement tips.",
                icon: FileText,
              },
              {
                step: "03",
                title: "Get Matched",
                description:
                  "Browse semantically matched jobs from top platforms, view salary simulations, and follow your career roadmap.",
                icon: Briefcase,
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                className="text-center"
              >
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="absolute inset-0 bg-indigo-100 rounded-2xl rotate-6" />
                  <div className="relative w-full h-full bg-white rounded-2xl border border-indigo-100 flex items-center justify-center shadow-sm">
                    <item.icon className="w-7 h-7 text-indigo-500" />
                  </div>
                </div>
                <div className="text-xs font-mono text-indigo-400 mb-2">
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
            <motion.p variants={fadeUp} className="text-sm font-medium text-indigo-500 mb-3">
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
            viewport={{ once: true }}
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
                variants={fadeUp}
                className="glass-card rounded-2xl p-6"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-5">
                  &ldquo;{testimonial.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-medium">
                    {testimonial.name.split(" ").map(n => n[0]).join("")}
                  </div>
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
      <section className="py-20 px-6 bg-gradient-to-b from-transparent via-indigo-50/30 to-transparent">
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
            className="glass-card rounded-3xl p-12 gradient-border"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Ready to accelerate your career?
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Join thousands of professionals using AI to make smarter career decisions.
              Start your free analysis today.
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-200/50 border-0 h-12 px-8 text-base"
              asChild
            >
              <Link href="/dashboard/chat">
                Start Free Analysis <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ========== Footer ========== */}
      <footer className="border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900">
                Career<span className="gradient-text">OS</span>
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
