import { useEffect, useRef } from 'react';
import { audioEngine } from '@/audio/audioEngine';
import { usePlayerStore } from '@/store/playerStore';
import { useAnalyticsStore } from '@/store/analyticsStore';

export type VisualizerMode = 'bars' | 'waveform' | 'spectrum';

interface AudioVisualizerProps {
  mode?: VisualizerMode;
  className?: string;
  height?: number;
  barColor?: string;
}

export function AudioVisualizer({
  mode = 'bars',
  className = '',
  height = 80,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    useAnalyticsStore.getState().recordVisualizerUsed();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const containerWidth = canvas.parentElement?.clientWidth || 400;
      const dpr = window.devicePixelRatio || 1;
      
      // Update canvas internal buffer size if changed
      if (canvas.width !== containerWidth * dpr || canvas.height !== height * dpr) {
        canvas.width = containerWidth * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }

      const width = containerWidth;
      const h = height;
      ctx.clearRect(0, 0, width, h);

      if (mode === 'bars') {
        // Equalizer Bars with glow
        const freqData = audioEngine.getFrequencyData();
        const barCount = Math.min(36, Math.max(20, Math.floor(width / 14)));
        const step = Math.max(1, Math.floor(freqData.length / barCount));
        const barWidth = Math.max(3, (width / barCount) * 0.65);
        const spacing = (width - barWidth * barCount) / (barCount + 1);

        for (let i = 0; i < barCount; i++) {
          const val = freqData[i * step] || 0;
          const barHeight = Math.max(4, (val / 255) * h * 0.9);
          const x = i * (barWidth + spacing) + spacing / 2;
          const y = h - barHeight;

          // Gradient color from violet to pink to cyan
          const gradient = ctx.createLinearGradient(0, y, 0, h);
          gradient.addColorStop(0, '#ec4899');
          gradient.addColorStop(0.5, '#8b5cf6');
          gradient.addColorStop(1, '#06b6d4');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
          ctx.fill();

          // Peak cap
          ctx.fillStyle = isPlaying ? '#ffffff' : 'rgba(255,255,255,0.4)';
          ctx.fillRect(x, Math.max(0, y - 2), barWidth, 2);
        }
      } else if (mode === 'waveform') {
        // Waveform Oscilloscope Line
        const waveData = audioEngine.getWaveformData();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#a855f7';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 10;
        ctx.beginPath();

        const sliceWidth = width / waveData.length;
        let x = 0;

        for (let i = 0; i < waveData.length; i++) {
          const v = waveData[i] / 128.0;
          const y = (v * h) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, h / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (mode === 'spectrum') {
        // Frequency Spectrum Smooth Area Curve
        const freqData = audioEngine.getFrequencyData();
        const points = 40;
        const step = Math.floor(freqData.length / points);

        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let i = 0; i <= points; i++) {
          const val = freqData[Math.min(freqData.length - 1, i * step)] || 0;
          const y = h - (val / 255) * h * 0.85;
          const x = (i / points) * width;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, h);
        ctx.closePath();

        const areaGradient = ctx.createLinearGradient(0, 0, 0, h);
        areaGradient.addColorStop(0, 'rgba(236, 72, 153, 0.45)');
        areaGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.25)');
        areaGradient.addColorStop(1, 'rgba(8, 8, 16, 0)');

        ctx.fillStyle = areaGradient;
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f472b6';
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mode, isPlaying, height]);

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        width={400}
        height={height}
        className="w-full h-full block"
      />
    </div>
  );
}
