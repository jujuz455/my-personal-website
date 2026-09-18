'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { SCENES } from '@/components/exploded/scenes';

const ExplodedDiagram = dynamic(() => import('@/components/exploded/ExplodedDiagram'), { ssr: false });

function useFadeIn(delay = 0) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVis(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return vis;
}

function EntryRule() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', margin: '4.5rem 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(212,168,67,0.18), rgba(212,168,67,0.04))' }} />
      <span style={{ fontSize: '8px', color: 'rgba(212,168,67,0.3)', letterSpacing: '0.3em' }}>◆</span>
    </div>
  );
}

type Project = {
  title: string;
  context: string;
  year: string;
  stack: string[];
  body: string[];
  diagram: string;
  diagramCaption: string;
};

const PROJECTS: Project[] = [
  {
    title: 'ROS 2 Video Streaming Node',
    context: 'Planetary Rover',
    year: '2025',
    stack: ['C++', 'ROS 2', 'GStreamer', 'H.265', 'SRT / RTP'],
    body: [
      'Live video is the operator’s window into the rover. The problem was that every off-the-shelf streaming tool runs as its own process. You can’t start it, watch it, or change its settings through ROS 2, so the rest of our software had no control over the one feed the driver depends on.',
      'So I wrote a C++ ROS 2 node that owns the GStreamer pipeline itself. The chain is simple: a capture source feeding x265enc, then a muxer or RTP payloader, then srtsink for SRT or udpsink for RTP. I went with H.265 because our wireless link is tight and shared with telemetry. At the same visual quality it needs roughly 40 to 50 percent less bitrate than H.264, and that margin is the difference between a usable feed and a frozen one. SRT handles long distance and flaky links. RTP is for low latency when we’re close.',
      'The node exposes services to start, stop, and reconfigure the stream, and publishes status topics. Video became a normal part of the stack instead of a fragile side process.',
    ],
    diagram: '/projects/01-ros2-video-streaming.svg',
    diagramCaption: 'Camera → GStreamer pipeline inside the ROS 2 node → SRT/RTP → ground station. Pulse: the H.265 stream leaving the pipeline',
  },
  {
    title: 'Adaptive Network Resilience',
    context: 'Planetary Rover',
    year: '2025',
    stack: ['I-frame recovery', 'Exponential backoff', 'Dynamic bitrate'],
    body: [
      'When the rover moves, the wireless link drops packets. Each lost packet breaks the prediction chain between frames, and the driver’s screen either freezes or turns into blocks until the next keyframe shows up. I wanted that gap closed automatically.',
      'I built a small control loop around the link. A monitor watches the SRT statistics and raises a loss event when loss crosses a threshold. Three things respond. The receiver asks for an I-frame so the decoder can resync right away. A backoff timer spaces those requests out, doubling the wait each time loss keeps coming. And a bitrate controller turns the encoder down. The backoff matters more than it sounds. I-frames are several times bigger than normal frames, and if every loss event fired a fresh request, the recovery traffic itself would choke a link that was already struggling.',
      'Bitrate drops fast when loss rises and climbs back slowly once the monitor sees a clean stretch. The stream settles at whatever the link can actually carry at that moment.',
    ],
    diagram: '/projects/02-adaptive-resilience.svg',
    diagramCaption: 'Closed feedback ring. Pulse: one full circuit per beat, quickening as it closes back on the monitor',
  },
  {
    title: 'GPS RTCM Serial Refactor',
    context: 'Planetary Rover',
    year: '2025',
    stack: ['C++', 'Threading', 'Serial I/O', 'RTCM'],
    body: [
      'Our GPS correction data (RTCM) came in through a busy-wait loop. The main loop kept polling the serial port whether or not any bytes were waiting, and it stalled whenever a read blocked. On the rover’s small onboard computer that spinning ate CPU the other processes needed, and their timing got jittery.',
      'I moved the serial I/O into its own thread. That thread does a blocking read, so it sleeps in the kernel until data arrives and costs nothing while idle. It parses the RTCM frames and pushes finished messages into a thread-safe queue. The main thread pops from that queue when it wants to and never touches the port.',
      'CPU load went down once the polling was gone, and the subsystems sharing the processor ran on steadier timing. Small change, big difference in how the whole rover behaved.',
    ],
    diagram: '/projects/03-gps-rtcm-threading.svg',
    diagramCaption: 'Before: one thread spinning on the port. After: blocking I/O thread + queue hand-off. Pulse: the queue only',
  },
  {
    title: 'Real-Time SRT Telemetry Pipeline',
    context: 'Planetary Rover',
    year: '2025',
    stack: ['Python', 'SRT stats API', 'ROS 2'],
    body: [
      'SRT keeps good statistics about the link: round-trip time, estimated bandwidth, and packet-loss counters. They just sit inside the socket unless something pulls them out, and during a mission nobody has time to go looking.',
      'I wrote a Python service that polls the socket’s stats API on a fixed interval. Each tick reads the counters, diffs them against the last sample to get rates, works out the loss percentage, and packages RTT, bandwidth, and loss into one timestamped message. That message goes out on a ROS 2 topic, so any node on the rover or any dashboard at the ground station can subscribe.',
      'The value is in the timing. Loss usually starts climbing a few seconds before the picture visibly degrades. Seeing it move gives the operator time to slow down, drop bitrate, or reposition before the feed is gone.',
    ],
    diagram: '/projects/04-srt-telemetry-dashboard.svg',
    diagramCaption: 'Live diagnostics as three engraved dials. Only Packet Loss lights on the beat',
  },
  {
    title: 'Dual-Output Camera + WebRTC Mosaic',
    context: 'Planetary Rover',
    year: '2025',
    stack: ['WebRTC', 'Video compositing', 'Multi-camera'],
    body: [
      'One video feed can’t serve everyone. The driver needs a single low-latency view with nothing competing for bandwidth, because every extra frame of delay shows up as overshoot in the controls. Everyone else wants to see all the cameras at once and doesn’t mind a bit of lag.',
      'I designed the pipeline to capture and encode each camera once, then split after that. Path A is the operator stream, straight to a low-latency transport. Path B goes into a mosaic compositor that tiles however many feeds are live into a grid. The grid size comes from the feed count: columns are the ceiling of the square root of N, rows are N divided by columns rounded up. Two feeds give 2 by 1, four give 2 by 2, five give 3 by 2 with one empty tile. It re-tiles on the fly as cameras join or drop.',
      'The mosaic goes out over WebRTC for two reasons. ICE handles NAT traversal, so remote viewers connect without any network setup, and browsers play it natively. Anyone with the link can watch every camera at once. No plugin, no client install.',
    ],
    diagram: '/projects/05-dual-output-webrtc.svg',
    diagramCaption: 'One capture stage, two outputs. Pulse: born at the fork, runs both arms at once',
  },
  {
    title: 'Phoenix Current Control: Grip Path',
    context: 'Planetary Rover',
    year: '2025',
    stack: ['Phoenix API', 'Motor control', 'Manipulator'],
    body: [
      'A motor controller can regulate position, velocity, or current. Current is the interesting one for a gripper, because torque is proportional to current, so commanding current is really commanding force. A gripper under position or velocity control keeps driving after it touches something. It either crushes the sample or stalls the motor and cooks the windings.',
      'Our Phoenix controller logic on the grip path wasn’t handling current mode properly. The mode was selected but the closed-loop configuration and limits never got applied, so the gripper wasn’t actually force-limited. I fixed the setup order so the current-mode gains and peak limit are configured before the path is enabled, and made sure setpoints go out in the right units.',
      'I validated it on the bench with current-draw measurements: close the gripper on an instrumented block, log commanded versus measured current, and check that the measured current rises to the limit and flattens there instead of spiking past it.',
    ],
    diagram: '/projects/06-phoenix-current-control.svg',
    diagramCaption: 'Control modes, and the current curve. Pulse: climbs the ribbon, is clamped flat at the limit plane',
  },
  {
    title: 'Automated Test & Build Pipeline',
    context: 'Rover Software Team',
    year: '2025',
    stack: ['GitHub Actions', 'Docker', 'CI/CD'],
    body: [
      'Environment drift is the quiet killer on a student robotics team. A dozen laptops and the rover’s onboard computer each end up with slightly different ROS 2 patch versions, compilers, and system packages, and eventually code that builds on one machine fails on another for no obvious reason.',
      'I containerized the build with Docker and wired it into GitHub Actions. The image pins everything that used to drift: the ROS 2 distribution, the C++ toolchain, and every system and Python dependency. The same image runs on contributors’ machines, in CI, and on the rover. Every push and pull request spins it up and runs the build, then the unit tests, then lint. Any failure blocks the merge and pings the author.',
      'For a small team the payoff is very practical. The “works on my machine” arguments mostly went away, regressions get caught before they reach the rover, and onboarding a new member is now install Docker and pull one image.',
    ],
    diagram: '/projects/07-ci-cd-pipeline.svg',
    diagramCaption: 'Push → containerized build → tests → lint → pass gate. Pulse: the successful run, every time',
  },
  {
    title: 'PoseSync 3D',
    context: 'AI / ML · Computer Vision',
    year: '2025',
    stack: ['Python', 'Flask', 'YOLOv8', 'MediaPipe', 'SQLite3', 'Three.js'],
    body: [
      'PoseSync 3D turns a raw video stream into a live 3D scene in the browser. Frames come in through a Flask ingest service and go to inference, where two models run together. YOLOv8 finds and boxes the people and objects in the frame. MediaPipe runs on each person crop and returns the fine-grained pose landmarks that YOLOv8 doesn’t give you. One answers where the subjects are, the other answers how each body is articulated, and I merge them into a single detection record per frame.',
      'Inference is heavy, so it can’t sit on the ingest path. I put an asynchronous priority task queue between them. Frames keep arriving at full rate, live work goes to the front, batch jobs go to the back, and the ingest loop never blocks. Results land in SQLite3 under a normalized schema: sessions, frames, detections, and per-joint coordinates in separate related tables instead of one wide blob, indexed so range and per-entity queries stay fast as the dataset grows.',
      'The Three.js frontend subscribes to new results and updates the scene in place. It moves existing joints instead of rebuilding anything, which is what keeps the 3D view running at interactive framerates with low latency.',
    ],
    diagram: '/projects/08-posesync3d.svg',
    diagramCaption: 'Ingest → YOLOv8 + MediaPipe → priority queue → SQLite → live viewer. Pulse: the hand-off that keeps compute off the live path',
  },
];

function ProjectEntry({ p, index, show }: { p: Project; index: number; show: boolean }) {
  const delay = 0.5 + index * 0.15;
  return (
    <div style={{
      opacity: show ? 1 : 0,
      transform: show ? 'translateY(0)' : 'translateY(22px)',
      transition: `opacity 0.9s ease ${delay}s, transform 0.9s ease ${delay}s`,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '36% 1fr', gap: '7vw' }}>
        <div style={{ paddingTop: '0.2rem' }}>
          <p style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '9px', letterSpacing: '0.22em', color: 'rgba(212,168,67,0.32)', margin: '0 0 0.7rem' }}>
            [ PROJECT {String(index + 1).padStart(3, '0')} ]
          </p>
          <p style={{ fontSize: '10px', color: 'rgba(200,214,224,0.3)', margin: '0 0 0.25rem', letterSpacing: '0.08em' }}>{p.context}</p>
          <p style={{ fontSize: '10px', color: 'rgba(200,214,224,0.2)', margin: '0 0 1.2rem', letterSpacing: '0.08em' }}>{p.year}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {p.stack.map(s => (
              <span key={s} style={{
                fontFamily: 'var(--font-geist-mono)', fontSize: '8px', letterSpacing: '0.1em',
                color: 'rgba(138,170,187,0.55)', border: '1px solid rgba(212,168,67,0.14)',
                padding: '0.2rem 0.5rem',
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(212,168,67,0.4)', margin: '0 0 1.2rem' }}>
            {p.title}
          </p>
          {p.body.map((para, i) => (
            <p key={i} style={{ fontSize: '14px', lineHeight: 1.95, color: '#A8BCC8', margin: i === 0 ? 0 : '1.1rem 0 0' }}>
              {para}
            </p>
          ))}
        </div>
      </div>

      {/* diagram: living exploded assembly, one cinnabar pulse on the critical path */}
      <div style={{ margin: '2.4rem 0 0' }}>
        <div style={{
          border: '1px solid rgba(237,228,207,0.22)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(0,0,0,0.6)',
          background: '#1B1922',
        }}>
          <ExplodedDiagram spec={SCENES[index]} label={`${p.title}: animated exploded diagram`} />
        </div>
        <p style={{
          fontFamily: 'var(--font-geist-mono)', fontSize: '9px', letterSpacing: '0.14em',
          color: 'rgba(200,214,224,0.28)', margin: '0.7rem 0 0', textAlign: 'center',
        }}>
          FIG. {String(index + 1).padStart(2, '0')} · {p.diagramCaption}
        </p>
      </div>
    </div>
  );
}

export default function Projects() {
  const nav     = useFadeIn(80);
  const heading = useFadeIn(200);
  const entries = useFadeIn(500);
  const footer  = useFadeIn(900);

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
          <p style={{ fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(212,168,67,0.35)', margin: 0 }}>BUILD LOG</p>
          <p style={{ fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(212,168,67,0.35)', margin: 0 }}>THINGS I&apos;VE SHIPPED</p>
        </div>
      </div>

      {/* ── HEADING ─────────────────────────────────────────────── */}
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
            THINGS
          </div>
          <div style={{
            fontSize: 'clamp(48px, 8.5vw, 124px)',
            color: 'transparent',
            WebkitTextStroke: '1.5px rgba(212,168,67,0.38)',
            letterSpacing: '-0.01em',
            marginLeft: 'clamp(40px, 7vw, 108px)',
          }}>
            I&apos;VE BUILT
          </div>
        </div>
        <p style={{
          fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'rgba(138,170,187,0.5)', margin: '2.5rem 0 0',
        }}>
          Rover systems · Video pipelines · Computer vision
        </p>
      </section>

      {/* ── ENTRIES ─────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 8vw 6rem' }}>
        {PROJECTS.map((p, i) => (
          <div key={p.title}>
            {i > 0 && <EntryRule />}
            <ProjectEntry p={p} index={i} show={entries} />
          </div>
        ))}
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '0 8vw 5rem',
        opacity: footer ? 1 : 0, transition: 'opacity 1s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(212,168,67,0.18), rgba(212,168,67,0.04))' }} />
          <span style={{ fontSize: '8px', color: 'rgba(212,168,67,0.3)', letterSpacing: '0.3em' }}>◆</span>
        </div>
        <p style={{
          fontFamily: 'var(--font-geist-mono)', fontSize: '9px', letterSpacing: '0.22em',
          color: 'rgba(212,168,67,0.28)', margin: '2rem 0 0',
        }}>
          [ END OF LOG · MORE UNDER CONSTRUCTION ]
        </p>
      </section>
    </main>
  );
}
