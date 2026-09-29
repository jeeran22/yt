"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

function isTerminalCampaign(s: string) {
  return s === "completed" || s === "failed";
}
function isTerminalVideo(d: any) {
  return d?.complete === true || d?.completed === true || d?.status === "completed" || d?.status === "failed" || Boolean(d?.videoUrl);
}

/** Poll GET /campaigns/jobs/:id every 2.5s with delta backoff (2.5s -> 5s max). */
export function useCampaignJob(jobId: string | null) {
  return useQuery({
    queryKey: ["campaign-job", jobId],
    queryFn: () => api.getCampaignJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const d = query.state.data as any;
      if (!d) return 2500;
      if (isTerminalCampaign(String(d.status))) return false;
      const n = (query.state.dataUpdateCount || 0);
      return Math.min(2500 * Math.pow(1.25, n), 5000);
    },
    refetchIntervalInBackground: true,
    retry: 2,
  });
}

/** Poll GET /generate-video/result/:id every 2.5s with delta backoff. */
export function useVideoResult(genId: string | null) {
  return useQuery({
    queryKey: ["video-result", genId],
    queryFn: () => api.getVideoResult(genId!),
    enabled: !!genId,
    refetchInterval: (query) => {
      const d = query.state.data as any;
      if (!d) return 2500;
      if (isTerminalVideo(d)) return false;
      const n = (query.state.dataUpdateCount || 0);
      return Math.min(2500 * Math.pow(1.25, n), 5000);
    },
    refetchIntervalInBackground: true,
    retry: 2,
  });
}
