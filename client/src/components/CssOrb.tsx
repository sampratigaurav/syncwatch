export default function CssOrb() {
  return (
    <div className="w-full h-full min-h-[300px] relative flex items-center justify-center overflow-hidden">
      {/* 
        To avoid layout recalculation (CLS/Repaint), we only animate transform and opacity.
        We use tailwind's animate-spin, but we can slow it down heavily with custom durations. 
      */}
      <div 
        className="w-[250px] h-[250px] rounded-full blur-[60px] opacity-60 mix-blend-screen"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(45, 212, 191, 0.8), rgba(15, 118, 110, 0.4), transparent 70%)',
          animation: 'spin 15s linear infinite',
          willChange: 'transform, opacity'
        }}
      />
      <div 
        className="absolute w-[200px] h-[200px] rounded-full blur-[40px] opacity-40 mix-blend-screen"
        style={{
          background: 'radial-gradient(circle at 70% 70%, rgba(20, 184, 166, 0.9), transparent 60%)',
          animation: 'spin 10s linear infinite reverse',
          willChange: 'transform, opacity'
        }}
      />
      <div 
        className="absolute w-[150px] h-[150px] rounded-full blur-[30px] opacity-70"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.15), transparent 50%)',
          animation: 'pulse 4s ease-in-out infinite',
          willChange: 'transform, opacity'
        }}
      />
    </div>
  );
}
