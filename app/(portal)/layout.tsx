import PortalNav from "@/components/layout/PortalNav";
import Sidebar from "@/components/layout/Sidebar";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { adminDb } from "@/lib/firebase-admin";
import type { Project, User } from "@/types/models";
import QueryProvider from "@/components/providers/QueryProvider";
import ToasterProvider from "@/components/providers/ToasterProvider";
import FirebaseAuthProvider from "@/components/providers/FirebaseAuthProvider";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/signin");

  const userDoc = await adminDb.collection("users").doc(session.uid).get();
  const user = userDoc.data() as User | undefined;

  const membershipsSnap = await adminDb
    .collection("projectMembers")
    .where("userId", "==", session.uid)
    .get();

  const projectIds = membershipsSnap.docs.map((d) => d.data().projectId as string);

  let projects: { id: string; name: string }[] = [];
  if (projectIds.length > 0) {
    const projectDocs = await adminDb.getAll(
      ...projectIds.map((id) => adminDb.collection("projects").doc(id))
    );
    projects = projectDocs
      .filter((d) => d.exists)
      .map((d) => ({ id: d.id, name: (d.data() as Project).name }));
  }

  return (
    /* Outer shell — same dark bg as sidebar so they're seamless */
    <div className="flex h-screen overflow-hidden bg-[#0f0f11]">
      <Sidebar
        role={session.role}
        projects={projects}
        activeProjectId={projects[0]?.id}
        userName={user?.name ?? session.email}
        userAvatar={user?.avatar}
        userAvatarGender={
          user?.avatarGender === "male" ||
          user?.avatarGender === "female" ||
          user?.avatarGender === "neutral"
            ? user.avatarGender
            : undefined
        }
        userId={session.uid}
      />

      {/* Main content panel — rounded top-left creates the "curved seam" */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-tl-[22px] bg-page shadow-[-8px_0_32px_rgba(0,0,0,0.18)]">
        <QueryProvider>
          <FirebaseAuthProvider>
            <ToasterProvider />
            <PortalNav />
            <main className="flex-1 overflow-y-auto">
              <div className="p-6">{children}</div>
            </main>
          </FirebaseAuthProvider>
        </QueryProvider>
      </div>
    </div>
  );
}
