'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function useFadeIn(delay = 0) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVis(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return vis;
}

function Ann({ children, note }: { children: React.ReactNode; note: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ borderBottom: '1px dotted rgba(212,168,67,0.6)', color: '#C8A266', cursor: 'default' }}
      >
        {children}
      </span>
      {show && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 10px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(4,10,22,0.98)',
          border: '1px solid rgba(212,168,67,0.28)',
          padding: '0.5rem 1rem',
          fontSize: '11px',
          color: '#8AAABB',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 200,
          fontStyle: 'italic',
          letterSpacing: '0.03em',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          lineHeight: 1.5,
        }}>
          ↳ {note}
        </span>
      )}
    </span>
  );
}

function EntryRule() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', margin: '4rem 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(212,168,67,0.18), rgba(212,168,67,0.04))' }} />
      <span style={{ fontSize: '8px', color: 'rgba(212,168,67,0.3)', letterSpacing: '0.3em' }}>◆</span>
    </div>
  );
}

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/jujuz455' },
  { label: 'Email',  href: 'mailto:zhaorunchen0624@gmail.com' },
];

export default function About() {
  const nav     = useFadeIn(80);
  const heading = useFadeIn(200);
  const entries = useFadeIn(500);
  const contact = useFadeIn(800);

  return (
    <main style={{
      minHeight: '100vh',
      background: '#080C14',
      color: '#C8D6E0',
      fontFamily: 'var(--font-geist-sans), sans-serif',
      overflowX: 'hidden',
      position: 'relative',
    }}>

      {/* background grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage:
          'linear-gradient(rgba(212,168,67,0.022) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(212,168,67,0.022) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* top nav */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '2.2rem 8vw 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        opacity: nav ? 1 : 0, transition: 'opacity 0.6s ease',
      }}>
        <Link href="/" style={{
          fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'rgba(212,168,67,0.5)', textDecoration: 'none',
        }}>
          ← Home
        </Link>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(212,168,67,0.35)', margin: 0 }}>FIELD NOTES</p>
          <p style={{ fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(212,168,67,0.35)', margin: 0 }}>EXPLORER ON RECORD</p>
        </div>
      </div>

      {/* ── UNFILTERED THOUGHTS ───────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '6rem 8vw 5rem',
        opacity: heading ? 1 : 0,
        transform: heading ? 'translateY(0)' : 'translateY(22px)',
        transition: 'opacity 1s ease 0.2s, transform 1s ease 0.2s',
      }}>
        <div style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontWeight: 600,
          lineHeight: 0.88,
          userSelect: 'none',
        }}>
          <div style={{
            fontSize: 'clamp(48px, 8.5vw, 124px)',
            color: '#D4A843',
            letterSpacing: '-0.01em',
            textShadow: '0 0 80px rgba(212,168,67,0.15)',
          }}>
            UNFILTERED
          </div>
          <div style={{
            fontSize: 'clamp(48px, 8.5vw, 124px)',
            color: 'transparent',
            WebkitTextStroke: '1.5px rgba(212,168,67,0.38)',
            letterSpacing: '-0.01em',
            marginLeft: 'clamp(40px, 7vw, 108px)',
          }}>
            THOUGHTS
          </div>
        </div>
        <p style={{
          fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase',
          color: '#6A90A8', margin: '1.8rem 0 0 3px',
        }}>
          ramblings · field entries · things I can't stop thinking about
        </p>
        <div style={{ marginTop: '1.4rem', width: '40px', height: '1px', background: 'rgba(212,168,67,0.35)' }} />
      </section>

      {/* ── FIELD ENTRIES ─────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '5rem 8vw 6rem',
        borderTop: '1px solid rgba(212,168,67,0.08)',
        opacity: entries ? 1 : 0,
        transition: 'opacity 1s ease',
      }}>

        {/* ─ Entry 001 ─ */}
        <div style={{
          display: 'grid', gridTemplateColumns: '36% 1fr', gap: '7vw',
          opacity: entries ? 1 : 0,
          transform: entries ? 'translateY(0)' : 'translateY(22px)',
          transition: 'opacity 0.9s ease 0.1s, transform 0.9s ease 0.1s',
        }}>
          <div style={{ paddingTop: '0.2rem' }}>
            <p style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '9px', letterSpacing: '0.22em', color: 'rgba(212,168,67,0.32)', margin: '0 0 0.7rem' }}>
              [ ENTRY 001 ]
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(200,214,224,0.3)', margin: '0 0 0.25rem', letterSpacing: '0.08em' }}>Wherever I find it</p>
            <p style={{ fontSize: '10px', color: 'rgba(200,214,224,0.2)', margin: 0, letterSpacing: '0.08em' }}>2024 —</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(212,168,67,0.4)', margin: '0 0 1.2rem' }}>
              On over-reading
            </p>
            <p style={{ fontSize: '15px', lineHeight: 2.05, color: '#A8BCC8', margin: 0 }}>
              <Ann note="Dream of the Red Chamber — 18th century Chinese classic">红楼梦</Ann>
              {' '}is one of those rare books that rewards{' '}
              <Ann note="this website included">over-interpretation</Ann>
              . Every re-reading surfaces another layer — the footnotes become more interesting
              than the main text. I think the books worth returning to are the ones you{' '}
              <Ann note="I've read it three times. Still lost.">can never quite finish</Ann>.
            </p>
          </div>
        </div>

        <EntryRule />

        {/* ─ Entry 002 ─ */}
        <div style={{
          display: 'grid', gridTemplateColumns: '36% 1fr', gap: '7vw',
          opacity: entries ? 1 : 0,
          transform: entries ? 'translateY(0)' : 'translateY(22px)',
          transition: 'opacity 0.9s ease 0.25s, transform 0.9s ease 0.25s',
        }}>
          <div style={{ paddingTop: '0.2rem' }}>
            <p style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '9px', letterSpacing: '0.22em', color: 'rgba(212,168,67,0.32)', margin: '0 0 0.7rem' }}>
              [ ENTRY 002 ]
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(200,214,224,0.3)', margin: '0 0 0.25rem', letterSpacing: '0.08em' }}>Ottawa, Canada</p>
            <p style={{ fontSize: '10px', color: 'rgba(200,214,224,0.2)', margin: 0, letterSpacing: '0.08em' }}>2025</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(212,168,67,0.4)', margin: '0 0 1.2rem' }}>
              On building living machines
            </p>
            <p style={{ fontSize: '15px', lineHeight: 2.05, color: '#A8BCC8', margin: 0 }}>
              I got into robotics because of{' '}
              <Ann note="Yes, really. Unit 01 is the reason.">Neon Genesis Evangelion</Ann>
              . My Rover club has four divisions and I can't stop mapping them onto a human body.
              Software is the{' '}
              <Ann note="still debugging that part">spirit</Ann>
              . Mechanics is the body. Electronics are the blood vessels and nervous system.
              And science — the theoretical layer — is{' '}
              <Ann note="the division nobody fully understands, which seems right">consciousness</Ann>
              . When you frame it that way, building a robot starts to feel less like engineering
              and more like something else entirely.
            </p>
          </div>
        </div>

        <EntryRule />

        {/* ─ Entry 003 ─ */}
        <div style={{
          display: 'grid', gridTemplateColumns: '36% 1fr', gap: '7vw',
          opacity: entries ? 1 : 0,
          transform: entries ? 'translateY(0)' : 'translateY(22px)',
          transition: 'opacity 0.9s ease 0.4s, transform 0.9s ease 0.4s',
        }}>
          <div style={{ paddingTop: '0.2rem' }}>
            <p style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '9px', letterSpacing: '0.22em', color: 'rgba(212,168,67,0.32)', margin: '0 0 0.7rem' }}>
              [ ENTRY 003 ]
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(200,214,224,0.3)', margin: '0 0 0.25rem', letterSpacing: '0.08em' }}>Tokyo, Japan</p>
            <p style={{ fontSize: '10px', color: 'rgba(200,214,224,0.2)', margin: 0, letterSpacing: '0.08em' }}>2025</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(212,168,67,0.4)', margin: '0 0 1.2rem' }}>
              On becoming a 高級外人
            </p>
            <p style={{ fontSize: '15px', lineHeight: 2.05, color: '#A8BCC8', margin: 0 }}>
              A classmate called me{' '}
              <Ann note="high-class foreigner — I'll take it">高級外人</Ann>
              {' '}after I said I liked Noh. I thought that was funny.
              Noh appeals to me because it's profoundly{' '}
              <Ann note="a masked performer who barely moves but says everything">eerie</Ann>
              {' '}— in a way that even Kabuki isn't. Compared to Peking Opera, which is spectacular
              and loud and expressive, Noh is the thing happening in the margins.
              I've always been more interested in{' '}
              <Ann note="see also: watching a volcano, solo travel, this whole website">the margins</Ann>.
            </p>
          </div>
        </div>

        <EntryRule />

        {/* ─ Entry 004 ─ */}
        <div style={{
          display: 'grid', gridTemplateColumns: '36% 1fr', gap: '7vw',
          opacity: entries ? 1 : 0,
          transform: entries ? 'translateY(0)' : 'translateY(22px)',
          transition: 'opacity 0.9s ease 0.55s, transform 0.9s ease 0.55s',
        }}>
          <div style={{ paddingTop: '0.2rem' }}>
            <p style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '9px', letterSpacing: '0.22em', color: 'rgba(212,168,67,0.32)', margin: '0 0 0.7rem' }}>
              [ ENTRY 004 ]
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(200,214,224,0.3)', margin: '0 0 0.25rem', letterSpacing: '0.08em' }}>Beijing, China</p>
            <p style={{ fontSize: '10px', color: 'rgba(200,214,224,0.2)', margin: 0, letterSpacing: '0.08em' }}>2025</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(212,168,67,0.4)', margin: '0 0 1.2rem' }}>
              On disappearing into a crowd
            </p>
            <p style={{ fontSize: '15px', lineHeight: 2.05, color: '#A8BCC8', margin: 0 }}>
              Whenever I'm in China, I feel my{' '}
              <Ann note="not in a bad way. more like: dissolved.">presence thin out</Ann>
              . I become part of the collective — one face in a current of faces —
              and there's something both peaceful and{' '}
              <Ann note="the kind of unsettling you sit with rather than escape">unsettling</Ann>
              {' '}about that. I think about how if something happened to me here,
              it would scroll past someone else's screen as{' '}
              <Ann note="and they'd keep scrolling">a three-second news item</Ann>
              . I don't think that's a tragedy. I think it's just the honest texture
              of existing inside something much larger than yourself.
            </p>
          </div>
        </div>

      </section>

      {/* ── CONTACT ──────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '2.5rem 8vw 4rem',
        borderTop: '1px solid rgba(212,168,67,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: contact ? 1 : 0,
        transition: 'opacity 0.8s ease',
      }}>
        <div style={{ display: 'flex', gap: '0.7rem' }}>
          {LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '0.55rem 1.25rem',
                border: '1px solid rgba(212,168,67,0.25)',
                color: '#D4A843', textDecoration: 'none',
                fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
                transition: 'background 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(212,168,67,0.08)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,168,67,0.5)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,168,67,0.25)';
              }}
            >
              {label} ↗
            </a>
          ))}
        </div>
        <p style={{
          fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase',
          color: 'rgba(212,168,67,0.18)', margin: 0,
        }}>
          RUNCHEN ZHAO · 2026
        </p>
      </section>

    </main>
  );
}
