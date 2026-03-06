import { Card } from 'antd';
import { useEffect, useRef, useState } from 'react';

interface StatCardProps {
  title: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

export default function StatCard({ title, value, color, icon }: StatCardProps) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const diff = value - start;
    if (diff === 0) return;

    const duration = 600;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    prevValue.current = value;
  }, [value]);

  return (
    <Card className="stat-card" styles={{ body: { padding: '20px 24px' } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>{title}</div>
          <div className="stat-value" style={{ color }}>{display}</div>
        </div>
        <div style={{ fontSize: 24, color, opacity: 0.6 }}>{icon}</div>
      </div>
    </Card>
  );
}
