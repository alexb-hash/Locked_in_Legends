import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/seed-admin")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const email = "adminns@studly.app";
        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: "LILANF123",
          email_confirm: true,
          user_metadata: { username: "adminns", display_name: "Studly Admin" },
        });

        let userId = created?.user?.id;
        if (error && !userId) {
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          userId = list?.users.find((u) => u.email === email)?.id;
        }
        if (!userId) return new Response(JSON.stringify({ ok: false, error: error?.message }), { status: 500 });

        await supabaseAdmin
          .from("profiles")
          .upsert(
            { id: userId, username: "adminns", display_name: "Studly Admin", hidden_from_rankings: true },
            { onConflict: "id" },
          );
        await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

        return new Response(JSON.stringify({ ok: true, userId }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
