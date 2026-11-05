import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, MousePointer2, Play, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

const tickets = [
  { title: 'The sound', color: 'violet', object: 'headphones', number: '01' },
  { title: 'Movie night', color: 'coral', object: 'projector', number: '02' },
  { title: 'The sync', color: 'lime', object: 'screens', number: '03' },
] as const;

export function CinemaHero() {
  const [demo, setDemo] = useState<'idle' | 'aligning' | 'synced'>('idle');

  useEffect(() => {
    if (demo !== 'aligning') return;
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200;
    const timeout = window.setTimeout(() => setDemo('synced'), delay);
    return () => window.clearTimeout(timeout);
  }, [demo]);

  return (
    <section className="cinema-hero" aria-labelledby="cinema-title">
      <div className="cinema-hero-copy">
        <h1 id="cinema-title">Watch movies with friends</h1>
        <p className="cinema-intro">Everyone opens their own copy of the video. SyncWatch keeps playback in sync.</p>
        <div className="cinema-actions">
          <Link className="cinema-button cinema-button-primary" to="/dashboard?mode=create">Create a room <ArrowUpRight size={18} /></Link>
          <Link className="cinema-button cinema-button-secondary" to="/dashboard?mode=join">Join with a code</Link>
        </div>
      </div>

      <div className="cinema-stage" data-demo={demo}>
        {demo === 'idle' ? (
          <div className="cinema-fan" aria-hidden="true">
            {tickets.map(ticket => (
              <div className={`cinema-ticket cinema-ticket-${ticket.color}`} key={ticket.number}>
                <span className="cinema-ticket-number">SW / {ticket.number}</span>
                <strong>{ticket.title}</strong>
                <div className={`cinema-object cinema-object-${ticket.object}`}><i /><i /><i /></div>
                <span className="cinema-ticket-stub">ADMIT YOUR CREW <b>✦</b></span>
              </div>
            ))}
          </div>
        ) : (
          <div className="cinema-demo">
            {['Your screen', 'Friend’s screen'].map((label, index) => (
              <div className="cinema-demo-player" key={label}>
                <div className="cinema-demo-scene" aria-hidden="true"><span>✦</span></div>
                <div className="cinema-demo-progress" data-offset={index === 1}><span /></div>
                <div className="cinema-demo-label">
                  <span>{label}</span>
                  <time>{demo === 'synced' || index === 0 ? '00:12' : '00:09'}</time>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="cinema-friends" aria-hidden="true">
          {['Sam', 'Pam'].map(name => (
            <div className="cinema-friend" key={name}>
              <MousePointer2 size={23} strokeWidth={1.8} />
              <span>{name}</span>
            </div>
          ))}
        </div>
        <div className="cinema-demo-controls">
          <button className="cinema-button cinema-button-demo" type="button"
            disabled={demo === 'aligning'} onClick={() => setDemo(demo === 'synced' ? 'idle' : 'aligning')}>
            {demo === 'synced' ? <RotateCcw size={16} /> : <Play size={16} />}
            {demo === 'idle' ? 'Try the sync demo' : demo === 'aligning' ? 'Aligning playheads…' : 'Back to tickets'}
          </button>
          <p className="cinema-demo-status" role="status">
            {demo === 'synced' && <><Check size={16} /> Both screens in sync</>}
          </p>
        </div>
      </div>
    </section>
  );
}
