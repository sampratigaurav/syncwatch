import { m, useReducedMotion } from 'framer-motion';
import { Check, FileVideo, Link2, Play } from 'lucide-react';
import './cinema-walkthrough.css';

const steps = [
  { id: 'invite', label: 'Invite', title: 'Get your friends in', copy: 'Create a room and share its link or code. Friends can join without an account.' },
  { id: 'file', label: 'Pick', title: 'Open your video', copy: 'Everyone picks a copy of the video from their own device. Your local file stays with you.' },
  { id: 'match', label: 'Match', title: 'Check that the files match', copy: 'SyncWatch compares the audio tracks, so copies with different resolutions can still work together.' },
  { id: 'watch', label: 'Play', title: 'Press play together', copy: 'When the host plays, pauses, or skips, playback follows across the room.' },
] as const;

const waveform = 'M0 20h12l5-8 7 17 8-25 8 31 8-25 7 15 6-5h12l5-8 8 17 8-24 8 28 7-19 6 6h13';

export function CinemaWalkthrough() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="cinema-walkthrough" id="how-it-works" aria-labelledby="cinema-walkthrough-title">
      <div className="cinema-walkthrough-heading">
        <h2 id="cinema-walkthrough-title">How it works</h2>
        <p>Four steps from the invite to the opening scene.</p>
      </div>
      <ol className="cinema-walkthrough-grid">
        {steps.map((step, index) => (
          <m.li key={step.id} data-step={step.id}
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: reducedMotion ? 0 : 0.38, delay: reducedMotion ? 0 : index * 0.055 }}>
            <div className="cinema-step-card">
              <div className="cinema-step-scene" aria-hidden="true">
                <span className="cinema-step-number">0{index + 1} / {step.label}</span>
                {step.id === 'invite' && (
                  <div className="cinema-step-illustration cinema-step-invite">
                    <span className="cinema-step-avatar">S</span>
                    <span className="cinema-step-ticket"><Link2 size={19} /> ROOM LINK</span>
                    <span className="cinema-step-avatar">P</span>
                  </div>
                )}
                {step.id === 'file' && (
                  <div className="cinema-step-illustration cinema-step-files">
                    <span className="cinema-step-file"><FileVideo size={23} /> 1080p</span>
                    <span className="cinema-step-file"><FileVideo size={23} /> 4K</span>
                  </div>
                )}
                {step.id === 'match' && (
                  <div className="cinema-step-illustration cinema-step-waves">
                    <svg viewBox="0 0 128 40"><path d={waveform} /></svg>
                    <svg viewBox="0 0 128 40"><path d={waveform} /></svg>
                    <Check className="cinema-step-check" size={21} />
                  </div>
                )}
                {step.id === 'watch' && (
                  <div className="cinema-step-illustration cinema-step-screens">
                    <div><Play size={18} fill="currentColor" /><span /></div>
                    <div><Play size={18} fill="currentColor" /><span /></div>
                  </div>
                )}
              </div>
              <div className="cinema-step-copy">
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </div>
            </div>
          </m.li>
        ))}
      </ol>
    </section>
  );
}
