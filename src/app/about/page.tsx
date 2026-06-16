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

const NOW_ITEMS = [
  { k: 'Location', v: 'Tokyo, Japan' },
  { k: 'Doing',    v: 'CS exchange at Aoyama Gakuin University' },
  { k: 'Reading',  v: '红楼梦 — the book most deserving of over-interpretation' },
  { k: 'Watching', v: 'Portrait of a Lady on Fire' },
  { k: 'Building', v: 'This website' },
];

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/jujuz455' },
  { label: 'Email',  href: 'mailto:zhaorunchen0624@gmail.com' },
];

export default function About() {
  const hero    = useFadeIn(80);
  const bio     = useFadeIn(500);
  const now     = useFadeIn(820);
  const stats   = useFadeIn(1050);
  const contact = useFadeIn(1250);

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

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        minHeight: '88vh',
        padding: '2.2rem 8vw 3.5rem',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        {/* top bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          opacity: hero ? 1 : 0, transition: 'opacity 0.6s ease',
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

        {/* name — large, two-line, asymmetric */}
        <div style={{
          opacity: hero ? 1 : 0,
          transform: hero ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 1s ease 0.25s, transform 1s ease 0.25s',
          userSelect: 'none',
        }}>
          <div style={{ fontFamily: 'var(--font-cinzel), serif', fontWeight: 600, lineHeight: 0.85 }}>
            <div style={{
              fontSize: 'clamp(60px, 11.5vw, 168px)',
              color: '#D4A843',
              textShadow: '0 0 100px rgba(212,168,67,0.18)',
              letterSpacing: '-0.01em',
            }}>
              RUNCHEN
            </div>
            <div style={{
              fontSize: 'clamp(60px, 11.5vw, 168px)',
              color: 'transparent',
              WebkitTextStroke: '1.5px rgba(212,168,67,0.42)',
              letterSpacing: '-0.01em',
              marginLeft: 'clamp(52px, 9vw, 130px)',
            }}>
              ZHAO
            </div>
          </div>
          <p style={{
            fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase',
            color: '#6A90A8', marginTop: '1.6rem', marginLeft: '3px',
          }}>
            CS · AI & ML · Robotics
          </p>
        </div>

        {/* bottom rule */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(to right, rgba(212,168,67,0.45), rgba(212,168,67,0.06) 55%, transparent)',
          opacity: hero ? 1 : 0, transition: 'opacity 1.1s ease 0.55s',
        }} />
      </section>

      {/* ── BIO ──────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '7rem 8vw 7rem',
        display: 'grid',
        gridTemplateColumns: '36% 1fr',
        gap: '7vw',
        alignItems: 'start',
      }}>
        {/* pull quote — left, sticky */}
        <div style={{
          position: 'sticky', top: '5rem',
          opacity: bio ? 1 : 0,
          transform: bio ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 0.9s ease, transform 0.9s ease',
        }}>
          <p style={{
            fontFamily: 'var(--font-cinzel), serif',
            fontSize: 'clamp(15px, 1.8vw, 22px)',
            fontStyle: 'italic',
            color: 'rgba(212,168,67,0.75)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            "the gaze that examines<br />and the gaze that sees"
          </p>
          <div style={{ marginTop: '1.4rem', width: '28px', height: '1px', background: 'rgba(212,168,67,0.38)' }} />
        </div>

        {/* body — right, offset down */}
        <div style={{
          paddingTop: '2.5rem',
          opacity: bio ? 1 : 0,
          transform: bio ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 0.9s ease 0.18s, transform 0.9s ease 0.18s',
        }}>
          <p style={{ fontSize: '15px', lineHeight: 2.0, color: '#A8BCC8', margin: '0 0 1.8rem' }}>
            I build things at the intersection of{' '}
            <span style={{ color: '#D4A843' }}>data, AI, and the web</span>{' '}
            — and I believe the best way to understand the world is to move through it.
            I grew up across multiple countries, studied computer science, and somehow ended up
            doing scuba diving in Okinawa, climbing Mt. Fuji alone, and watching a volcano erupt
            in Iceland on the same exchange year.
          </p>
          <p style={{ fontSize: '15px', lineHeight: 2.0, color: '#A8BCC8', margin: 0 }}>
            My work lives at the edge where rigorous systems meet human experience.
            I'm acutely aware of how people look at things — and I've learned to tell
            the difference between the gaze that examines and the gaze that sees.
            That distinction matters to me in everything I build.
          </p>
        </div>
      </section>

      {/* ── NOW STRIP ────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(212,168,67,0.1)',
        borderBottom: '1px solid rgba(212,168,67,0.1)',
        background: 'rgba(212,168,67,0.018)',
        padding: '3rem 8vw',
        opacity: now ? 1 : 0,
        transition: 'opacity 0.8s ease',
      }}>
        <p style={{
          fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase',
          color: 'rgba(212,168,67,0.38)', margin: '0 0 2rem',
        }}>
          NOW
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          overflowX: 'auto',
        }}>
          {NOW_ITEMS.map(({ k, v }, i) => (
            <div key={k} style={{
              paddingRight: '1.5rem',
              borderRight: i < NOW_ITEMS.length - 1 ? '1px solid rgba(212,168,67,0.08)' : 'none',
              paddingLeft: i > 0 ? '1.5rem' : 0,
              opacity: now ? 1 : 0,
              transform: now ? 'translateY(0)' : 'translateY(10px)',
              transition: `opacity 0.6s ease ${i * 90}ms, transform 0.6s ease ${i * 90}ms`,
            }}>
              <p style={{
                fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'rgba(212,168,67,0.38)', margin: '0 0 0.55rem',
              }}>
                {k}
              </p>
              <p style={{ fontSize: '12px', color: '#B8C8D4', lineHeight: 1.65, margin: 0 }}>
                {v}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '7rem 8vw 6rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
      }}>
        {[
          { n: '24', label: 'places on the map', align: 'left'   as const },
          { n: '8+', label: 'countries',          align: 'center' as const },
          { n: '∞',  label: 'curiosity',           align: 'right'  as const },
        ].map(({ n, label, align }, i) => (
          <div key={n} style={{
            textAlign: align,
            opacity: stats ? 1 : 0,
            transform: stats ? 'translateY(0)' : 'translateY(20px)',
            transition: `opacity 0.8s ease ${i * 130}ms, transform 0.8s ease ${i * 130}ms`,
          }}>
            <div style={{
              fontFamily: 'var(--font-cinzel), serif',
              fontWeight: 600,
              fontSize: 'clamp(52px, 9vw, 128px)',
              color: '#D4A843',
              lineHeight: 1,
              textShadow: '0 0 70px rgba(212,168,67,0.22)',
            }}>
              {n}
            </div>
            <p style={{
              fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'rgba(200,214,224,0.35)', margin: '0.7rem 0 0',
            }}>
              {label}
            </p>
          </div>
        ))}
      </section>

      {/* ── CONTACT ──────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '2.5rem 8vw 5rem',
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
