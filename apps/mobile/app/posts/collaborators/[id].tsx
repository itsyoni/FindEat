import { SkeletonList } from "@/components/common";
import ReviewParticipantsStep from "@/components/review-creator/steps/ReviewParticipantsStep";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import type { ReviewInviteeDraft } from "@findeat/types";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function ManageReviewCollaboratorsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("collaborativeReview");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [participants, setParticipants] = useState<ReviewInviteeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void api.posts
      .get(id)
      .then((post) => {
        if (cancelled) return;
        setParticipants(
          (post.reviewParticipants ?? [])
            .filter(
              (participant) =>
                participant.userId !== post.authorId &&
                participant.status !== "DECLINED",
            )
            .map((participant) => ({
              id: participant.userId,
              displayName:
                participant.user.displayName || participant.user.username,
              username: participant.user.username,
              avatarUrl: participant.user.avatarUrl,
              locked: participant.status === "JOINED",
            })),
        );
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Could not load review collaborators", error);
        showToast(t("loadError"), { kind: "error" });
        router.back();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, showToast, t]);

  async function save() {
    if (!id || saving) return;
    try {
      setSaving(true);
      await api.posts.updateReviewParticipants(
        id,
        participants.map((participant) => participant.id),
      );
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      showToast(t("peopleUpdated"));
      router.back();
    } catch (error) {
      console.error("Could not update review collaborators", error);
      showToast(t("peopleUpdateError"), { kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <SkeletonList />;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ReviewParticipantsStep
        selected={participants}
        onChange={setParticipants}
        onBack={() => router.back()}
        onDone={() => void save()}
        saving={saving}
      />
    </>
  );
}
