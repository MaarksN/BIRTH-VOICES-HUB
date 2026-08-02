// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as socketIoClient from 'socket.io-client';
import { LiveSupervisor } from './LiveSupervisor';

type Handler = (data?: unknown) => void;
type MockSocket = {
  on: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  trigger: (event: string, data?: unknown) => void;
};

// A fresh mock socket is created on every `io(...)` call so each test/render
// gets an isolated instance instead of accumulating handlers across tests.
vi.mock('socket.io-client', () => {
  let lastSocket: MockSocket | null = null;

  const io = vi.fn(() => {
    const handlers = new Map<string, Handler[]>();
    const socket: MockSocket = {
      on: vi.fn((event: string, cb: Handler) => {
        const list = handlers.get(event) ?? [];
        list.push(cb);
        handlers.set(event, list);
      }),
      emit: vi.fn(),
      disconnect: vi.fn(),
      trigger: (event: string, data?: unknown) => {
        (handlers.get(event) ?? []).forEach((cb) => cb(data));
      }
    };
    lastSocket = socket;
    return socket;
  });

  return {
    io,
    __getLastSocket: () => lastSocket
  };
});

function getMockSocket(): MockSocket {
  const mod = socketIoClient as unknown as { __getLastSocket: () => MockSocket };
  const socket = mod.__getLastSocket();
  if (!socket) throw new Error('Mock socket was not created — did the component call io()?');
  return socket;
}

describe('LiveSupervisor', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing in the initial disconnected/empty state', () => {
    render(<LiveSupervisor sessionId="demo-session-123" />);

    expect(screen.getByText('LIVE SUPERVISOR')).toBeInTheDocument();
    expect(screen.getByText('WS OFFLINE')).toBeInTheDocument();
    expect(screen.getByText('Tudo normal. Nenhum alerta crítico.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma objeção registrada nesta sessão.')).toBeInTheDocument();
  });

  it('reflects live telemetry pushed over the socket', () => {
    render(<LiveSupervisor sessionId="demo-session-123" />);
    const socket = getMockSocket();

    act(() => {
      socket.trigger('connect');
      socket.trigger('telemetry_stream', {
        callDuration: 65,
        emotions: { empathy: 40, confidence: 30, frustration: 80 },
        intent: { primary: 'Reclamação sobre cobrança', confidence: 77 },
        objections: ['Preço muito alto'],
        alerts: [{ id: 'a1', level: 'critical', message: 'Cliente irritado detectado', timestamp: Date.now() }]
      });
    });

    expect(screen.getByText('WS CONECTADO')).toBeInTheDocument();
    expect(screen.getByText('01:05')).toBeInTheDocument();
    expect(screen.getByText('Reclamação sobre cobrança')).toBeInTheDocument();
    expect(screen.getByText('Preço muito alto')).toBeInTheDocument();
    expect(screen.getByText('Cliente irritado detectado')).toBeInTheDocument();
  });

  it('emits an intervention and disables further intervention once triggered', async () => {
    const user = userEvent.setup();
    render(<LiveSupervisor sessionId="demo-session-123" />);
    const socket = getMockSocket();

    const interveneButton = screen.getByRole('button', { name: /intervir na chamada/i });
    expect(interveneButton).not.toBeDisabled();

    await user.click(interveneButton);

    expect(socket.emit).toHaveBeenCalledWith('intervene_call', { sessionId: 'demo-session-123' });
    expect(screen.getByRole('button', { name: /intervenção enviada/i })).toBeDisabled();
  });
});
