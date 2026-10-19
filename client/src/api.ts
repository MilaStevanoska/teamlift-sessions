const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export type Slot = {
  id: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  isBooked: boolean;
};

export type HostSlot = Slot & {
  booking: {
    name: string;
    email: string;
    focus: string;
    note: string | null;
    bookedAt: string;
  } | null;
};

export type Options = { durations: number[]; focusAreas: string[] };

export type NewBooking = {
  slotId: string;
  name: string;
  email: string;
  focus: string;
  note?: string;
};

export type Booking = {
  id: string;
  name: string;
  focus: string;
  startsAt: string;
  durationMinutes: number;
};

export type Confirmation = { message: string; source: 'ai' | 'saved' | 'fallback' };

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection and try again.', 0);
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // Nest returns { message: string | string[] } for errors.
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    throw new ApiError(message ?? 'Something went wrong.', res.status);
  }
  return body as T;
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const api = {
  options: () => request<Options>('/options'),
  slots: () => request<Slot[]>('/slots'),
  hostSlots: () => request<HostSlot[]>('/slots?view=host'),
  createSlots: (input: { startsAt: string; durationMinutes: number; count: number }) =>
    request<Slot[]>('/slots', post(input)),
  deleteSlot: (id: string) => request<void>(`/slots/${id}`, { method: 'DELETE' }),
  book: (input: NewBooking) => request<Booking>('/bookings', post(input)),
  confirmation: (bookingId: string) =>
    request<Confirmation>(
      `/bookings/${bookingId}/confirmation`,
      post({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    ),
};
