import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { DownloadIcon, Share2Icon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sortTeamPlayers } from "@/features/games/buildTeams";
import {
  canSharePosterFile,
  drawWinningTeamPoster,
  getPosterFileName,
} from "@/features/games/winningTeamPoster";
import { useUserMap } from "@/features/players/player.hooks";
import {
  formatGameDate,
  getGameDisplayTitle,
  getGameScore,
  getPlayerGoalCounts,
  getResultWinner,
  getTeamName,
  type Game,
  type GameParticipant,
  type GameTeamId,
} from "@/types/game";

type WinningTeamPosterDialogProps = {
  open: boolean;
  game: Game;
  participants: GameParticipant[];
  onClose: () => void;
};

export function WinningTeamPosterDialog({
  open,
  game,
  participants,
  onClose,
}: WinningTeamPosterDialogProps) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const score = getGameScore(game);
  const winner = game.result?.winner ?? getResultWinner(score.a, score.b);
  const winnerId: GameTeamId | null = winner === "a" || winner === "b" ? winner : null;
  const teamName = winnerId ? getTeamName(game, winnerId) : "";
  const fileName = getPosterFileName(teamName || "team");
  const shareText = `${teamName} won ${score.a}–${score.b}`;
  const usersById = useUserMap();
  const title = getGameDisplayTitle(game);
  const dateLabel = formatGameDate(game);
  const goalsByPlayer = new Map(
    getPlayerGoalCounts(game.result?.goals ?? []).map((tally) => [
      tally.scorerId,
      tally.count,
    ]),
  );
  const players = winnerId
    ? sortTeamPlayers(
        participants.filter((participant) => participant.teamId === winnerId),
      ).map((participant) => ({
        displayName: participant.displayName,
        photoURL:
          usersById.get(participant.userId)?.photoURL?.trim() ||
          participant.photoURL?.trim() ||
          undefined,
        goals: goalsByPlayer.get(participant.userId) ?? 0,
      }))
    : [];
  const playerKey = players
    .map((player) => `${player.displayName}:${player.photoURL ?? ""}:${player.goals}`)
    .join("|");
  const canShare = useMemo(() => (file ? canSharePosterFile(file) : false), [file]);

  useEffect(() => {
    if (!open || !winnerId) {
      return;
    }

    let cancelled = false;
    let objectUrl = "";
    setLoading(true);
    setFile(null);
    setPreviewUrl("");

    void drawWinningTeamPoster({
      title,
      dateLabel,
      teamName,
      scoreA: score.a,
      scoreB: score.b,
      winnerId,
      players,
    })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);

        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setPreviewUrl(objectUrl);
        setFile(new File([blob], fileName, { type: "image/png" }));
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not create the result image.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, winnerId, teamName, score.a, score.b, fileName, title, dateLabel, playerKey]);

  if (!open) {
    return null;
  }

  const handleDownload = () => {
    if (!previewUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = fileName;
    link.click();
  };

  const handleShare = async () => {
    if (!file || !canShare) {
      return;
    }

    try {
      await navigator.share({
        files: [file],
        title: shareText,
        text: `${shareText} · ${title}`,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      toast.error("Could not share this image.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="winning-team-poster-title"
        className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="winning-team-poster-title" className="text-lg font-semibold">
              Share result
            </h2>
            <p className="text-sm text-muted-foreground">{shareText}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border bg-muted">
          {loading || !previewUrl ? (
            <div className="flex aspect-square items-center justify-center text-sm text-muted-foreground">
              Creating image...
            </div>
          ) : (
            <img
              src={previewUrl}
              alt={`${teamName} won ${score.a}–${score.b}`}
              className="aspect-square w-full object-cover"
            />
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!previewUrl}
            onClick={handleDownload}
          >
            <DownloadIcon />
            Download
          </Button>
          {canShare ? (
            <Button type="button" disabled={!file} onClick={() => void handleShare()}>
              <Share2Icon />
              Share
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
