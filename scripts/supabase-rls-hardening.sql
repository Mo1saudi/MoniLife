-- OMNI LIFE Supabase public-schema hardening
-- The application accesses these tables through its server-side service-role client.
-- Direct anon/authenticated access is intentionally removed.

REVOKE ALL PRIVILEGES ON TABLE
  public.profiles,
  public.tasks,
  public.habits,
  public.habit_completions,
  public.transactions,
  public.budgets,
  public.contacts,
  public.interactions,
  public.library_items,
  public.reminders,
  public.backups,
  public.announcements,
  public.admin_settings,
  public.notification_log,
  public.users,
  public.feature_usage,
  public.support_tickets,
  public.auth_recovery_codes,
  public.telegram_link_codes,
  public.telegram_recovery_sessions
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.tasks,
  public.habits,
  public.habit_completions,
  public.transactions,
  public.budgets,
  public.contacts,
  public.interactions,
  public.library_items,
  public.reminders,
  public.backups,
  public.announcements,
  public.admin_settings,
  public.notification_log,
  public.users,
  public.feature_usage,
  public.support_tickets,
  public.auth_recovery_codes,
  public.telegram_link_codes,
  public.telegram_recovery_sessions
TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_recovery_sessions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  legacy_table text;
BEGIN
  FOREACH legacy_table IN ARRAY ARRAY[
    'profiles', 'tasks', 'habits', 'habit_completions', 'transactions',
    'budgets', 'contacts', 'interactions', 'library_items', 'reminders',
    'backups', 'announcements', 'admin_settings', 'notification_log',
    'users', 'feature_usage', 'support_tickets'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS omni_server_only ON public.%I', legacy_table);
    EXECUTE format(
      'CREATE POLICY omni_server_only ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      legacy_table
    );
  END LOOP;
END $$;

ALTER FUNCTION public.find_or_create_profile(text, text)
  SET search_path = pg_catalog, public;
REVOKE ALL ON FUNCTION public.find_or_create_profile(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_create_profile(text, text) TO service_role;

ALTER FUNCTION public.rls_auto_enable()
  SET search_path = pg_catalog;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
