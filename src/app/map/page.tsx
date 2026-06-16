'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const GlobeMap = dynamic(() => import('@/components/GlobeMap'), { ssr: false });

const topics = [
  {
    title: 'What does travel mean to me?',
    content: `The world is iterating fast. The scenery, my physical health, and mindset are all subject to change. I want to witness the world while I'm young.\n\nI prefer to step into the unknown and learn as I go, rather than trying to feel "well-prepared." In truth, I don't think I'll ever feel fully prepared for anything.\n\nReturning to the meaning of travel: it's about experiencing other ways of living and realizing that there are multiple ways of seeing the world. There isn't just one solution to life's challenges. As the saying goes, "There is nothing new under the sun" but in a different culture, life takes on a fresh perspective.\n\nI also love the feeling of being away from everything familiar, while still having the ability to navigate and resolve problems in random, troublesome situations.`,
  },
  {
    title: 'What do I gain from traveling?',
    content: `The more I travel, the more tolerant I become.\n\nUnderstanding cultures and the reasons underlying them is always fascinating. Even if the history I learn isn't 100% accurate, it's still captivating to hear stories about what happened even if they might be fabricated. Sometimes I find I'd rather remember the version that's more interesting (as long as it's not for an exam lol).\n\nThis perspective extends to my daily life. I've come to understand that people have their own limitations shaped by their upbringing and environment. There is no absolute "right" or "wrong," only different ways of thinking.\n\nThis has shaped my behavior: I now strive to understand and respect actions I might not personally agree with. Because everyone has different levels of awareness and different desires, I've learned to simply observe rather than actively interrupt or judge.`,
  },
];

function Sidebar() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <>
      {/* Invisible hover trigger strip on the right edge */}
      <div
        onMouseEnter={() => setOpen(true)}
        style={{
          position: 'fixed', right: 0, top: 0,
          width: '24px', height: '100%', zIndex: 200,
          cursor: 'pointer',
        }}
      />

      {/* Pull tab — visible when sidebar is closed */}
      <div
        onMouseEnter={() => setOpen(true)}
        style={{
          position: 'fixed', right: 0, top: '50%',
          transform: `translateY(-50%) translateX(${open ? '100%' : '0'})`,
          transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
          zIndex: 201,
          background: 'rgba(237,217,181,0.85)',
          backdropFilter: 'blur(6px)',
          border: '1px solid #C8A97A',
          borderRight: 'none',
          padding: '1.2rem 0.4rem',
          cursor: 'pointer',
          writingMode: 'vertical-rl',
          fontSize: '11px',
          letterSpacing: '0.12em',
          color: '#5C3417',
          fontFamily: 'var(--font-geist-sans), sans-serif',
          userSelect: 'none',
        }}
      >
        Thoughts
      </div>

      {/* Sidebar panel */}
      <div
        onMouseLeave={() => { setOpen(false); }}
        style={{
          position: 'fixed', right: 0, top: 0,
          width: '300px', height: '100%',
          background: 'rgba(237,217,181,0.95)',
          backdropFilter: 'blur(14px)',
          borderLeft: '1px solid #C8A97A',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.38s cubic-bezier(0.4,0,0.2,1)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          padding: '2.5rem 1.5rem 2rem',
          overflowY: 'auto',
          fontFamily: 'var(--font-geist-sans), sans-serif',
        }}
      >
        <p style={{ fontSize: '11px', letterSpacing: '0.15em', color: '#7A5235', marginBottom: '2rem', textTransform: 'uppercase' }}>
          all the pictures are original :D

        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {topics.map((topic, i) => (
            <div key={i} style={{ borderTop: '1px solid #C8A97A', paddingTop: '0' }}>
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '1rem 0', cursor: 'pointer', textAlign: 'left', gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '13px', color: '#2C1A0E', lineHeight: 1.4, fontWeight: 500 }}>
                  {topic.title}
                </span>
                <span style={{
                  fontSize: '18px', color: '#7A5235', lineHeight: 1,
                  transition: 'transform 0.2s',
                  transform: expanded === i ? 'rotate(45deg)' : 'rotate(0deg)',
                  flexShrink: 0, marginTop: '2px',
                }}>
                  +
                </span>
              </button>

              <div style={{
                overflow: 'hidden',
                maxHeight: expanded === i ? '800px' : '0',
                transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
              }}>
                <div style={{ paddingBottom: '1.2rem' }}>
                  {topic.content.split('\n\n').map((para, j) => (
                    <p key={j} style={{
                      fontSize: '12px', color: '#5C3417', lineHeight: 1.75,
                      marginBottom: j < topic.content.split('\n\n').length - 1 ? '0.9rem' : 0,
                    }}>
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #C8A97A' }} />
        </div>
      </div>
    </>
  );
}

export default function MapPage() {
  return (
    <main className="w-screen h-screen relative" style={{ background: '#070b18' }}>
      <Link
        href="/"
        style={{
          position: 'absolute', top: '1rem', left: '1rem', zIndex: 1000,
          background: 'rgba(244,232,208,0.12)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(200,169,122,0.4)', color: '#F4E8D0',
          padding: '0.4rem 1rem', fontSize: '13px',
          fontFamily: 'var(--font-geist-sans), sans-serif',
          textDecoration: 'none', letterSpacing: '0.03em',
        }}
      >
        ← Home
      </Link>

      <div style={{ width: '100%', height: '100%' }}>
        <GlobeMap />
      </div>

      <Sidebar />
    </main>
  );
}
