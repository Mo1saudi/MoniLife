# Project TODO

- [x] Inspect the provided Omni Life Center reference package and capture its key screens, copy, visual system, and interaction patterns.
- [x] Refine the mobile interface design to match the analyzed reference.
- [x] Implement the source-aligned screens, navigation, and core local interactions.
- [x] Apply RTL layout and Arabic localization across the experience.
- [x] Generate and configure the final Omni Life Center app icon and branding assets.
- [x] Run type checks and interaction-focused tests, then correct any issues.
- [x] Review the final checklist before creating the delivery checkpoint.
- [x] Redesign the dashboard around a compact energy header, priority tasks, and one-tap daily habits.
- [x] Add polished home task and habit widgets with quick add, completion, and friction-breaker interactions.
- [x] Configure high-priority Android notification channels and iOS foreground presentation behavior.
- [x] Add permission handling plus instant and scheduled local notification delivery helpers.
- [x] Route notification taps to the related task or habit context, including cold-start handling.
- [x] Validate notification helper behavior and the redesigned core task-and-habit flows.
- [x] Replace the temporary brand mark with the provided OMNI LIFE logo and update the app display name.
- [x] Optimize the OMNI LIFE logo assets below the checkpoint media-size limit without changing the brand identity.
- [x] Restore the development preview after the reported maintenance placeholder screen.
- [x] Guard native notification-response APIs so the web preview cannot invoke unavailable Expo notification methods.
- [x] Elevate the bottom tab bar above phone system controls and safe-area obstruction.
- [x] Add a consistent back action to every secondary OMNI LIFE page.
- [x] Order the bottom tabs from right to left in Arabic mode.
- [x] Add a dedicated Settings tab exposing the app’s administration preferences.
- [x] Restart the stopped development server and verify the preview endpoint responds.
- [x] Restart the development server after the latest preview outage and verify recovery.
- [x] Center the Home tab in the bottom navigation.
- [x] Add the administration panel inside the Settings screen.
- [x] Restrict administration-panel access to mohamedseo2002@gmail.com through authenticated user identity.
- [x] Add a clear authenticated logout action to Settings.
- [x] Create persistent, protected storage for administrative audit-log entries.
- [x] Add full administrator task and habit management controls inside Settings.
- [x] Validate administrator authorization, audit persistence, and logout behavior end to end.
- [x] Apply the newly provided official OMNI LIFE logo to the app icon, splash screen, and welcome flow.
- [x] Add skippable first-launch welcome messages that introduce OMNI LIFE and offer registration or login.
- [x] Add required manual registration fields for name, date of birth, email, and phone, plus an optional secondary contact method.
- [x] Add manual login that securely recognizes a registered profile by its identity details.
- [x] Persist manual profile data with server-side validation and protect personal information access.
- [x] Validate the full onboarding, registration, login, skip, and persisted-profile flows.
- [x] Rename the manual access credential to “كلمة السر” across registration and login screens.
- [x] Add a show/hide password control to the manual login screen.
- [x] Require and validate password confirmation during manual account registration.
- [x] Restart the development server after the reported outage and verify the preview responds.
- [x] Restart the development server after the latest reported outage and verify the preview responds.
- [x] Create secure manual administrator sign-in for mohamedseo2002@gmail.com using the provided password.
- [x] Permit the authenticated manual administrator session to access protected administration actions and audit logging.
- [x] Validate administrator password login and protected panel access.
- [x] Configure Supabase as the secure remote account and profile store.
- [x] Synchronize registered user profile data to Supabase without exposing passwords.
- [x] Add a Telegram-assisted password-reset flow using one-time reset links or codes rather than password retrieval.
- [x] Validate data protection, account recovery, and external integration behavior end to end.
- [x] Add secure Telegram account linking for Supabase-authenticated users.
- [x] Review and approve Row Level Security policies for the pre-existing public Supabase tables before enabling RLS globally.
- [ ] Perform a safe end-to-end Telegram linking test with a designated real OMNI LIFE account.
- [ ] Perform a one-time Telegram password-recovery test and verify the account remains accessible.
- [x] Require verified full name, birth date, and email before issuing a Telegram one-time password-reset code.
- [x] Add clear Arabic instructions explaining Telegram linking, bot commands, and secure password recovery.
- [x] Deliver all Telegram recovery guidance and verification prompts inside the bot conversation rather than in the mobile application.
- [ ] Fix valid YYYY-MM-DD birth dates being rejected in the Telegram recovery conversation.
- [ ] Document the temporary-code recovery journey from Telegram to setting a new password in OMNI LIFE.
- [ ] Show a Reset Password button after Telegram Start and begin identity verification when pressed.
- [ ] Register Start and Reset Password commands so they appear when the user types / in Telegram chat.
- [x] Replace manual scheduling date and time inputs with calendar and clock-style pickers across OMNI LIFE.
- [x] Restore the reported development-server outage and verify the preview responds.
- [x] Add one-time, daily, and weekly recurrence options for habit reminders at the user-selected time.
- [x] Add an administrator campaign center for announcements, promotional notices, usage tips, and app-rating reminders.
- [x] Add audience controls, permission-aware delivery, campaign audit logging, and peak-hour scheduling safeguards for administrator notifications.
- [x] Restrict notification campaign administration to mohamedseo2002@gmail.com.
- [x] Build the selected full remote push campaign workflow with opted-in device-token registration and scheduled delivery.
- [ ] Configure FCM and APNs credentials in Expo, then build and test OMNI LIFE on a physical Android or iOS device for live remote push delivery.
- [x] Add a separate administrator dashboard with user statistics, feature-usage analytics, feedback, subscription requests, and support-link controls.
- [x] Add a user tab for questions and suggestions that routes submissions to the administrator dashboard.
- [x] Add manual Pro and Lifetime subscription requests with sender number, transferred amount, payment-method choice, and receipt-image attachment.
- [x] Send subscription-review details and receipt images to the connected Telegram administrator bot.
- [x] Enable administrator approval or rejection with in-app and push status notifications, including an approved-subscription Telegram message containing the user name.
- [x] Activate Pro subscriptions for 30 days at 150 EGP and Lifetime subscriptions permanently at 3000 EGP after administrator approval.
- [x] Add Free, Pro Monthly (150 EGP), Pro Annual (1200 EGP), and Lifetime (3000 EGP) entitlement constants and manual payment options.
- [x] Build a premium Deep Navy and Teal subscription paywall with clear savings and Lifetime popularity treatment.
- [x] Add a centralized SubscriptionGuard to protect paid screens and allow complimentary `is_comped_free` accounts full Pro-equivalent access.
- [x] Review existing Supabase RLS policies, grants, and table ownership for legacy profile and Telegram recovery tables.
- [x] Enable least-privilege RLS policies for legacy Supabase tables while retaining secure server-role account and Telegram flows.
- [x] Validate RLS enforcement and OMNI LIFE authentication and Telegram recovery compatibility before release.
- [x] Reduce avoidable OMNI LIFE release and startup overhead without weakening security or removing required functionality.
- [x] Inspect OMNI LIFE Expo linkage and notification configuration for FCM and APNs credential prerequisites.
- [ ] Configure Android FCM and iOS APNs credentials through the Expo credential workflow.
- [ ] Build a physical-device OMNI LIFE binary and verify a remote push notification is received successfully.
- [ ] Configure and validate the first live remote-push rollout for Android FCM only; defer iOS APNs until requested.
- [x] Add task title, details, date and time selection, and selectable reminder offsets at due time, 15 minutes, 1 hour, 2 hours, and 24 hours before.
- [x] Enforce the Free plan limit of two selected reminder offsets per task while allowing Pro and Lifetime users all available offsets.
- [x] Add habit title and details with daily, weekly, monthly, and yearly recurrence choices.
- [x] Allow multiple completions or reminders per day for habits on paid tiers while restricting that capability for Free users.
- [x] Add administrator-managed advertising tools for promotional remote notifications and in-app ad placements.
- [x] Repair the relationships contact-import flow with clear permission handling, reliable contact normalization, and useful failure states.
- [x] Replace the displayed manual-payment phone number with user-provided InstaPay and Vodafone Cash payment-link buttons after method selection.
- [x] Display financial transactions and monetary amounts across OMNI LIFE in Egyptian pounds (EGP) rather than dollars.
- [x] Add a confirmed deletion action for habits.
- [x] Add confirmed deletion actions for financial transactions and recurring financial entries.
- [x] Add recurring financial entry creation for installments, savings circles, and subscriptions.
- [x] Enforce a five-recurring-entry limit for Free accounts and unlimited recurring entries for paid or complimentary accounts.
- [x] Separate Ideas and Relationships from Finance into dedicated OMNI LIFE screens with direct navigation.
- [x] Reframe the administrator area as an app-control dashboard separate from ordinary account settings and profile controls.
- [x] Redesign Home as a card dashboard with direct access to tasks, habits, finance, ideas, relationships, advisor, community, alerts, settings, and app control where authorized.
- [x] Keep the Finance tab limited to transactions and recurring financial commitments; expose Ideas and Relationships only through Home cards.
- [x] Show a different date-driven encouragement message on Home each day.
- [x] Add daily mood and energy controls that reorder task recommendations based on the user's selections.
- [x] Add an in-app AI productivity assistant for task prioritization and anti-procrastination guidance.
- [x] Schedule an automatic morning greeting notification with the date-driven daily encouragement message.
- [x] Schedule automatic in-app engagement reminders for tasks, habits, finance, and ideas without requiring administrator action.
- [x] Schedule an automatic end-of-day review notification for tasks, financial activity, and daily reflection.
- [x] Show completed-task count and total recorded daily expenses in the evening review notification.
- [x] Polish Home section cards into a professional, balanced two-card-per-row layout.
- [x] Make the daily encouragement card larger and more visually prominent on Home.
- [x] Expand the administrator app-control dashboard with additional operational management tools.
- [x] Verify a live AI model response through the OMNI LIFE productivity assistant and strengthen its task-prioritization guidance.
- [x] Add Free, Pro Monthly (150 EGP), Pro Annual (1200 EGP), and Lifetime (3000 EGP) entitlement constants and manual payment options.
- [x] Build a premium Deep Navy and Teal subscription paywall with clear savings and Lifetime popularity treatment.
- [x] Add a centralized SubscriptionGuard to protect paid screens and allow complimentary `is_comped_free` accounts full Pro-equivalent access.
- [x] Compact the Home section-card layout so exactly two cards appear in each mobile row.
- [x] Add daily-expense capture as a primary Finance workflow and include it in the daily financial summary.
- [x] Add daily, selected-day monthly, and yearly reminder scheduling for recurring financial commitments.
- [x] Add optional commitment end dates, editable reminder schedules, pause/resume controls, and user-defined early-alert offsets.
- [x] Add quick early-alert choices, expired-commitment renewal controls, and a monthly upcoming-commitment summary.
- [x] Assess and implement a consent-based Android bank-SMS expense parser with local transaction tracking and overspending alerts where platform policy permits.
- [x] Validate the bank-SMS parser against an expanded synthetic Arabic and English corpus, correct extraction defects, and document the measured result.
- [x] Add merchant and payee keyword classification to SMS-extracted transactions, with deterministic Arabic and English coverage.
- [x] Investigate and repair the reported administrator manual-login rejection for the configured account credentials.
- [x] Add manual transaction category correction and a monthly category-based spending report in Finance.
- [x] Add configurable monthly budgets per Finance category with budget-status indicators and local exceedance alerts.
- [x] Add consent-based AI voice quick capture with recording, transcription, intent routing, and immediate save feedback.
- [x] Add weekly analytics, selectable gentle or strict personas, a glass-style report, and a Friday 9 PM report reminder.
- [x] Generate the Friday 9 PM weekly retrospective on the server even while the application is closed, then send a user push notification.
- [x] Add opt-in task location mapping and native geofence reminders with safe background permission handling.
- [x] Add XP, levels, achievement badges, level-up feedback, and dashboard progress tied to core actions.
- [x] Add zero-guilt recovery detection with flexible reset and 50% micro-goal recommendations after missed commitments.
- [x] Add optional If-Then contingency plans to task and habit planning, rescheduling, and reminders.
- [x] Build the distraction-free Tunnel Vision focus mode with one-task progression, completion, and defer-to-tomorrow actions.
- [x] Add an evening brain-dump closure ritual with an adjustable default 11:00 PM reminder and next-day task creation.
- [x] Add post-task energy-impact feedback and weekly recharge-versus-drain insights.
- [x] Add estimated and completed Pomodoro fields, task-card progress badges, focus-session persistence, and 20 XP per completed session.
- [x] Build a multi-session Pomodoro focus flow with short and long breaks, task-completion decision, extension control, and contextual notifications.
- [x] Add consented ambient focus-audio controls that pause automatically during Pomodoro breaks.
- [x] Add section-specific notification channels, sound-preference persistence, and in-settings notification-sound previews.
- [x] Add persisted settings for customized Pomodoro, short-break, and long-break durations, and apply them to all focus cycles.
- [x] Persist authenticated manual user sessions securely so returning users do not need to sign in on every app launch.
- [x] Add an opt-in Do Not Disturb setting that activates only while a focus session is running, with device-specific fallbacks and clear limitation messaging.
- [x] Add task project and tag metadata, tag selection in task planning, and focus-session time tracking grouped by project and tags.
- [x] Add policy-compliant Android exact-alarm, boot-receive, wake-lock, foreground-service, and battery-optimization manifest configuration where justified.
- [x] Add Android native boot and package-replacement restoration for OMNI LIFE’s durable local reminder schedule, without claiming to bypass Doze or force-start the app.
- [x] Add explicit user-consent controls and status messaging for battery-optimization guidance and background reminder reliability.
- [x] Refine the Pomodoro settings interface with clearer presets, live cycle summary, and easier Arabic RTL duration adjustments.
- [x] Inspect logs and build configuration, clear only rebuildable caches, and resolve reproducible OMNI LIFE project errors.
- [x] Cancel the Expo and GitHub automatic-update workflow at the user’s request.
- [x] Add an optional administrator-defined URL to campaign notifications and open it safely when a user taps the notification.
- [x] Track external-link clicks for each notification campaign and display campaign engagement statistics in the administrator dashboard.
- [x] Simplify daily entry flows so tasks, habits, ideas, and expenses can be added quickly while advanced options remain optional.
- [x] Add an administrator dashboard section for recent additions with fast editing actions for tasks, habits, ideas, and expenses.
- [x] Restart the development server and verify the OMNI LIFE preview recovers after the reported outage.
- [x] Add a protected account-reset control that clears the user’s local account data only after explicit confirmation.
- [x] Add a direct per-task action that opens a Pomodoro focus session with the selected task context.
- [x] Restart the development server and confirm recovery after the repeated preview outage.
- [x] Add an optional, privacy-safe user-data export before permanent manual account reset.
- [x] Add deterministic validation for the protected reset flow and task-linked Pomodoro shortcut.
- [x] Restart the development server and confirm recovery after the latest reported preview outage.
- [x] Adapt OMNI LIFE into a responsive Arabic-first website with desktop and mobile browser layouts for the core workflows.
- [x] Diagnose and resolve the Android EAS build failure in the Configure expo-updates phase.
- [x] Add visual and audible user feedback when a Pomodoro focus session completes.
- [x] Provide the user-initiated APK build step after saving the Pomodoro completion-alert update.
- [x] Diagnose and repair the Android APK “App not installed” failure, then validate package and ABI compatibility.

- [x] Prepare and validate a production Android App Bundle (AAB) configuration for Google Play upload.

- [x] Add in-app Privacy Policy, About Us, and How to Use pages with safe Arabic defaults.
- [x] Add administrator-only editing and persistence for the three informational pages.


- [x] Add an Arabic RTL FAQ section for new users with collapsible questions and answers.
- [x] Add persisted FAQ content with administrator-only editing in Settings.
- [x] Validate FAQ rendering, persistence, TypeScript, and regression tests.

- [x] Diagnose the reported Android APK installation failure against package, signing, version, and ABI compatibility.
- [x] Apply and validate the Android configuration repair for a replacement APK build.

- [x] Prepare the OMNI LIFE 1.0.9 APK/AAB release checklist and physical-device notification test steps.
- [x] Validate the 1.0.9 APK and AAB profiles plus Play App Signing prerequisites.
- [x] Hand off the user-run Google Play internal-track upload and Play App Signing actions.

- [x] Enhance the first-launch Arabic RTL onboarding tour for new OMNI LIFE users.
- [x] Persist onboarding completion and validate skip, finish, and productive-entry actions.

- [x] Add a progressive seven-day Arabic RTL home-screen guidance schedule for new users.
- [x] Add dismissible persisted tip cards with direct feature actions and validate the guidance flow.

- [x] Add a Settings control to disable or restart the seven-day interactive home guidance.
- [x] Validate persisted guidance enablement and restart behavior.

- [x] Clearly identify the replacement APK 1.0.9 and prevent confusion with the obsolete 1.0.8 download.
- [x] Validate the APK release profile and provide exact user-run replacement installation steps.

- [x] Analyze the supplied Android bug report for the exact OMNI LIFE APK installation failure.
- [x] Apply and validate the bug-report-driven Android installation repair.

- [x] Run final TypeScript, Android release, and complete regression checks for OMNI LIFE 1.0.9.
- [x] Save a verified stable project checkpoint while awaiting a fresh device installation log.

- [x] Capture a current Android 16 installation log immediately after the OMNI LIFE 1.0.9 APK failure.
- [x] Diagnose and repair the Android 16-specific APK rejection using the current Package Installer result.

- [x] Guide a safe local APK installation path without Google Play by resolving the temporary phone verifier block.
- [x] Confirm the local installation result or capture any remaining verifier evidence before modifying the build.

- [x] Capture the Android 16 OMNI LIFE startup crash evidence after successful local installation.
- [x] Diagnose, repair, and validate the Android runtime startup crash.

- [x] Profile and identify high-impact startup and interaction latency in OMNI LIFE on Android.
- [x] Implement and validate targeted responsiveness improvements without removing user features.

- [x] Add in-app contact selection for saved and device contacts with permission-safe behavior.
- [x] Add confirmed deletion of saved contacts and validate contact-management interactions.

- [x] Ensure administrator campaigns trigger native phone notifications for opted-in devices.
- [x] Show SMS-derived expenses and income clearly in the Finance transaction list and summaries.

- [x] Keep promotional campaigns as phone banners and notification-icon items without in-app promotional screen content.
- [x] Validate promotional category routing and notification-badge behavior.

- [x] Keep promotions out of the home screen and show only the latest three promotional alerts inside the notification inbox.

- [x] Add a per-item deletion control for promotional alerts in the notification inbox.

- [x] Display the received date and time for every promotional alert in the notification inbox.

- [x] Open Finance for Free users and limit them to three daily transactions before upgrade gating applies.

- [x] Configure short 1–3 second native notification sound effects for OMNI LIFE alerts.

- [x] Make the weekly review icon more visually prominent in the top navigation.

- [x] Restart the reported stopped development server and verify service recovery.

- [x] Restart the repeated development-server outage and verify preview recovery.

- [ ] Show a contact detail view with relation type, connection context, and communication frequency when a relationship contact is selected.

- [ ] Let users configure per-contact phone reminders with role, purpose, and communication cadence details.

- [x] Replace Pomodoro ambient music with natural soundscapes and white-noise options.

- [x] Assess the supplied Pomodoro YouTube audio reference for licensed, reliable in-app use.

- [x] Integrate the supplied attributed rain-and-thunder audio file as a Pomodoro sound option.

- [x] Keep only the supplied rain-and-thunder audio as the embedded Pomodoro sound.

- [x] Host the supplied Pomodoro audio remotely to avoid oversized project media files.

- [x] Verify short notification sound effects remain separate from Pomodoro rain audio.

- [x] Replace the current section notification preview tones with distinct short sound effects.

- [x] Replace notification effects with softer, calmer short alerts.

- [x] Add configurable Sleep Mode quiet hours that make notification previews very quiet automatically.

- [x] Change app data reset to preserve the user account and signed-in session.

- [ ] Add customizable per-contact relationship reminders with purpose, cadence, edit, pause/resume, and phone notifications.
- [x] Fix task friction-breaker steps so every step directly references the task title and details.
- [x] Integrate Gemini securely through the server for contextual anti-procrastination, productivity guidance, and notification copy.
- [x] Add AI-authored contextual notifications with the user name for spending, tasks, habits, relationships, stale ideas, and morning/evening summaries.
- [x] Add a visible in-context loading state while Gemini generates task friction-breaker steps.
- [x] Make Finance category budgets a user-controlled expandable and collapsible panel.
- [x] Fix administrator saving of support and FAQ links so updates persist and render in the app.
- [x] Ensure Gemini produces distinct friction-breaker steps tied to each task title and detail instead of repeated generic text.
- [x] Verify Gemini friction-breaker output varies across distinct task titles and details.
- [x] Improve the mobile administrator experience for adding support and FAQ links.
- [x] Add administrator editing and confirmed deletion for published support and FAQ links.
- [x] Make core Arabic RTL screens and admin cards adapt reliably to small phone displays.
- [x] Add a mobile-friendly confirmation dialog before an administrator deletes a published support or FAQ link.
- [x] Help switch or manage the Expo account used for builds after quota exhaustion.
- [x] Start a new Expo trial build under the newly signed-in account and verify the quota error is cleared.
- [x] Create and link a new EAS project under the new Expo account for the preview APK build.
- [x] Remove the current EAS project linkage while keeping the Expo framework, then prepare secure linkage for a new Expo account token.
- [x] Diagnose repeated Expo build-quota exhaustion and select a lawful alternative build path.
- [x] Diagnose repeated Expo build-quota exhaustion and select a lawful alternative build path.
- [ ] Save the current OMNI LIFE updates to the linked GitHub repository and prepare a non-sandbox APK build path.
