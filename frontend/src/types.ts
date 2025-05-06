import { LucideIcon } from "lucide-react";

// Basic Sui type definitions
export type SuiID = string;
export type SuiAddress = string;

// Proposal related types
export interface Proposal {
  id: SuiID;
  title: string;
  description: string;
  status: {
    variant: string;
  };
  votedYesCount: number;
  votedNoCount: number;
  expiration: number;
  creator: SuiAddress;
  voter_registry: string[];
  isPrivate: boolean; // Flag for private proposals
}

// Ballot and voting related types
export interface Candidate {
  id: number;
  name: string;
  description: string;
  votes: number;
  imageUrl?: string;
}

export interface BallotData {
  id: string;
  title: string;
  description: string;
  expiration: number;
  candidates: Candidate[];
  status: string;
  creator: string;
  totalVotes?: number;
}

export interface Vote {
  ballotId: string;
  candidateId: number;
  timestamp: number;
  voter: string;
}

// Component Props
export interface CTAProps {
  icon: LucideIcon;
  label: string;
  description: string;
  primary?: boolean;
  delay?: number;
}

export interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay: number;
}

export interface SecurityCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay: number;
}

export interface FooterLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface SocialLinkProps {
  href: string;
  icon: LucideIcon;
}

// API Response types
export interface TransactionResponse {
  digest: string;
  status: string;
}

export interface StatisticsData {
  totalProposals: number;
  totalVotes: number;
  activeProposals: number;
  completedProposals: number;
  participationRate: number;
}

// Dashboard related types
export interface SystemHealthInfo {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastUpdated: number;
  activeProposals: number;
  totalVotes: number;
  averageVoteTime: number;
}

export interface VoteNft {
  id: SuiID;
  proposalId: string;
  url: string;
};