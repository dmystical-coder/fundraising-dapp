"use client";

import { useEffect, useRef } from "react";
import { saveCampaignMetadata, useIndexerCampaigns } from "@/hooks/indexerQueries";
import { useAddress } from "@/components/ConnectWallet";

interface PendingMetadata {
  owner: string;
  title: string;
  description: string;
  createdAt: number;
}

/**
 * Hook that syncs pending campaign metadata from localStorage to the indexer.
 * When a new campaign appears for the same owner, it saves the metadata.
 */
export function useSyncPendingMetadata() {
  const address = useAddress();
  const { data: campaigns } = useIndexerCampaigns();
  const processedCampaigns = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!address || !campaigns || campaigns.length === 0) return;

    const localStorageKey = `pending_campaign_metadata_${address}`;
    const pendingJson = localStorage.getItem(localStorageKey);
    if (!pendingJson) return;

    try {
      const pending: PendingMetadata = JSON.parse(pendingJson);
      
      // Check if metadata is recent (within last 24 hours)
      const isRecent = Date.now() - pending.createdAt < 24 * 60 * 60 * 1000;
      if (!isRecent) {
        localStorage.removeItem(localStorageKey);
        return;
      }

      // Find the most recent campaign by this owner that doesn't have metadata
      const ownerCampaigns = campaigns.filter(
        (c) => c.owner?.toLowerCase() === address.toLowerCase()
      );

      for (const campaign of ownerCampaigns) {
        // Skip if already processed
        if (processedCampaigns.current.has(campaign.campaign_id)) continue;
        
        // Skip if campaign already has title
        if (campaign.title) {
          processedCampaigns.current.add(campaign.campaign_id);
          continue;
        }

        // Only apply if the campaign was created AFTER the pending metadata (or within a small window)
        // Allow 5 minutes margin for clock skew
        const campaignCreatedAt = new Date(campaign.created_at).getTime();
        if (campaignCreatedAt < pending.createdAt - 5 * 60 * 1000) {
           console.log(`Skipping old campaign ${campaign.campaign_id} for pending metadata`);
           continue; 
        }

        // Found a campaign without metadata - save it
        saveCampaignMetadata({
          campaignId: campaign.campaign_id,
          owner: address,
          title: pending.title,
          description: pending.description,
        })
          .then(() => {
            console.log(`Saved metadata for campaign ${campaign.campaign_id}`);
            localStorage.removeItem(localStorageKey);
            processedCampaigns.current.add(campaign.campaign_id);
          })
          .catch((err) => {
            console.error("Failed to save campaign metadata:", err);
          });

        // Only process one campaign at a time
        break;
      }
    } catch (err) {
      console.error("Error processing pending metadata:", err);
      localStorage.removeItem(localStorageKey);
    }
  }, [address, campaigns]);
}
