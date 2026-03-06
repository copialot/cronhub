import { useEffect, useRef } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useLocale } from '../../hooks/useLocale';

interface LogViewerProps {
  executionId: number | null;
  staticOutput?: string;
  staticError?: string;
}

export default function LogViewer({ executionId, staticOutput, staticError }: LogViewerProps) {
  const { messages } = useWebSocket(executionId);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useLocale();

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const hasWsMessages = messages.length > 0;

  return (
    <div className="log-viewer" ref={containerRef}>
      {hasWsMessages ? (
        messages.map((msg, i) => (
          <div key={i} className={`log-line ${msg.type}`}>
            {msg.type === 'stderr' ? '> ' : '$ '}{msg.data}
          </div>
        ))
      ) : (
        <>
          {staticOutput && staticOutput.split('\n').filter(Boolean).map((line, i) => (
            <div key={`out-${i}`} className="log-line stdout">$ {line}</div>
          ))}
          {staticError && staticError.split('\n').filter(Boolean).map((line, i) => (
            <div key={`err-${i}`} className="log-line stderr">&gt; {line}</div>
          ))}
          {!staticOutput && !staticError && (
            <div className="log-line" style={{ color: 'var(--text-secondary)' }}>
              {t('logViewer.empty')}
            </div>
          )}
        </>
      )}
    </div>
  );
}
