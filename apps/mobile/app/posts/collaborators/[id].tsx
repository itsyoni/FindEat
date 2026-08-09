import { SkeletonList } from "@/components/common";
import ReviewParticipantsStep from "@/components/review-creator/steps/ReviewParticipantsStep";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import type { ReviewInviteeDraft } from "@findeat/types";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppAlert as Alert } from "@/lib/appAlert";

export default function ManageReviewCollaboratorsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("collaborativeReview");
  const { t: tCommon } = useTranslation("common");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [participants, setParticipants] = useState<ReviewInviteeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [joinedParticipantIds, setJoinedParticipantIds] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void api.posts
      .get(id)
      .then((post) => {
        if (cancelled) return;
        const activeParticipants = (post.reviewParticipants ?? [])
            .filter(
              (participant) =>
                participant.userId !== post.authorId &&
                (participant.status === "INVITED" ||
                  participant.status === "JOINED"),
            )
            .map((participant) => ({
              id: participant.userId,
              displayName: participant.user.username,
              username: participant.user.username,
              avatarUrl: participant.user.avatarUrl,
            }));
        setParticipants(activeParticipants);
        setJoinedParticipantIds(
          (post.reviewParticipants ?? [])
            .filter(
              (participant) =>
                participant.status === "JOINED" &&
                participant.userId !== post.authorId,
            )
            .map((participant) => participant.userId),
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

  async function persist() {
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

  function save() {
    const selectedIds = new Set(participants.map((participant) => participant.id));
    const removedJoinedCount = joinedParticipantIds.filter(
      (participantId) => !selectedIds.has(participantId),
    ).length;
    if (removedJoinedCount === 0) {
      void persist();
      return;
    }
    Alert.alert(
      t("removeCollaboratorTitle"),
      t("removeCollaboratorBody", { count: removedJoinedCount }),
      [
        { text: tCommon("cancel"), style: "cancel" },
        {
          text: t("removeCollaboratorAction"),
          style: "destructive",
          onPress: () => void persist(),
        },
      ],
    );
  }

  if (loading) return <SkeletonList />;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ReviewParticipantsStep
        selected={participants}
        onChange={setParticipants}
        onBack={() => router.back()}
        onDone={save}
        saving={saving}
      />
    </>
  );
}
