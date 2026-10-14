import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import {
  IconCheck,
  IconInfo,
  IconLock,
  IconShield,
  IconSparkle,
  IconUsers,
  IconWand,
} from "@/components/icons";
import { VAULT } from "@/constants/vault";
import { runVaultDiagnostics } from "@/services/vault/diagnostics";
import type { DiagnosticCheck } from "@/types/vault";
import { colors, fonts, space, type } from "@/theme/tokens";

/**
 * Setup check + the plain-language security story.
 *
 * The sandbox this app was built in can't reach Appwrite, so this screen exists
 * to let you verify the backend yourself in one tap — and to state exactly what
 * is protected and what is not.
 */

const statusTone = (status: DiagnosticCheck["status"]) =>
  status === "ok"
    ? ("success" as const)
    : status === "missing"
      ? ("danger" as const)
      : status === "warning"
        ? ("warning" as const)
        : ("danger" as const);

const statusLabel = (status: DiagnosticCheck["status"]) =>
  status === "ok"
    ? "Ready"
    : status === "missing"
      ? "Missing"
      : status === "warning"
        ? "Check permissions"
        : "Error";

export default function VaultSetupScreen() {
  const [checks, setChecks] = useState<DiagnosticCheck[] | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      setChecks(await runVaultDiagnostics());
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  const allReady = checks?.every((check) => check.status === "ok") ?? false;

  return (
    <Screen title="Setup check" subtitle="Document Manager">
      <View style={styles.stack}>
        {checks === null || running ? (
          <GlassCard>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={type.body}>Checking your Appwrite project…</Text>
            </View>
          </GlassCard>
        ) : (
          <GlassCard emphasis={allReady}>
            <View style={styles.headline}>
              <Text style={type.overline}>Backend</Text>
              <Chip
                label={allReady ? "All set" : "Needs attention"}
                tone={allReady ? "success" : "warning"}
              />
            </View>
            <View style={styles.checkList}>
              {checks.map((check) => (
                <View key={check.id} style={styles.checkRow}>
                  <View style={styles.checkText}>
                    <Text style={type.bodyStrong}>{check.label}</Text>
                    <Text style={type.caption} numberOfLines={3}>
                      {check.detail}
                    </Text>
                    {check.fix && check.status !== "ok" ? (
                      <Text style={[type.caption, styles.fixText]}>{check.fix}</Text>
                    ) : null}
                  </View>
                  <Chip label={statusLabel(check.status)} tone={statusTone(check.status)} />
                </View>
              ))}
            </View>
            <Button
              text="Re-run checks"
              variant="subtle"
              onPress={run}
              style={styles.rerun}
            />
          </GlassCard>
        )}

        {!allReady && checks !== null ? (
          <GlassCard>
            <Text style={type.bodyStrong}>One-time setup</Text>
            <View style={styles.steps}>
              <Text style={type.caption}>
                1. Create the bucket, database and tables:
              </Text>
              <Text style={styles.code}>
                APPWRITE_API_KEY=… node scripts/setup-appwrite.mjs
              </Text>
              <Text style={type.caption}>
                2. Deploy the join service (needed for invite codes):
              </Text>
              <Text style={styles.code}>
                cd functions/join-group &amp;&amp; npm install &amp;&amp; appwrite push function
              </Text>
              <Text style={type.caption}>
                3. Give that function an API key (Teams read/write, rows read) in
                the console, then re-run these checks.
              </Text>
            </View>
          </GlassCard>
        ) : null}

        {/* ── What is protected ───────────────────────────────────── */}
        <GlassCard>
          <Text style={type.overline}>Security model</Text>
          <View style={styles.points}>
            <Point
              icon={<IconLock size={18} color={colors.accent} />}
              title="Files are gated by team membership"
              body="Every uploaded file is stored with read access granted to its group's Appwrite team. Listing, downloading and deleting are all checked on the server, so a non-member gets a 401 — not a hidden button."
            />
            <Point
              icon={<IconUsers size={18} color={colors.accent} />}
              title="The invite code is a doorbell, not a key"
              body="It is salted-hashed at creation and verified server-side; the plain text is shown once and never stored. Holding a code lets somebody ask to join. It never grants read access on its own, and the owner can rotate it or remove them."
            />
            <Point
              icon={<IconShield size={18} color={colors.accent} />}
              title="Uploads are constrained"
              body={`Only document, spreadsheet, presentation, PDF and image types are accepted, up to ${Math.round(
                (25 * 1024 * 1024) / (1024 * 1024),
              )} MB each. Executables and scripts are rejected, which keeps the vault from becoming a malware drop box.`}
            />
            <Point
              icon={<IconSparkle size={18} color={colors.accent} />}
              title="Editing stays on your device"
              body="Photo and PDF edits are computed locally. Nothing is uploaded for editing, and no third-party service ever sees your files."
            />
            <Point
              icon={<IconWand size={18} color={colors.accent} />}
              title="Filenames are sanitised"
              body="Path separators, control characters and leading dots are stripped, so a crafted filename can't traverse directories or masquerade as another file type."
            />
          </View>
        </GlassCard>

        {/* ── The honest limits ───────────────────────────────────── */}
        <GlassCard>
          <Text style={type.overline}>What this is not</Text>
          <View style={styles.points}>
            <Point
              icon={<IconInfo size={18} color={colors.textDim} />}
              title="Not end-to-end encrypted"
              body="Files are encrypted in transit and at rest by Appwrite, and your project's administrators can technically access them. If you need a vault where even the server operator cannot read the contents, that requires encrypting on the device before upload — a different design."
            />
            <Point
              icon={<IconInfo size={18} color={colors.textDim} />}
              title="Group members can delete group files"
              body="Any member can upload, edit and remove files. That suits a family or a small trusted team. Per-uploader-only deletion would need a stricter permission set on each file."
            />
            <Point
              icon={<IconInfo size={18} color={colors.textDim} />}
              title="A leaked code means an unwanted member"
              body="Rotate the code from the group screen and remove the member. Both take effect immediately."
            />
          </View>
        </GlassCard>

        {/* ── Legal / responsible use ─────────────────────────────── */}
        <GlassCard>
          <Text style={type.overline}>Responsible use</Text>
          <View style={styles.points}>
            <Text style={type.caption}>
              • Upload only what you have the right to store. A shared family
              folder does not give you the right to distribute someone else&apos;s
              documents, and copyright still applies.
            </Text>
            <Text style={type.caption}>
              • Keep the invite code inside the group. If a group holds anything
              sensitive (IDs, medical records, financial documents), remove people
              the moment they should lose access.
            </Text>
            <Text style={type.caption}>
              • The vault stores your files; it does not scan them. Nothing here
              checks whether content is lawful in your jurisdiction — that
              responsibility stays with you.
            </Text>
            <Text style={type.caption}>
              • Every member is identified by their own account, so an action can
              be traced to the account that performed it. Don&apos;t share logins.
            </Text>
          </View>
        </GlassCard>

        <GlassCard>
          <Text style={type.overline}>Where things live</Text>
          <View style={styles.steps}>
            <Text style={type.caption}>
              Database <Text style={styles.code}>{VAULT.databaseId}</Text> · tables{" "}
              <Text style={styles.code}>{VAULT.groupsTableId}</Text>,{" "}
              <Text style={styles.code}>{VAULT.filesTableId}</Text>
            </Text>
            <Text style={type.caption}>
              Bucket <Text style={styles.code}>{VAULT.bucketId}</Text> · function{" "}
              <Text style={styles.code}>{VAULT.joinFunctionId}</Text>
            </Text>
          </View>
        </GlassCard>
      </View>
    </Screen>
  );
}

function Point({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.point}>
      {icon}
      <View style={styles.pointText}>
        <Text style={type.bodyStrong}>{title}</Text>
        <Text style={type.caption}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  headline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  checkList: {
    marginTop: space.lg,
    gap: space.lg,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  checkText: { flex: 1, gap: 2 },
  fixText: {
    color: colors.warning,
    marginTop: 2,
  },
  rerun: { marginTop: space.lg },
  steps: { gap: space.sm, marginTop: space.md },
  code: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
    color: colors.primaryBright,
  },
  points: { gap: space.lg, marginTop: space.md },
  point: {
    flexDirection: "row",
    gap: space.md,
    alignItems: "flex-start",
  },
  pointText: { flex: 1, gap: 2 },
});
