import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Power,
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  Server,
  Database,
  Code2,
  ShieldAlert,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface StartupScreenProps {
  onStart: () => void;
  loading: boolean;
  progress: {
    docker: 'idle' | 'running' | 'done' | 'error';
    database: 'idle' | 'running' | 'done' | 'error';
    api: 'idle' | 'running' | 'done' | 'error';
  };
  error: string | null;
}

const STEPS = [
  { key: 'docker' as const, label: 'Docker Engine', icon: Server },
  { key: 'database' as const, label: 'Database', icon: Database },
  { key: 'api' as const, label: 'API Server', icon: Code2 },
];

function StatusIcon({ status }: { status: 'idle' | 'running' | 'done' | 'error' }) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-orange-500" />;
    case 'running':
      return <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />;
    default:
      return <Circle className="w-5 h-5 text-muted-foreground/30" />;
  }
}

function StatusLabel({ status }: { status: 'idle' | 'running' | 'done' | 'error' }) {
  switch (status) {
    case 'done':
      return <span className="text-emerald-400 text-xs font-mono">READY</span>;
    case 'error':
      return <span className="text-orange-500 text-xs font-mono">ERROR</span>;
    case 'running':
      return <span className="text-orange-400 text-xs font-mono">...</span>;
    default:
      return <span className="text-muted-foreground/30 text-xs font-mono">--</span>;
  }
}

function GridOverlay() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 opacity-[0.03]">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute top-0 bottom-0 w-px bg-orange-400"
            style={{ left: `${(i / 40) * 100}%` }}
          />
        ))}
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute left-0 right-0 h-px bg-orange-400"
            style={{ top: `${(i / 25) * 100}%` }}
          />
        ))}
      </div>
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent"
        initial={{ top: '-2px' }}
        animate={{ top: '100%' }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
    </div>
  );
}

export function StartupScreen({ onStart, loading, progress, error }: StartupScreenProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const doneCount = STEPS.filter((s) => progress[s.key] === 'done').length;
  const errorCount = STEPS.filter((s) => progress[s.key] === 'error').length;
  const progressPercent = Math.round(((doneCount + errorCount) / STEPS.length) * 100);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-white overflow-hidden">
      <GridOverlay />

      <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-orange-500/20" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-orange-500/20" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-orange-500/20" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-orange-500/20" />

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-md px-4">
        <div className="flex flex-col items-center space-y-6">
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: mounted ? 1 : 0, scale: mounted ? 1 : 0.9 }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute -inset-8 rounded-full bg-orange-500/10 blur-3xl opacity-50" />
            <img
              src="/edugame-logo.png"
              alt="EDUGAME DIGITAL"
              className="w-64 h-auto relative z-10 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]"
            />
            {!loading && (
              <motion.div
                className="absolute -inset-4 rounded-xl border border-emerald-500/10"
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </motion.div>

          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 font-mono text-[10px] tracking-[0.2em] px-4">
            EDUGAME ENGINE V0.3.1
          </Badge>
        </div>

        <div className="mt-12 w-full max-w-xs">
          <AnimatePresence mode="wait">
            {!loading && !error && (
              <motion.div
                key="start-button"
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Button
                  size="lg"
                  onClick={onStart}
                  className={cn(
                    'relative px-12 py-7 text-sm font-mono font-bold tracking-[0.3em]',
                    'bg-zinc-900 border border-orange-500/40 text-orange-400',
                    'hover:bg-orange-500 hover:text-white hover:border-orange-400',
                    'shadow-[0_0_30px_rgba(249,115,22,0.1)]',
                    'transition-all duration-500 uppercase rounded-none'
                  )}
                >
                  <Power className="w-5 h-5 mr-3" />
                  POWER ON
                </Button>
                <p className="mt-4 text-[10px] text-zinc-500 font-mono tracking-widest animate-pulse">
                  CONNECTING…
                </p>
              </motion.div>
            )}

            {loading && !error && (
              <motion.div key="progress" className="w-full space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                    INITIALIZING
                  </span>
                  <span className="text-[10px] text-orange-400 font-mono">{progressPercent}%</span>
                </div>

                <div className="space-y-2">
                  {STEPS.map((step, i) => (
                    <motion.div
                      key={step.key}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 border transition-all duration-500',
                        progress[step.key] !== 'idle' ? 'border-orange-500/20 bg-orange-500/[0.02]' : 'border-zinc-800/50'
                      )}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <StatusIcon status={progress[step.key]} />
                      <span className={cn('flex-1 text-[11px] font-mono tracking-wide', progress[step.key] === 'idle' ? 'text-zinc-600' : 'text-zinc-300')}>
                        {step.label}
                      </span>
                      <StatusLabel status={progress[step.key]} />
                    </motion.div>
                  ))}
                </div>

                <div className="h-[2px] w-full bg-zinc-900 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-orange-600 to-emerald-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div key="error" className="w-full border border-orange-950 bg-orange-950/20 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-orange-500" />
                  <span className="text-xs font-bold text-orange-400 font-mono">ERROR</span>
                </div>
                <p className="text-[11px] text-orange-200/60 font-mono leading-relaxed">{error}</p>
                <Button variant="outline" size="sm" onClick={onStart} className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
                  RETRY
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full flex items-center justify-between px-8 py-6 border-t border-zinc-900 bg-black/40 backdrop-blur-sm">
        <span className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase">Autor: Lic. Joel Salazar Ramírez</span>
        <span className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase hidden md:block">edugame.digital</span>
        <span className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase">© 2026 EDUGAME DIGITAL · MÉXICO</span>
      </div>
    </div>
  );
}
