export type Vet = { id: number; name: string; clinicName?: string; description?: string; imageUrl?: string; city?: string; specialties?: string[]; averageRating?: number | null; reviewsCount?: number; owner?: { id: number; isProfessionalVerified?: boolean } };
export type Slot = { id: number; startsAt: string; endsAt: string };
export type Appointment = { id: number; veterinarianName: string; startsAt: string; endsAt: string; reason: string; status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed'; canManage: boolean; canCancel: boolean; canReview: boolean };
export type Message = { id: number; body: string; createdAt?: string; isOwn?: boolean; sender?: { id?: number; name: string; avatar?: string } };
export type Conversation = { id: number; participant: { id?: number; name: string; avatar?: string }; messages?: Message[]; unreadCount?: number; latestMessage?: Message; updatedAt?: string };
export type Service = { id: number; title: string; city?: string; description?: string };
export type Collection<T> = { data: T[]; meta?: { current_page?: number; last_page?: number } };
