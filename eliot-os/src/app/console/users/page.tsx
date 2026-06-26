import { prisma } from "@/lib/prisma";
import { setUserActive } from "../actions";

export const dynamic = "force-dynamic";

export default async function ConsoleUsers() {
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });

  return (
    <div>
      <p className="numeral mb-2 text-night-mut">Access</p>
      <h1 className="text-2xl text-night-paper">People and access</h1>
      <p className="mt-2 max-w-2xl text-sm text-night-mut">
        Identity is per person via magic link. Deactivating someone revokes their
        access immediately. Roles and scope decide which front door they reach.
      </p>

      <div className="mt-8 overflow-x-auto border border-night-rule">
        <table className="w-full text-left text-sm">
          <thead className="bg-night-raised text-night-mut">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Scope</th>
              <th className="px-4 py-3 font-medium">State</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-night-rule">
                <td className="px-4 py-3 text-night-paper">{u.name}</td>
                <td className="px-4 py-3 text-night-mut">{u.email}</td>
                <td className="px-4 py-3 text-night-mut">{u.role}</td>
                <td className="px-4 py-3 text-night-mut">
                  {u.experience}
                  {u.familyId ? ` ${u.familyId}` : ""}
                </td>
                <td className="px-4 py-3">
                  <span className={u.active ? "chip-go" : "chip-stop"}>
                    {u.active ? "active" : "revoked"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <form action={setUserActive}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="active" value={(!u.active).toString()} />
                    <button className="text-sm text-accent underline">
                      {u.active ? "Revoke" : "Restore"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
