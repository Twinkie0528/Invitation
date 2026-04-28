import { notFound } from "next/navigation";
import InvitationLayout from "@/components/InvitationLayout";
import { GuestProvider } from "@/lib/guestContext";
import { guests } from "@/data/guests";

export const dynamicParams = false;

export function generateStaticParams() {
  return guests.map((g) => ({ slug: g.slug }));
}

export default function GuestPage({ params }: { params: { slug: string } }) {
  const guest = guests.find((g) => g.slug === params.slug);
  if (!guest) notFound();

  return (
    <GuestProvider name={guest.name} date={guest.date}>
      <InvitationLayout />
    </GuestProvider>
  );
}
